const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('../../tools/read-csv');

module.exports = function wordsearchBank() {
  const [header, ...rows] = readCsv(readFileSync(path.join(__dirname, '../assets/data/christmas-carol-crossword.csv'), 'utf8'));
  const columns = header.map(name => name.trim().toLowerCase());
  if (!columns.includes('word') || !columns.includes('level')) {
    throw new Error('Wordsearch needs word and level columns in christmas-carol-crossword.csv.');
  }
  const words = new Set();
  rows.forEach((row, index) => {
    if (row[columns.indexOf('level')]?.trim() !== '1') return;
    const word = row[columns.indexOf('word')]?.trim() || '';
    if (!/^[a-z]{2,}$/i.test(word)) throw new Error(`Check crossword row ${index + 2}: Wordsearch needs a letters-only Level 1 word.`);
    if (word.length <= 10) words.add(word.toUpperCase());
  });
  if (words.size < 8) throw new Error('Wordsearch needs at least eight Level 1 crossword words with 2–10 letters.');
  return JSON.stringify([...words]);
};
