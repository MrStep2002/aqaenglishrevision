import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import readCsv from './read-csv.js';
import readBank from '../src/_data/wordsearchBank.js';
import { makeWordsearch, scanWords, selectionPath, selectionWord } from '../src/assets/js/wordsearch-logic.mjs';

const bank = JSON.parse(readBank());
const randomFor = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

test('the bank contains only Level 1 crossword words that fit ten cells', () => {
  const [header, ...rows] = readCsv(readFileSync(new URL('../src/assets/data/christmas-carol-crossword.csv', import.meta.url), 'utf8'));
  const expected = rows.filter(row => row[header.indexOf('level')]?.trim() === '1').map(row => row[header.indexOf('word')].trim().toUpperCase()).filter(word => word.length <= 10);
  assert.deepEqual(new Set(bank), new Set(expected));
  assert(bank.length >= 8);
});

test('random boards contain eight complete, collectable answers and no extra bank words', () => {
  const signatures = new Set(), directions = new Set();
  const random = randomFor(20261120);
  for (let turn = 0; turn < 120; turn++) {
    const puzzle = makeWordsearch(bank, { random });
    assert.equal(puzzle.grid.length, 10);
    assert(puzzle.grid.every(row => row.length === 10 && row.every(letter => /^[A-Z]$/.test(letter))));
    assert.equal(new Set(puzzle.words).size, 8);
    assert.equal(puzzle.placements.length, 8);
    assert(puzzle.words.every(word => bank.includes(word)));
    assert.deepEqual(new Set(scanWords(puzzle.grid, bank)), new Set(puzzle.words));
    const axes = puzzle.placements.map(({ cells }) => {
      const step = Math.abs(cells[1] - cells[0]);
      return step === 1 ? 'across' : step === 10 ? 'down' : step === 11 ? 'diagonal-down' : 'diagonal-up';
    });
    assert.equal(new Set(axes).size, 4, 'Each board mixes across, down and both diagonal slopes.');
    assert(axes.filter(axis => axis.startsWith('diagonal')).length >= 3);
    const connected = new Set([0]);
    for (let pass = 0; pass < 8; pass++) for (let i = 0; i < 8; i++) {
      if (connected.has(i)) continue;
      if ([...connected].some(j => axes[i] !== axes[j] && puzzle.placements[i].cells.some(cell => puzzle.placements[j].cells.includes(cell)))) connected.add(i);
    }
    assert.equal(connected.size, 8, 'Every answer joins the shared-letter network.');
    for (const placement of puzzle.placements) {
      assert.equal(selectionWord(puzzle.grid, placement.cells), placement.word);
      assert.deepEqual(selectionPath(placement.cells[0], placement.cells.at(-1)), placement.cells);
      assert.deepEqual(selectionPath(placement.cells.at(-1), placement.cells[0]), [...placement.cells].reverse());
      directions.add(placement.cells[1] - placement.cells[0]);
    }
    signatures.add([...puzzle.words].sort().join('|'));
  }
  assert(signatures.size > 100);
  assert.equal(directions.size, 8);
});

test('recognisable embedded answers are included in the eight', () => {
  const pool = ['BELLE', 'BELL', 'TURKEY', 'KEY', 'CHURCHYARD', 'CHURCH', 'FRED', 'TIM', 'BOB', 'SCROOGE'];
  const random = randomFor(76);
  for (let turn = 0; turn < 20; turn++) {
    const puzzle = makeWordsearch(pool, { random });
    for (const [parent, child] of [['BELLE', 'BELL'], ['TURKEY', 'KEY'], ['CHURCHYARD', 'CHURCH']]) {
      if (puzzle.words.includes(parent)) assert(puzzle.words.includes(child));
    }
    assert.deepEqual(new Set(scanWords(puzzle.grid, pool)), new Set(puzzle.words));
  }
});

test('ten-letter answers fit and can be selected end to end', () => {
  const pool = ['APPRENTICE', 'FRIENDSHIP', 'GENEROSITY', 'POPULATION', 'REPETITION', 'SCHOOLROOM', 'WAREHOUSE', 'CHRISTMAS'];
  const puzzle = makeWordsearch(pool, { random: randomFor(12) });
  assert.deepEqual(new Set(puzzle.words), new Set(pool));
  for (const placement of puzzle.placements) assert.equal(selectionWord(puzzle.grid, selectionPath(placement.cells[0], placement.cells.at(-1))), placement.word);
});

test('selections stay in straight lines and never wrap between rows', () => {
  assert.deepEqual(selectionPath(0, 99), [0, 11, 22, 33, 44, 55, 66, 77, 88, 99]);
  assert.deepEqual(selectionPath(9, 90), [9, 18, 27, 36, 45, 54, 63, 72, 81, 90]);
  assert.deepEqual(selectionPath(9, 10), []);
  assert.deepEqual(selectionPath(-1, 22), []);
  assert.deepEqual(selectionPath(0, 100), []);
  assert.deepEqual(selectionPath(0, 13, 10, true), [0, 1, 2, 3]);
  assert.deepEqual(selectionPath(99, 87, 10, true), [99, 88, 77]);
});

test('a bank that cannot supply eight answers fails with a useful error', () => {
  assert.throws(() => makeWordsearch(['FRED', 'BOB']), /Not enough words/);
});
