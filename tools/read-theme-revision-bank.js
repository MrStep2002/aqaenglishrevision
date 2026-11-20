const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('./read-csv');
const readThemeTags = require('./read-theme-tags');
const readParagraphBank = require('./read-paragraph-bank');
const vocabularyBank = require('../src/_data/vocabularyBank');
const plotQuizBank = require('../src/_data/plotQuizBank');
const quoteBuilderBank = require('../src/_data/quoteBuilderBank');

const titles = {
  change: 'Change', christmas: 'Christmas', compassion: 'Compassion',
  family: 'Family', greed: 'Greed', 'social-injustice': 'Social Injustice',
};
const dataFolder = path.join(__dirname, '../src/assets/data');
const normalise = value => value.trim().toLowerCase().replaceAll('’', "'");

function quotes() {
  const [columns, ...rows] = readCsv(readFileSync(path.join(dataFolder, 'christmas-carol-quotes.csv'), 'utf8'));
  const tiles = new Map(JSON.parse(quoteBuilderBank()).map(parts => [parts.join(' '), parts]));
  return rows.filter(row => row.some(value => value.trim())).map((row, index) => {
    const field = name => row[columns.indexOf(name)]?.trim() ?? '';
    const quote = field('quote');
    const pool = Number(field('pool'));
    const location = `Quotation row ${index + 2}`;
    const themes = readThemeTags(field('themes'), location);
    const words = [...quote.matchAll(/\p{L}+(?:[’'-]\p{L}+)*/gu)];
    const blanks = field('blanks').split(';').map(group => {
      const choices = group.split('|').map(word => word.trim());
      const answer = choices[0];
      const matches = words.filter(word => normalise(word[0]) === normalise(answer));
      if (choices.length !== 4 || choices.some(word => !word)
        || new Set(choices.map(normalise)).size !== 4 || matches.length !== 1) {
        throw new Error(`${location} needs a unique missing word and four distinct answer choices.`);
      }
      const start = matches[0].index;
      return { answer, choices, masked: quote.slice(0, start) + '_____' + quote.slice(start + matches[0][0].length) };
    });
    if (!quote || ![10, 25, 50].includes(pool)) throw new Error(`${location} needs a quotation pool of 10, 25 or 50.`);
    return { quote, pool, themes, blanks, tiles: tiles.get(quote.replace(/\s+/g, ' ')) ?? [] };
  });
}

module.exports = function readThemeRevisionBanks(analysisDecks, corrections) {
  const sources = {
    quotes: quotes(),
    plot: JSON.parse(plotQuizBank()),
    context: JSON.parse(readFileSync(path.join(dataFolder, 'christmas-carol-context.json'), 'utf8')),
    vocabulary: JSON.parse(vocabularyBank()),
    jigsaw: JSON.parse(readParagraphBank('build-the-paragraph.csv')),
    corrections,
  };
  return Object.fromEntries(Object.entries(titles).map(([theme, title]) => {
    const tagged = items => items.filter(item => item.themes?.includes(theme));
    const bank = {
      theme, title,
      quotes: tagged(sources.quotes),
      plot: tagged(sources.plot),
      context: tagged(sources.context),
      vocabulary: sources.vocabulary,
      jigsaw: tagged(sources.jigsaw),
      corrections: tagged(sources.corrections),
      analysis: analysisDecks[theme].map(item => ({ ...item, themes: [theme] })),
    };
    return [theme, JSON.stringify(bank).replaceAll('<', '\\u003c')];
  }));
};
