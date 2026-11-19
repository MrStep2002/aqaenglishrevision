const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('../../tools/read-csv');

const filename = path.join(__dirname, '../assets/data/plot-quiz.csv');
const themes = new Set(['change', 'christmas', 'compassion', 'family', 'greed', 'social-injustice']);

module.exports = function plotQuizBank() {
  const [header, ...rows] = readCsv(readFileSync(filename, 'utf8'));
  const columns = header.map(name => name.trim().toLowerCase());
  const required = ['id', 'question', 'answer', 'wrong1', 'wrong2', 'wrong3', 'themes', 'staves', 'characters'];
  if (required.some(name => !columns.includes(name)) || new Set(columns).size !== columns.length) {
    throw new Error('plot-quiz.csv needs unique columns for ' + required.join(', ') + '.');
  }

  const ids = new Set();
  const questions = new Set();
  const bank = [];
  rows.forEach((row, index) => {
    if (!row.some(value => value.trim())) return;
    const field = name => row[columns.indexOf(name)]?.trim() ?? '';
    const id = field('id');
    const question = field('question');
    const choices = ['answer', 'wrong1', 'wrong2', 'wrong3'].map(field);
    const themeTags = field('themes').split(';').map(tag => tag.trim());
    const staves = field('staves').split(';').map(stave => stave.trim());
    const characters = field('characters').split(';').map(character => character.trim());
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || ids.has(id) || !question || questions.has(question)
      || choices.some(choice => !choice) || new Set(choices.map(choice => choice.toLowerCase())).size !== 4
      || themeTags.some(tag => !themes.has(tag)) || new Set(themeTags).size !== themeTags.length
      || staves.some(stave => !/^[1-5]$/.test(stave)) || new Set(staves).size !== staves.length
      || characters.some(character => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(character))
      || row.slice(columns.length).some(value => value.trim())) {
      throw new Error(`Check plot-quiz.csv row ${index + 2}. It needs a unique ID and question, four different choices and valid theme, stave and character tags.`);
    }
    ids.add(id);
    questions.add(question);
    bank.push({ id, question, choices, themes: themeTags, staves, characters, explanation: field('explanation') });
  });
  if (!bank.length) throw new Error('plot-quiz.csv needs at least one question.');
  return JSON.stringify(bank).replaceAll('<', '\\u003c');
};
