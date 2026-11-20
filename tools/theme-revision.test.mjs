import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createPools, createSession, levelNames, normalise } from '../src/assets/js/theme-revision-session.js';

const require = createRequire(import.meta.url);
const data = require('../src/a-christmas-carol/a-christmas-carol.11tydata.js')();
const banks = Object.fromEntries(Object.entries(data.themeRevisionBanks).map(([theme, json]) => [theme, JSON.parse(json)]));
const kinds = ['quote-gap', 'quote-order', 'plot', 'context', 'analysis', 'corrections', 'vocabulary', 'jigsaw'];
const seeded = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

for (const [theme, bank] of Object.entries(banks)) {
  for (const level of [1, 2, 3]) {
    test(theme + ' level ' + level + ' offers every format with the agreed theme and level filters', () => {
      const pools = createPools(bank, level);
      assert.deepEqual(Object.keys(pools), kinds);
      for (const [kind, items] of Object.entries(pools)) {
        assert.ok(items.length, kind);
        if (kind === 'vocabulary') assert.ok(items.every(item => item.level === level));
        else assert.ok(items.every(item => item.themes.includes(theme)), kind);
        if (kind === 'quote-gap' || kind === 'quote-order') assert.ok(items.every(item => item.pool <= [10, 25, 50][level - 1]));
        if (['analysis', 'corrections', 'jigsaw'].includes(kind)) assert.ok(items.every(item => item.level === levelNames[level - 1]));
      }
      assert.deepEqual(pools.plot, createPools(bank, 1).plot);
      assert.deepEqual(pools.context, createPools(bank, 1).context);
      const session = createSession(bank, level, seeded(100 + level));
      const seen = new Map();
      let previous;
      for (let rotation = 0; rotation < 4; rotation++) {
        const formats = [];
        for (let index = 0; index < kinds.length; index++) {
          const round = session.next();
          assert.notEqual(round.kind, previous, 'A format must not repeat at the rotation boundary');
          previous = round.kind;
          formats.push(round.kind);
          const items = seen.get(round.kind) || new Set();
          if (items.size === pools[round.kind].length) items.clear();
          assert.ok(!items.has(round.item), 'No repeated exercises before a format deck is exhausted');
          items.add(round.item); seen.set(round.kind, items);
          if (round.choices) {
            assert.equal(round.choices.length, 4);
            assert.equal(new Set(round.choices).size, 4);
            assert.ok(round.choices.includes(round.answer));
          }
        }
        assert.deepEqual(formats.sort(), [...kinds].sort());
      }
    });
  }
}

test('quote pools are cumulative and become larger at the next ghost', () => {
  for (const bank of Object.values(banks)) {
    const pools = [1, 2, 3].map(level => createPools(bank, level)['quote-gap']);
    assert.ok(pools[0].length < pools[1].length && pools[1].length < pools[2].length);
    assert.ok(pools[0].every(item => pools[1].includes(item)));
    assert.ok(pools[1].every(item => pools[2].includes(item)));
  }
});

test('a repeated quotation uses another missing word where one is available', () => {
  const original = banks.change;
  const quote = original.quotes.find(item => item.blanks.length > 1);
  const bank = { ...original, quotes: [quote], plot: [], context: [], analysis: [], corrections: [], vocabulary: [], jigsaw: [] };
  const session = createSession(bank, 3, seeded(42));
  let previous;
  for (let index = 0; index < 20; index++) {
    const round = session.next();
    if (round.kind !== 'quote-gap') continue;
    assert.notEqual(round.answer, previous);
    previous = round.answer;
  }
});

test('unknown levels and empty matching banks fail clearly', () => {
  assert.throws(() => createSession(banks.change, 0), /ghost level/);
  const empty = { ...banks.change, theme: 'unknown', vocabulary: [] };
  assert.throws(() => createSession(empty, 1), /no exercises/);
});

test('quotation tiles and gaps retain the original quotation content', () => {
  for (const bank of Object.values(banks)) {
    for (const quote of bank.quotes) {
      if (quote.tiles.length) assert.equal(quote.tiles.join(' '), quote.quote.replace(/\s+/g, ' '));
      else assert.equal(quote.quote.split(/\s+/).length, 1, 'Single-word quotations have no ordering exercise');
      for (const blank of quote.blanks) {
        assert.equal(blank.masked.replace('_____', blank.answer), quote.quote);
      }
    }
  }
});

test('Past uses existing short vocabulary examples and keeps every word at its assigned level', () => {
  const source = banks.change;
  const bank = { ...source, quotes: [], plot: [], context: [], analysis: [], corrections: [], jigsaw: [] };
  for (const level of [1, 2, 3]) {
    const pool = source.vocabulary.filter(item => item.level === level);
    const session = createSession(bank, level, seeded(level));
    const seen = new Set();
    for (let index = 0; index < pool.length; index++) {
      const round = session.next();
      const example = level === 1 && round.item.fogEasy ? round.item.fogEasy : round.item;
      assert.equal(round.kind, 'vocabulary');
      assert.equal(round.item.level, level);
      assert.equal(round.completedPrompt, example.example);
      assert.equal(normalise(round.prompt.replace('_____', round.answer)), normalise(example.example));
      assert.ok(!seen.has(round.item.word));
      seen.add(round.item.word);
      if (round.item.word === 'eerie') {
        assert.equal(level, 1);
        assert.ok(round.completedPrompt.length < round.item.example.length);
      }
    }
  }
});
