const { readFileSync } = require('node:fs');
const path = require('node:path');
const readCsv = require('../../tools/read-csv');

const filename = path.join(__dirname, '../assets/data/christmas-carol-quotes.csv');
const maxTiles = 7;
const normalise = word => word.toLowerCase().replaceAll('’', "'").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

function makeTiles(quote, breaks) {
  const words = quote.split(/\s+/);
  const keys = words.map(normalise);
  // Match whole words, ignoring case and surrounding punctuation. Even a single
  // loose "as" would be ambiguous if another tile also contains the word.
  const line = ' ' + keys.join(' ') + ' ';
  function unique(start, end) {
    const phrase = ' ' + keys.slice(start, end).join(' ') + ' ';
    return line.indexOf(phrase) === line.lastIndexOf(phrase);
  }

  let ends = [words.length];
  if (breaks) {
    // Optional tile_breaks lists the last word of each tile except the final one.
    let start = 0;
    ends = breaks.split('|').map(marker => {
      const word = marker.trim().toLowerCase();
      const end = words.findIndex((token, i) =>
        i >= start && (token.toLowerCase() === word || keys[i] === word)
      ) + 1;
      if (!end || end === words.length) throw new Error('Invalid tile break "' + marker + '" in ' + quote);
      start = end;
      return end;
    });
    ends.push(words.length);
  } else {
    // New entries without hand-set breaks split into distinct, roughly even tiles.
    while (ends.length < maxTiles) {
      let bestCut = 0;
      let bestBalance = 0;
      let start = 0;
      for (const end of ends) {
        for (let cut = start + 1; cut < end; cut++) {
          const balance = Math.min(cut - start, end - cut);
          if (balance > bestBalance && unique(start, cut) && unique(cut, end)) {
            bestBalance = balance;
            bestCut = cut;
          }
        }
        start = end;
      }
      if (!bestCut) break;
      ends.push(bestCut);
      ends.sort((a, b) => a - b);
    }
  }

  if (ends.length > maxTiles) throw new Error('More than seven tiles in ' + quote);
  return ends.map((end, index) => {
    const start = ends[index - 1] ?? 0;
    if (!unique(start, end)) throw new Error('Ambiguous tile in ' + quote);
    return words.slice(start, end).join(' ');
  });
}

module.exports = function quoteBuilderBank() {
  const [header, ...rows] = readCsv(readFileSync(filename, 'utf8'));
  const quoteColumn = header.indexOf('quote');
  const breakColumn = header.indexOf('tile_breaks');
  if (quoteColumn < 0) throw new Error('Missing quote column in ' + filename);

  const rounds = [];
  for (const row of rows) {
    const quote = row[quoteColumn]?.trim();
    if (!quote) continue;
    const tiles = makeTiles(quote, row[breakColumn]?.trim());
    if (tiles.length > 1) rounds.push(tiles);
  }
  if (!rounds.length) throw new Error('No orderable quotations in ' + filename);
  return JSON.stringify(rounds).replaceAll('<', '\\u003c');
};
