const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('../../tools/read-csv');

const filename = path.join(__dirname, '../assets/data/christmas-carol-vocabulary.csv');
const levels = new Set(['1', '2', '3']);

function occurrences(example, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...example.matchAll(new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'giu'))];
}

module.exports = function vocabularyBank() {
  const [header, ...rows] = readCsv(readFileSync(filename, 'utf8'));
  const columns = header.map(name => name.trim().toLowerCase());
  const required = ['word', 'level', 'definition', 'example'];
  if (required.some(name => !columns.includes(name)) || new Set(columns).size !== columns.length) {
    throw new Error('christmas-carol-vocabulary.csv needs unique columns for word, level, definition and example.');
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
    const example = field('example');
    const matches = occurrences(example, word);
    const key = word.toLowerCase();
    if (!word || seen.has(key) || !levels.has(level) || !definition || !example
      || matches.length !== 1 || row.slice(columns.length).some(value => value.trim())) {
      throw new Error(`Check christmas-carol-vocabulary.csv row ${index + 2}. It needs a unique word, level 1, 2 or 3, a definition, and an example that uses the word once.`);
    }
    seen.add(key);
    counts[level] += 1;
    // A short example opts a Level 1 word into Fog Run's beginner set.
    const shortExample = field('fog_easy_example');
    let fogEasy;
    if (level === '1' && shortExample) {
      const shortMatches = occurrences(shortExample, word);
      if (shortMatches.length !== 1) {
        throw new Error(`Check the Fog Run example on vocabulary row ${index + 2}. It must use the word once.`);
      }
      fogEasy = {example: shortExample, start: shortMatches[0].index, length: shortMatches[0][0].length};
    }
    bank.push({
      fogEasy,
      word,
      level: Number(level),
      definition,
      example,
      start: matches[0].index,
      length: matches[0][0].length,
    });
  });
  for (const level of levels) {
    if (counts[level] < 4) {
      throw new Error(`christmas-carol-vocabulary.csv needs at least four words at level ${level}.`);
    }
  }
  return JSON.stringify(bank).replaceAll('<', '\\u003c');
};
