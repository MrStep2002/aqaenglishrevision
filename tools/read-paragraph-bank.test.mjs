import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const loader = fileURLToPath(new URL('./read-paragraph-bank.js', import.meta.url));
const source = readFileSync(loader, 'utf8');
const realRequire = createRequire(loader);
function readFixture(csv) {
  const module = { exports: {} };
  const fn = vm.runInNewContext(`(function(require,module,__dirname){\n${source}\n})`);
  fn(name => name === 'node:fs' ? { readFileSync: () => csv } : realRequire(name), module, path.dirname(loader));
  return JSON.parse(module.exports('fixture.csv'));
}

test('preserves each recognised level for filtering', () => {
  const puzzles = readFixture('level,question,sentence1,sentence2\nFoundation,First?,Point.,Evidence.\nIntermediate,Second?,Claim.,Interpretation.\nAdvanced,Third?,Argument.,Qualification.\n');
  assert.deepEqual(puzzles.map(puzzle => puzzle.level), ['Foundation', 'Intermediate', 'Advanced']);
  assert.equal(puzzles[1].question, 'Second?');
});

test('a bank can contain just one of the three levels', () => {
  const puzzles = readFixture('question,level,sentence1,sentence2\nWhy?,Advanced,First.,Second.\n');
  assert.equal(puzzles.length, 1);
  assert.equal(puzzles[0].level, 'Advanced');
});

test('retains the original format for banks without levels', () => {
  const puzzles = readFixture('question,sentence1,sentence2,hint1,explanation\nWhy?,First.,Second.,Begin here.,A model.\n');
  assert.deepEqual(puzzles, [{ question: 'Why?', sentences: ['First.', 'Second.'], hints: ['Begin here.', ''], explanation: 'A model.' }]);
});

test('rejects a blank level in a levelled bank and names its row', () => {
  assert.throws(() => readFixture('level,question,sentence1,sentence2\nFoundation,One?,First.,Second.\n,Two?,Third.,Fourth.\n'), /Row 3.*Foundation, Intermediate or Advanced/);
});

test('rejects an unknown level instead of silently excluding its paragraph', () => {
  assert.throws(() => readFixture('level,question,sentence1,sentence2\nHigher,Why?,First.,Second.\n'), /Row 2.*Foundation, Intermediate or Advanced/);
});

test('reads numbered pieces in order including a seventh piece', () => {
  const puzzles = readFixture('question,level,sentence7,sentence2,sentence1\nWhy?,Intermediate,Last.,Middle.,First.\n');
  assert.deepEqual(puzzles[0].sentences, ['First.', 'Middle.', 'Last.']);
});

test('keeps grouped sentences and quotations together as one piece', () => {
  const puzzles = readFixture('level,question,sentence1,sentence2,sentence3\nFoundation,How?,The point.,"The word “secret” suggests concealment. The word “solitary” suggests loneliness, too.",The purpose.\n');
  assert.equal(puzzles[0].sentences.length, 3);
  assert.equal(puzzles[0].sentences[1], 'The word “secret” suggests concealment. The word “solitary” suggests loneliness, too.');
});
