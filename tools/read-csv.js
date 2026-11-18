module.exports = function readCsv(text) {
  const pattern = /("(?:[^"]|"")*"|[^",\r\n]*)(,|\r\n|[\r\n]|$)/gy;
  const rows = [];
  let row = [];
  text = text.replace(/^\uFEFF/, '').trimEnd() + '\n';
  while (pattern.lastIndex < text.length) {
    const field = pattern.exec(text);
    if (!field || !field[0].length) throw new Error(`Invalid CSV in row ${rows.length + 1}`);
    const [, value, separator] = field;
    row.push(value.startsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value);
    if (separator !== ',') {
      rows.push(row);
      row = [];
    }
  }
  return rows;
};
