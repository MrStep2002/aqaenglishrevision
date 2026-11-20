const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('./read-csv');
const readThemeTags = require('./read-theme-tags');

const bankFolder = path.join(__dirname, '../src/assets/data/paragraph-games');

module.exports = function readParagraphBank(filename) {
  if (typeof filename !== 'string' || !filename.endsWith('.csv') || path.basename(filename) !== filename) {
    throw new Error('Set the paragraph game bank to a CSV filename from src/assets/data/paragraph-games.');
  }

  let header;
  let rows;
  try {
    [header, ...rows] = readCsv(readFileSync(path.join(bankFolder, filename), 'utf8'));
  } catch (error) {
    throw new Error(`Could not read paragraph game bank ${filename}. ${error.message}`, { cause: error });
  }

  const columns = header.map(value => value.trim().toLowerCase());
  const namedColumns = columns.filter(Boolean);
  const questionColumn = columns.indexOf('question');
  const levelColumn = columns.indexOf('level');
  const themesColumn = columns.indexOf('themes');
  const explanationColumn = columns.indexOf('explanation');
  const sentenceColumns = [];
  columns.forEach((name, column) => {
    const match = /^sentence([1-9]\d*)$/.exec(name);
    if (!match) return;
    sentenceColumns.push({ position: Number(match[1]), column, hint: columns.indexOf('hint' + match[1]) });
  });
  sentenceColumns.sort((a, b) => a.position - b.position);
  if (questionColumn < 0 || sentenceColumns.length < 2 || new Set(namedColumns).size !== namedColumns.length) {
    throw new Error(`${filename} needs a question column and at least two numbered sentence columns with unique column names.`);
  }

  const puzzles = [];
  rows.forEach((row, index) => {
    const values = row.map(value => value.trim());
    if (!values.some(Boolean)) return;
    const location = `Row ${index + 2} in ${filename}`;
    if (values.slice(header.length).some(Boolean)) {
      throw new Error(`${location} has extra fields. Quote any cell that contains a comma.`);
    }
    const question = values[questionColumn];
    const level = levelColumn >= 0 ? values[levelColumn] : undefined;
    if (levelColumn >= 0 && !['Foundation', 'Intermediate', 'Advanced'].includes(level)) {
      throw new Error(`${location} needs a level of Foundation, Intermediate or Advanced.`);
    }
    const sentences = [];
    const hints = [];
    for (const { column, hint } of sentenceColumns) {
      if (!values[column]) continue;
      sentences.push(values[column]);
      hints.push(values[hint] ?? '');
    }
    if (!question || new Set(sentences).size < 2) {
      throw new Error(`${location} needs a question and at least two different sentences.`);
    }
    const themes = themesColumn >= 0 ? readThemeTags(values[themesColumn], location) : null;
    puzzles.push({ question, ...(levelColumn >= 0 ? { level } : {}), ...(themes ? { themes } : {}), sentences, hints, explanation: values[explanationColumn] ?? '' });
  });

  if (!puzzles.length) throw new Error(`${filename} needs at least one paragraph.`);
  return JSON.stringify(puzzles).replaceAll('<', '\\u003c');
};
