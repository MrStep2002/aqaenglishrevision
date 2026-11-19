const directions = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const reverse = word => [...word].reverse().join('');

function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function trieFor(words) {
  const root = Object.create(null);
  for (const word of words) {
    let node = root;
    for (const letter of word) node = node[letter] ||= Object.create(null);
    node.word = word;
  }
  return root;
}
function scan(grid, trie) {
  const size = grid.length, found = new Set();
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    for (const [dr, dc] of directions) {
      let r = row, c = col, node = trie;
      while (r >= 0 && c >= 0 && r < size && c < size && grid[r][c] && (node = node[grid[r][c]])) {
        if (node.word) found.add(node.word);
        r += dr; c += dc;
      }
    }
  }
  return [...found];
}
export function scanWords(grid, words) { return scan(grid, trieFor(words)); }

export function selectionPath(start, end, size = 10, snap = false) {
  if (![start, end].every(index => Number.isInteger(index) && index >= 0 && index < size * size)) return [];
  const row = Math.floor(start / size), col = start % size;
  const dr = Math.floor(end / size) - row, dc = end % size - col;
  if (!dr && !dc) return [start];
  let sr = Math.sign(dr), sc = Math.sign(dc), steps = Math.max(Math.abs(dr), Math.abs(dc));
  if (dr && dc && Math.abs(dr) !== Math.abs(dc)) {
    if (!snap) return [];
    const octant = (Math.round(Math.atan2(dr, dc) / (Math.PI / 4)) + 8) % 8;
    [sr, sc] = directions[octant];
    steps = Math.round((dr * sr + dc * sc) / (sr * sr + sc * sc));
  }
  const limit = Math.min(sr > 0 ? size - row - 1 : sr < 0 ? row : Infinity, sc > 0 ? size - col - 1 : sc < 0 ? col : Infinity);
  return Array.from({ length: Math.min(steps, limit) + 1 }, (_, i) => (row + sr * i) * size + col + sc * i);
}
export function selectionWord(grid, path) {
  return path.map(index => grid[Math.floor(index / grid.length)][index % grid.length]).join('');
}

function layoutQuality(placements, size) {
  const axes = placements.map(({ cells }) => {
    const step = cells[1] - cells[0];
    return Math.abs(step) === 1 ? 0 : Math.abs(step) === size ? 1 : Math.abs(step) === size + 1 ? 2 : 3;
  });
  const groups = placements.map((_, i) => i);
  const root = index => { while (groups[index] !== index) index = groups[index]; return index; };
  for (let i = 0; i < placements.length; i++) for (let j = i + 1; j < placements.length; j++) {
    if (axes[i] !== axes[j] && placements[i].cells.some(cell => placements[j].cells.includes(cell))) groups[root(j)] = root(i);
  }
  const components = new Set(groups.map((_, i) => root(i))).size;
  const kinds = new Set(axes).size;
  const diagonals = axes.filter(axis => axis > 1).length;
  const diagonalTarget = Math.min(3, Math.floor(placements.length / 2));
  return {
    score: (placements.length - components) * 20 + kinds * 12 + Math.min(diagonals, diagonalTarget) * 8,
    good: components === 1 && kinds === Math.min(4, placements.length) && diagonals >= diagonalTarget,
  };
}

