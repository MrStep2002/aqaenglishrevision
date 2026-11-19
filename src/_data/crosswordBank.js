const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('../../tools/read-csv');

const filename = path.join(__dirname, '../assets/data/christmas-carol-crossword.csv');

module.exports = function crosswordBank() {
  const [header, ...rows] = readCsv(readFileSync(filename, 'utf8'));
  const columns = header.map(name => name.trim().toLowerCase());
  if (!columns.includes('word') || !columns.includes('clue') || new Set(columns).size !== columns.length) {
    throw new Error('christmas-carol-crossword.csv needs unique columns for word and clue.');
  }

  const field = (row, name) => row[columns.indexOf(name)]?.trim() ?? '';
  const words = [];
  rows.forEach((row, index) => {
    if (!row.some(value => value.trim())) return;
    const line = index + 2;
    const word = field(row, 'word').toLowerCase();
    const clue = field(row, 'clue');
    if (!/^[a-z]{2,}$/.test(word) || !clue || row.slice(columns.length).some(value => value.trim())) {
      throw new Error(`Check christmas-carol-crossword.csv row ${line}. It needs a letters-only word of at least two letters, and a clue.`);
    }
    if (words.some(entry => entry.word === word)) {
      throw new Error(`Check christmas-carol-crossword.csv row ${line}. "${word}" is already in the list.`);
    }
    words.push({ word, clue });
  });
  if (words.length < 2) throw new Error('christmas-carol-crossword.csv needs at least two words.');

  words.forEach((entry, index) => {
    const shares = words.some(other => other !== entry && [...entry.word].some(letter => other.word.includes(letter)));
    if (!shares) {
      throw new Error(`Check christmas-carol-crossword.csv row ${index + 2}. "${entry.word}" shares no letters with the other words, so it can never cross.`);
    }
  });

  return JSON.stringify({ words }).replaceAll('<', '\\u003c');
};
