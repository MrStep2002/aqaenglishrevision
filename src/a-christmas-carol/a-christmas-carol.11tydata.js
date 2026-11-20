const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('../../tools/read-csv');
const readWordFormationBank = require('../../tools/read-word-formation-bank');
const readThemeRevisionBanks = require('../../tools/read-theme-revision-bank');

const bank = path.join(__dirname, '../assets/data/christmas-carol-analysis-gaps.csv');
const levels = ['Foundation', 'Intermediate', 'Advanced'];
const themes = {
  greed: 'Greed',
  change: 'Change',
  'social-injustice': 'Social Injustice',
  family: 'Family',
  christmas: 'Christmas',
  compassion: 'Compassion',
};
const sentences = new Intl.Segmenter('en-GB', { granularity: 'sentence' });
const normalise = word => word.toLowerCase().replaceAll('’', "'");

module.exports = function () {
  const [header, ...rows] = readCsv(readFileSync(bank, 'utf8'));
  if (header.join(',') !== 'level,paragraph,extra1,extra2,themes') throw new Error('Invalid Analysis Gaps header');

  const items = rows.map(([level, paragraph, extra1, extra2, themeTags, ...unexpected], index) => {
    const extras = [extra1, extra2];
    const tags = themeTags?.split(';').map(tag => tag.trim()) ?? [];
    const gaps = [];
    let removed = 0;
    const analysis = paragraph.replace(/\[\[([^\[\]]+)\]\]/g, (marked, answer, index) => {
      gaps.push({ start: index - removed, answer });
      removed += marked.length - answer.length;
      return answer;
    });
    const words = new Set([...analysis.matchAll(/\p{L}+(?:[-’']\p{L}+)*/gu)].map(match => normalise(match[0])));
    const options = new Set([...gaps.map(gap => gap.answer), ...extras].map(normalise));
    if (!levels.includes(level) || gaps.length !== 5 || unexpected.length || options.size !== 7
      || !tags.length || tags.some(tag => !Object.values(themes).includes(tag))
      || [...options].some(word => !/^\p{L}+(?:[-']\p{L}+)*$/u.test(word))
      || extras.some(word => words.has(normalise(word))) || /\[\[|\]\]/.test(analysis)) {
      throw new Error(`Invalid Analysis Gaps exercise on CSV row ${index + 2}`);
    }
    const segments = sentences.segment(analysis);
    for (const gap of gaps) gap.context = segments.containing(gap.start).segment.trim();
    return { exercise: { level, analysis, gaps, extras }, tags };
  });
  const decks = { essays: items.map(item => item.exercise) };
  for (const [slug, theme] of Object.entries(themes)) {
    decks[slug] = items.filter(item => item.tags.includes(theme)).map(item => item.exercise);
  }
  for (const [slug, deck] of Object.entries(decks)) {
    if (levels.some(level => !deck.some(item => item.level === level))) {
      throw new Error(`Missing Analysis Gaps level for ${slug}`);
    }
  }

  const wordFormationBank = readWordFormationBank('christmas-carol-word-formation.csv');
  return {
    wordFormationBank,
    themeRevisionTitles: themes,
    themeRevisionBanks: readThemeRevisionBanks(decks, JSON.parse(wordFormationBank)),
    analysisGapsBanks: Object.fromEntries(Object.entries(decks).map(([slug, deck]) =>
      [slug, JSON.stringify(deck).replaceAll('<', '\u003c')]
    )),
  };
};
