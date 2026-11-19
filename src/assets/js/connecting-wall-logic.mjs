export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const other = Math.floor(random() * (i + 1));
    [result[i], result[other]] = [result[other], result[i]];
  }
  return result;
}

const key = word => word.toLowerCase();

function exclusiveWords(group, groups) {
  const elsewhere = new Set(groups.filter(other => other !== group).flatMap(other => other.words.map(key)));
  return group.words.filter(word => !elsewhere.has(key(word)));
}

function compatibleSet(candidates, selected = [], start = 0) {
  if (selected.length === 4) return selected;
  const needed = 4 - selected.length;
  for (let i = start; i <= candidates.length - needed; i += 1) {
    const next = [...selected, candidates[i]];
    if (next.some(group => exclusiveWords(group, next).length < 4)) continue;
    const found = compatibleSet(candidates, next, i + 1);
    if (found) return found;
  }
  return null;
}

// A displayed word must belong to exactly one of the four selected pools.
// Choose the pools together before sampling their words, so an unlucky sample
// cannot rule out a compatible combination that is present in the bank.
export function dealWall(bank, level, previous = [], random = Math.random) {
  const used = new Set(previous.map(group => group.id));
  const candidates = shuffle(bank, random).sort((a, b) =>
    Math.abs(a.level - level) - Math.abs(b.level - level)
    || Number(used.has(a.id)) - Number(used.has(b.id))
  );
  for (let distance = 0; distance <= 2; distance += 1) {
    const available = candidates.filter(group => Math.abs(group.level - level) <= distance);
    const selected = compatibleSet(available);
    if (!selected) continue;
    return selected.map(group => ({
      id: group.id,
      level: group.level,
      name: group.name,
      words: shuffle(exclusiveWords(group, selected), random).slice(0, 4),
      explanation: group.explanation
    }));
  }
  return null;
}
