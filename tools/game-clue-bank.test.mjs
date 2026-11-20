import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { wordChoices } from '../src/assets/js/carol-word-choices.js';
import { FogRunMaze } from '../src/assets/js/fog-run-maze.js';

const require = createRequire(import.meta.url);
const readClueBank = require('./read-clue-bank.js');
const fog = JSON.parse(require('../src/_data/fogRunBank.js')());
const freds = JSON.parse(require('../src/_data/fredsOrDeadBank.js')());
const fixture = 'word,level,type,clue\n'
  + 'oyster,1,quote,"Solitary as an ____"\n'
  + 'Fred,1,crossword,"Who is Scrooge’s nephew?"\n'
  + 'Bob,1,crossword,"Who is Scrooge’s clerk?"\n';
const key = value => value.trim().toLowerCase().replaceAll('’', "'");

test('clue bank reads direct questions and quotation gaps without inventing a definition', () => {
  const rows = readClueBank(fixture, { minimumAnswers: 0 });
  assert.equal(rows[0].clue, 'Solitary as an ____');
  assert.equal(rows[1].type, 'crossword');
  assert.equal(rows[1].clue, 'Who is Scrooge’s nephew?');
  assert.equal(rows[1].definition, '');
});

test('clue bank rejects broken gap exercises and duplicate answer/clue pairs', () => {
  assert.throws(() => readClueBank(fixture.replace('an ____', 'an oyster'), { minimumAnswers: 0 }), /row 2/);
  assert.throws(() => readClueBank(fixture.replace('an ____', 'an ____ ____'), { minimumAnswers: 0 }), /row 2/);
  assert.throws(() => readClueBank(fixture + 'Fred,1,crossword,"Who is Scrooge’s nephew?"\n', { minimumAnswers: 0 }), /row 5/);
});

test('minimum answer counts use distinct answers rather than number of clues', () => {
  const repeated = 'word,level,type,clue\nFred,1,crossword,Who invites Scrooge?\nFred,1,character,Scrooge’s nephew\n';
  assert.throws(() => readClueBank(repeated, { minimumAnswers: 3 }), /three|3 different answers/);
});

test('Fog Run offers three distinct answers despite multiple clues for the same word', () => {
  for (const entry of fog) {
    for (let run = 0; run < 3; run++) {
      const choices = wordChoices(entry, fog);
      assert.equal(choices.length, 3);
      assert.equal(new Set(choices.map(item => key(item.word))).size, 3, entry.word);
      assert.equal(choices.filter(item => key(item.word) === key(entry.word)).length, 1);
      assert.ok(choices.includes(entry));
      assert.ok(choices.every(item => item.level === entry.level));
    }
  }
});

test('maze rewards only the correct answer for both Crossword and quotation clues', () => {
  for (const type of ['crossword', 'quote']) {
    const entry = fog.find(item => item.type === type);
    const maze = new FogRunMaze(() => 0.4);
    maze.placeWords(wordChoices(entry, fog), entry);
    assert.equal(maze.tokens.filter(token => token.correct).length, 1);
    const wrong = maze.tokens.find(token => !token.correct);
    maze.player = { cell: wrong.cell, to: wrong.cell, t: 0, dir: null };
    assert.equal(maze.tick(0).kind, 'miss');
    assert.equal(maze.words, 0);
    assert.equal(maze.lives, 2);
    const right = maze.tokens.find(token => token.correct);
    maze.player = { cell: right.cell, to: right.cell, t: 0, dir: null };
    assert.equal(maze.tick(0).kind, 'word');
    assert.equal(maze.words, 1);
  }
});

test('new banks keep their own formats and include the requested source families', () => {
  assert.deepEqual(new Set(fog.map(entry => entry.type)), new Set(['sentence', 'crossword', 'quote']));
  assert.equal(fog.filter(entry => entry.type === 'sentence').length, 100);
  assert.deepEqual(new Set(freds.map(entry => entry.type)), new Set(['definition', 'character', 'quote', 'crossword']));
  assert.equal(freds.filter(entry => entry.type === 'definition').length, 90);
  assert.ok(fog.some(entry => entry.type === 'crossword' && entry.word === 'Ebenezer'));
  assert.ok(freds.some(entry => entry.type === 'crossword' && entry.word === 'Ebenezer'));
  for (const entry of fog.filter(entry => ['quote', 'crossword'].includes(entry.type))) {
    assert.ok(freds.some(other => key(other.word) === key(entry.word) && other.level === entry.level
      && other.clue.toLowerCase().replace(/[^a-z0-9]/g, '') === entry.clue.toLowerCase().replace(/[^a-z0-9]/g, '')), entry.clue);
  }
  const hangman = JSON.parse(require('../src/_data/hangmanBank.js')());
  for (const word of ['bed-curtains', 'direct address', 'cyclical structure', 'semantic field', 'half-a-crown', 'Poor Law']) {
    assert.ok(hangman.some(entry => entry.word === word));
  }
  assert.equal(hangman.filter(entry => /[ !]/.test(entry.word) && !['direct address', 'cyclical structure', 'semantic field', 'Poor Law'].includes(entry.word)).length, 3);
});
