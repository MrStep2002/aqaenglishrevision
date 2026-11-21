const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('./read-csv');

const filename = 'christmas-carol-serve-your-sentence.csv';
const normalise = value => value.trim().toLowerCase();
const singleWord = value => /^\p{L}+(?:[’'-]\p{L}+)*$/u.test(value);

module.exports = function readServeYourSentenceBank(text) {
  const input = text ?? readFileSync(path.join(__dirname,'../src/assets/data',filename),'utf8');
  const [header = [], ...rows] = readCsv(input);
  const columns = header.map(value => normalise(value));
  const required = ['id','level','word','example','definition','wrong1','wrong2','wrong3'];
  if (required.some(name => !columns.includes(name)) || new Set(columns).size !== columns.length) {
    throw new Error(`${filename} needs unique id, level, word, example, definition and wrong1–wrong3 columns.`);
  }
  const ids = new Set(), sentences = new Set(), bank = [];
  rows.forEach((row,index) => {
    if (!row.some(value => value.trim())) return;
    const field = name => row[columns.indexOf(name)]?.trim() ?? '';
    const id = field('id'), word = field('word'), level = Number(field('level'));
    const example = field('example'), definition = field('definition');
    const label = `${filename} row ${index+2}${id ? ' ('+id+')' : ''}`;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const matches = [...example.matchAll(new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`,'giu'))];
    if (!id || ids.has(id) || ![1,2,3].includes(level) || !word || !example || !definition
      || matches.length !== 1 || sentences.has(normalise(example))
      || row.slice(columns.length).some(value => value.trim())) {
      throw new Error(`Check ${label}. Use a unique id and sentence, level 1–3, a definition, and an answer appearing exactly once in its example.`);
    }
    const wrong = ['wrong1','wrong2','wrong3'].map(field);
    const curated = wrong.some(Boolean);
    if ((level === 1 && !curated) || (curated && (wrong.some(value => !value)
      || new Set([word,...wrong].map(normalise)).size !== 4))
      || (level === 1 && ![word,...wrong].every(singleWord))) {
      throw new Error(`Check ${label}. Level 1 needs a single-word answer and three distinct single-word alternatives. Any supplied alternative set must contain all three words.`);
    }
    ids.add(id); sentences.add(normalise(example));
    bank.push({ id, word, level, definition, example, start:matches[0].index, length:matches[0][0].length,
      ...(curated ? {choices:[word,...wrong]} : {}) });
  });
  for (const level of [1,2,3]) {
    if (new Set(bank.filter(item => item.level===level).map(item => normalise(item.word))).size < 4) {
      throw new Error(`${filename} needs at least four different answer words at level ${level}.`);
    }
  }
  return JSON.stringify(bank).replaceAll('<','\\u003c');
};
