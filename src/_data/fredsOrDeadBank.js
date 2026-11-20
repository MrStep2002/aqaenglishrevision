const { readFileSync } = require('node:fs');
const path = require('node:path');
const readClueBank = require('../../tools/read-clue-bank');

module.exports = function fredsOrDeadBank() {
  const filename = 'freds-or-dead.csv';
  const bank = readClueBank(readFileSync(path.join(__dirname, '../assets/data', filename), 'utf8'),
    { label: filename, minimumAnswers: 10 });
  return JSON.stringify(bank).replaceAll('<', '\\u003c');
};
