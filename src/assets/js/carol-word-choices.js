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
  const groups = choiceGroups.filter(group => group.includes(entry.word));
  const related = new Set(groups.flat());
  const pool = bank.filter(item => item.level === entry.level && item !== entry);
  const candidates = shuffle(pool.filter(item => related.has(item.word)));
  // Newly added CSV entries can play immediately, even before a group is chosen.
  if (candidates.length < 2) candidates.push(...shuffle(pool.filter(item => !related.has(item.word))));
  return shuffle([entry, ...candidates.slice(0, 2)]);
}
