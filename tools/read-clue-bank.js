const readCsv = require('./read-csv');

const types = new Set(['sentence', 'definition', 'character', 'quote', 'crossword']);

module.exports = function readClueBank(text, { label = 'Clue CSV', minimumAnswers = 3 } = {}) {
  const [header, ...rows] = readCsv(text);
  const columns = header.map(name => name.trim().toLowerCase());
  if (['word', 'level', 'type', 'clue'].some(name => !columns.includes(name))
    || new Set(columns).size !== columns.length) {
    throw new Error(`${label} needs unique columns for word, level, type and clue.`);
  }

  const seen = new Set();
  const answers = { 1: new Set(), 2: new Set(), 3: new Set() };
  const bank = [];
  rows.forEach((row, index) => {
    if (!row.some(value => value.trim())) return;
    const field = name => row[columns.indexOf(name)]?.trim() ?? '';
    const word = field('word'), level = field('level'), type = field('type'), clue = field('clue');
    const key = JSON.stringify([word.toLowerCase(), level, clue.toLowerCase()]);
    const gaps = clue.split('____').length - 1;
    if (!/\p{L}/u.test(word) || !Object.hasOwn(answers, level) || !types.has(type)
      || !clue || seen.has(key) || gaps > 1 || /_{5,}/.test(clue)
      || (['quote', 'sentence'].includes(type) && gaps !== 1)
      || row.slice(columns.length).some(value => value.trim())) {
      throw new Error(`Check ${label} row ${index + 2}. Use an answer, level 1, 2 or 3, a valid type and a clue. Sentence and quote clues need one ____ gap.`);
    }
    seen.add(key);
    answers[level].add(word.toLowerCase());
    bank.push({ word, level: Number(level), type, clue, definition: field('definition') });
  });

  for (const [level, words] of Object.entries(answers)) {
    if (words.size < minimumAnswers) {
      throw new Error(`${label} needs at least ${minimumAnswers} different answers at level ${level}.`);
    }
  }
  return bank;
};
