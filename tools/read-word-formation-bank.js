const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('./read-csv');
const readThemeTags = require('./read-theme-tags');

const levels = ['Foundation', 'Intermediate', 'Advanced'];
const columns = ['level', 'paragraph', 'stem1', 'stem2', 'stem3', 'stem4',
  'alternatives1', 'alternatives2', 'alternatives3', 'alternatives4'];
const word = /^\p{L}+(?:[-’']\p{L}+)*$/u;
const normalise = value => value.toLowerCase().replaceAll('’', "'");
const sentences = new Intl.Segmenter('en-GB', { granularity: 'sentence' });

module.exports = function readWordFormationBank(filename) {
  if (typeof filename !== 'string' || !filename.endsWith('.csv') || path.basename(filename) !== filename) {
    throw new Error('Set Word Formation to a CSV filename from src/assets/data.');
  }
  const [header, ...rows] = readCsv(readFileSync(path.join(__dirname, '../src/assets/data', filename), 'utf8'));
  const hasThemes = header.length === columns.length + 1 && header.at(-1) === 'themes';
  if (header.slice(0, columns.length).join(',') !== columns.join(',')
    || (header.length !== columns.length && !hasThemes)) {
    throw new Error(`Invalid Word Formation header in ${filename}.`);
  }

  const exercises = rows.map((row, index) => {
    const location = `Row ${index + 2} in ${filename}`;
    const [level, paragraph, ...fields] = row.slice(0, columns.length);
    if (row.length !== header.length || !levels.includes(level) || !paragraph?.trim()) {
      throw new Error(`${location} needs all ${hasThemes ? 'eleven' : 'ten'} fields and a level of Foundation, Intermediate or Advanced.`);
    }
    const forms = [];
    let removed = 0;
    const analysis = paragraph.replace(/\[\[([^\[\]]+)\]\]/g, (marked, answer, start) => {
      forms.push({ start: start - removed, answer });
      removed += marked.length - answer.length;
      return answer;
    });
    if (forms.length !== 4 || /\[\[|\]\]/.test(analysis)) {
      throw new Error(`${location} needs exactly four answers marked with [[double brackets]].`);
    }
    const tokens = new Map([...analysis.matchAll(/\p{L}+(?:[-’']\p{L}+)*/gu)].map(match => [match.index, match[0]]));
    const segments = sentences.segment(analysis);
    forms.forEach((form, position) => {
      const stem = fields[position].trim();
      const alternatives = fields[position + 4].trim()
        ? fields[position + 4].split(';').map(value => value.trim()) : [];
      if (!word.test(form.answer) || tokens.get(form.start) !== form.answer || !word.test(stem)
        || normalise(stem) === normalise(form.answer)) {
        throw new Error(`${location}, gap ${position + 1}: mark a whole word and supply a different single-word stem.`);
      }
      const answers = [form.answer, ...alternatives].map(normalise);
      if (alternatives.some(value => !word.test(value) || normalise(value) === normalise(stem))
        || new Set(answers).size !== answers.length) {
        throw new Error(`${location}, gap ${position + 1}: alternatives must be different single words, separated by semicolons.`);
      }
      form.stem = stem;
      form.context = segments.containing(form.start).segment.trim();
      if (alternatives.length) form.alternatives = alternatives;
    });
    const themes = hasThemes ? readThemeTags(row[columns.length], location) : null;
    return { level, analysis, forms, ...(themes ? { themes } : {}) };
  });
  if (levels.some(level => !exercises.some(exercise => exercise.level === level))) {
    throw new Error(`${filename} needs exercises at all three Word Formation levels.`);
  }
  return JSON.stringify(exercises).replaceAll('<', '\\u003c');
};
