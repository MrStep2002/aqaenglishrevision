const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('../../tools/read-csv');

const filename = path.join(__dirname, '../assets/data/fog-run.csv');
const levels = new Set(['1', '2', '3']);
const types = new Set(['definition', 'character', 'quote']);

module.exports = function fogRunBank() {
  const [header, ...rows] = readCsv(readFileSync(filename, 'utf8'));
  const columns = header.map(name => name.trim().toLowerCase());
  if (['word', 'level', 'type', 'clue'].some(name => !columns.includes(name)) || new Set(columns).size !== columns.length) {
    throw new Error('fog-run.csv needs unique columns for word, level, type and clue.');
  }
  const seen = new Set();
  const words = { 1: new Set(), 2: new Set(), 3: new Set() };
  const bank = [];
  rows.forEach((row, index) => {
    if (!row.some(value => value.trim())) return;
    const field = name => row[columns.indexOf(name)]?.trim() ?? '';
    const word = field('word'), level = field('level'), type = field('type'), clue = field('clue');
    const signature = JSON.stringify([word.toLowerCase(), level, type, clue.toLowerCase()]);
    const gaps = clue.split('____').length - 1;
    if (!/\p{L}/u.test(word) || !levels.has(level) || !types.has(type) || !clue || seen.has(signature)
      || gaps > 1 || (type === 'quote' && gaps !== 1) || row.slice(columns.length).some(value => value.trim())) {
      throw new Error(`Check fog-run.csv row ${index + 2}. Use an answer word, level 1, 2 or 3, type definition, character or quote, and a short clue. A quote needs one ____ gap.`);
    }
    seen.add(signature);
    words[level].add(word.toLowerCase());
    bank.push({ word, level: Number(level), type, clue });
  });
  for (const level of levels) {
    if (words[level].size < 10) throw new Error(`fog-run.csv needs at least ten different answers at level ${level} to fill the street.`);
  }
  return JSON.stringify(bank).replaceAll('<', '\\u003c');
};