export function makeWordsearch(input, { size = 10, count = 8, random = Math.random } = {}) {
  const pool = [...new Set(input.map(word => word.trim().toUpperCase()))].filter(word => /^[A-Z]{2,}$/.test(word) && word.length <= size);
  if (pool.length < count || count > size) throw new Error('Not enough words to fill this wordsearch.');
  const trie = trieFor(pool);
  let best = null;
  for (let attempt = 0; attempt < 80; attempt++) {
    const words = [];
    for (const word of shuffled(pool, random)) {
      // BELLE also contains BELL. Include embedded answers in the eight rather
      // than showing a recognisable bank word that the player cannot collect.
      const additions = pool.filter(other => !words.includes(other) && (word.includes(other) || reverse(word).includes(other)));
      if (words.length + additions.length <= count) words.push(...additions);
      if (words.length === count) break;
    }
    if (words.length !== count) continue;
    const wanted = new Set(words);
    const grid = Array.from({ length: size }, () => Array(size).fill(null));
    const placements = [];
    const occupiedAxes = Array(size * size).fill(0), axisCounts = [0, 0, 0, 0];
    for (const word of shuffled(words, random).sort((a, b) => b.length - a.length)) {
      const options = [];
      for (let start = 0; start < size * size; start++) for (const [dr, dc] of directions) {
        const row = Math.floor(start / size), col = start % size;
        const er = row + dr * (word.length - 1), ec = col + dc * (word.length - 1);
        if (er < 0 || ec < 0 || er >= size || ec >= size) continue;
        const cells = Array.from({ length: word.length }, (_, i) => (row + dr * i) * size + col + dc * i);
        if (!cells.every((index, i) => !grid[Math.floor(index / size)][index % size] || grid[Math.floor(index / size)][index % size] === word[i])) continue;
        const axis = dr === 0 ? 0 : dc === 0 ? 1 : dr === dc ? 2 : 3;
        const bit = 1 << axis;
        const crosses = cells.filter(index => occupiedAxes[index] & ~bit).length;
        const parallel = cells.filter(index => occupiedAxes[index] & bit).length;
        const centre = Math.abs((row + er) / 2 - (size - 1) / 2) + Math.abs((col + ec) / 2 - (size - 1) / 2);
        options.push({ cells, axis, rank: crosses * 20 - parallel * 2 - centre * .1 });
      }
      if (!options.length) break;
      // Choose a direction family before choosing a position. A ten-letter
      // word has many more straight positions than diagonal ones, so choosing
      // from all positions together would strongly favour across and down.
      let axes = [...new Set(options.map(option => option.axis))];
      if (!placements.length && word.length >= size - 2) axes = axes.filter(axis => axis < 2);
      const leastUsed = Math.min(...axes.map(axis => axisCounts[axis]));
      const axis = shuffled(axes.filter(axis => axisCounts[axis] === leastUsed), random)[0];
      const candidates = options.filter(option => option.axis === axis);
      const top = Math.max(...candidates.map(option => option.rank));
      const shortlist = candidates.filter(option => option.rank >= top - .35);
      const { cells } = shortlist[Math.floor(random() * shortlist.length)];
      cells.forEach((index, i) => {
        grid[Math.floor(index / size)][index % size] = word[i];
        occupiedAxes[index] |= 1 << axis;
      });
      axisCounts[axis]++;
      placements.push({ word, cells });
    }
    if (placements.length !== count || scan(grid, trie).some(word => !wanted.has(word))) continue;
    const quality = layoutQuality(placements, size);
    if (best && quality.score <= best.score && !quality.good) continue;
    let filled = true;
    const spaces = shuffled(Array.from({ length: size * size }, (_, i) => i).filter(index => !grid[Math.floor(index / size)][index % size]), random);
    for (const index of spaces) {
      const row = Math.floor(index / size), col = index % size;
      let accepted = false;
      for (const letter of shuffled(alphabet, random)) {
        grid[row][col] = letter;
        if (!scan(grid, trie).some(word => !wanted.has(word))) { accepted = true; break; }
      }
      if (!accepted) { filled = false; break; }
    }
    if (filled) {
      const puzzle = { size, grid, words, placements };
      if (quality.good) return puzzle;
      best = { score: quality.score, puzzle };
    }
  }
  // Highly constrained custom banks (for example, eight ten-letter words)
  // can still play even when a fully connected, mixed layout is impossible.
  if (best) return best.puzzle;
  throw new Error('Could not make this wordsearch. Try another grid.');
}
