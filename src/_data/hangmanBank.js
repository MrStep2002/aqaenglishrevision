const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('../../tools/read-csv');

const filename = path.join(__dirname, '../assets/data/christmas-carol-hangman.csv');
const levels = new Set(['1', '2', '3']);

module.exports = function hangmanBank() {
  const [header, ...rows] = readCsv(readFileSync(filename, 'utf8'));
  const columns = header.map(name => name.trim().toLowerCase());
  const required = ['word', 'level', 'definition'];
  if (required.some(name => !columns.includes(name)) || new Set(columns).size !== columns.length) {
    throw new Error('christmas-carol-hangman.csv needs unique columns for word, level and definition.');
  }

  const seen = new Set();
  const counts = { 1: 0, 2: 0, 3: 0 };
  const bank = [];
  rows.forEach((row, index) => {
    if (!row.some(value => value.trim())) return;
    const field = name => row[columns.indexOf(name)]?.trim() ?? '';
    const word = field('word');
    const level = field('level');
    const definition = field('definition');
    const key = word.toLowerCase();
    if (!word || seen.has(key) || !levels.has(level) || !/\p{L}/u.test(word)
      || row.slice(columns.length).some(value => value.trim())) {
      throw new Error(`Check christmas-carol-hangman.csv row ${index + 2}. It needs a unique word or quote, level 1, 2 or 3, and at least one letter.`);
    }
    seen.add(key);
    counts[level] += 1;
    bank.push({ word, level: Number(level), definition });
  });
  for (const level of levels) {
    if (!counts[level]) throw new Error(`christmas-carol-hangman.csv needs at least one word at level ${level}.`);
  }
  return JSON.stringify(bank).replaceAll('<', '\\u003c');
};
