// Give each existing word alternatives with different meanings. In particular,
// keep near synonyms (e.g. contrite and penitent) out of the same question.
const choiceGroups = [
  'challenge|echo|contrast', 'criticise|echo|contrast', 'dialogue|simile|repetition',
  'tone|narrator|apprentice', 'clerk|bed-curtains|dialogue', 'affectionate|bleak|cautious',
  'appalled|generous|isolated', 'compassionate|defensive|eerie', 'tender|defensive|vulnerable',
  'characterisation|metaphor|direct address', 'connotation|redemption|irony',
  'dehumanise|foreshadow|symbolise', 'evoke|undermine|dehumanise', 'emphasise|dehumanise|imply',
  'imagery|redemption|personification', 'charwoman|ledger|counting-house',
  'comforter|gruel|shilling', 'laundress|undertaker|workhouse', 'want|humbug|comforter',
  'abundant|miserly|forlorn', 'alienated|communal|indignant', 'benevolent|sceptical|oppressive',
  'callous|jovial|receptive', 'complacent|remorseful|exuberant', 'desolate|jovial|dignified',
  'destitute|indifferent|resilient', 'dismissive|melancholy|frugal', 'estranged|grotesque|solemn',
  'forbidding|receptive|materialistic', 'ominous|communal|frugal',
  'allegory|allusion|semantic field', 'cyclical structure|foil|pathos', 'juxtaposition|motif|foil',
  'copper|cravat|half-a-crown', 'milliner|treadmill|Poor Law', 'poulterer|stave|cravat',
  'avaricious|contrite|convivial', 'covetous|penitent|precarious',
].map(line => line.split('|'));

export function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function wordChoices(entry, bank) {
  const key = word => word.trim().toLowerCase().replaceAll('’', "'");
  const answer = key(entry.word);
  const groups = choiceGroups.filter(group => group.includes(answer));
  const related = new Set(groups.flat());
  // A bank can contain many clues for one answer. Only display that answer once.
  const unique = new Map();
  for (const item of bank) {
    const word = key(item.word);
    if (item.level !== entry.level || word === answer
      || (entry.clue && item.clue === entry.clue)) continue;
    if (!unique.has(word)) unique.set(word, item);
  }
  const pool = [...unique.values()];
  const candidates = shuffle(pool.filter(item => related.has(key(item.word))));
  // Newly added CSV entries can play immediately, even before a group is chosen.
  if (candidates.length < 2) candidates.push(...shuffle(pool.filter(item => !related.has(key(item.word)))));
  if (candidates.length < 2) throw new Error('Fog Run needs three different answers at this level.');
  return shuffle([entry, ...candidates.slice(0, 2)]);
}
