const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('../../tools/read-csv');

module.exports = async function connectingWallBank() {
  const filename = 'christmas-carol-wall.csv';
  const [header, ...rows] = readCsv(readFileSync(path.join(__dirname, '../assets/data', filename), 'utf8'));
  const columns = header.map(name => name.trim().toLowerCase());
  const required = ['id', 'level', 'group'];
  const wordColumns = columns.map((name, column) => ({ name, column }))
    .filter(item => /^word[1-9]\d*$/.test(item.name))
    .sort((a, b) => Number(a.name.slice(4)) - Number(b.name.slice(4)));
  if (required.some(name => !columns.includes(name)) || wordColumns.length < 4
    || new Set(columns).size !== columns.length) {
    throw new Error(`${filename} needs unique id, level, group and at least four numbered word columns.`);
  }
  const ids = new Set();
  const names = new Set();
  const bank = [];
  rows.forEach((row, index) => {
    if (!row.some(value => value.trim())) return;
    const field = name => row[columns.indexOf(name)]?.trim() ?? '';
    const id = field('id');
    const name = field('group');
    const level = field('level');
    const words = wordColumns.map(item => row[item.column]?.trim() ?? '').filter(Boolean);
    if (!id || !name || !['1', '2', '3'].includes(level) || ids.has(id) || names.has(name.toLowerCase())
      || words.length < 4 || new Set(words.map(word => word.toLowerCase())).size !== words.length
      || row.slice(columns.length).some(value => value.trim())) {
      throw new Error(`Check ${filename} row ${index + 2}. Each category needs a unique id and name, level 1, 2 or 3, and at least four different words.`);
    }
    ids.add(id);
    names.add(name.toLowerCase());
    bank.push({ id, level: Number(level), name, words, explanation: field('explanation') });
  });
  const { dealWall } = await import('../assets/js/connecting-wall-logic.mjs');
  if (!dealWall(bank, 1)) throw new Error(`${filename} needs four compatible categories. Each must have four words that do not belong to another selected category.`);
  return JSON.stringify(bank).replaceAll('<', '\\u003c');
};
