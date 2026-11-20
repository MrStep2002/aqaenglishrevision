export const levelNames = ['Foundation', 'Intermediate', 'Advanced'];
export const quotePools = [10, 25, 50];
export const formatNames = {
  'quote-gap': 'Complete the Quote',
  'quote-order': 'Build the Quote',
  plot: 'Plot Quiz', context: 'Context Quiz',
  analysis: 'Analysis Gaps', corrections: 'Corrections',
  vocabulary: 'Serve Your Sentence', jigsaw: 'Essay Jigsaw',
};
export const normalise = value => value.trim().toLowerCase().replaceAll('’', "'");

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function createPools(bank, level) {
  if (![1, 2, 3].includes(level)) throw new Error('Choose a ghost level from 1 to 3.');
  const themed = items => items.filter(item => item.themes?.includes(bank.theme));
  const levelled = items => themed(items).filter(item => item.level === levelNames[level - 1]);
  const quotes = themed(bank.quotes).filter(item => item.pool <= quotePools[level - 1]);
  return {
    'quote-gap': quotes.filter(item => item.blanks.length),
    'quote-order': quotes.filter(item => item.tiles.length > 1),
    plot: themed(bank.plot), context: themed(bank.context),
    analysis: levelled(bank.analysis), corrections: levelled(bank.corrections),
    vocabulary: bank.vocabulary.filter(item => item.level === level),
    jigsaw: levelled(bank.jigsaw),
  };
}

function contentKey(item) {
  const text = item.quote || item.analysis || item.sentences?.join(' ') || item.question || item.example;
  return normalise(text).replace(/[^\p{L}\p{N}]/gu, '');
}

export function createSession(bank, level, random = Math.random) {
  const pools = createPools(bank, level);
  const kinds = Object.keys(pools).filter(kind => pools[kind].length);
  if (!kinds.length) throw new Error('There are no exercises for this theme and level.');
  const decks = new Map();
  const previousBlanks = new Map();
  let formats = [], lastKind, lastContent;
  return {
    pools,
    next() {
      if (!formats.length) {
        formats = shuffle(kinds, random);
        if (formats.length > 1 && formats[0] === lastKind) formats.push(formats.shift());
      }
      const kind = formats.shift();
      if (!decks.get(kind)?.length) decks.set(kind, shuffle(pools[kind], random));
      const deck = decks.get(kind);
      const different = deck.findIndex(item => contentKey(item) !== lastContent);
      if (different > 0) [deck[0], deck[different]] = [deck[different], deck[0]];
      const item = deck.shift();
      lastKind = kind;
      lastContent = contentKey(item);
      if (kind === 'quote-gap') {
        const previous = previousBlanks.get(item.quote);
        const alternatives = item.blanks.filter(blank => blank !== previous);
        const blank = shuffle(alternatives.length ? alternatives : item.blanks, random)[0];
        previousBlanks.set(item.quote, blank);
        return { kind, item, prompt: blank.masked, answer: blank.answer, choices: shuffle(blank.choices, random) };
      }
      if (kind === 'vocabulary') {
        const example = level === 1 && item.fogEasy ? item.fogEasy : item;
        const others = shuffle(pools.vocabulary.filter(other => normalise(other.word) !== normalise(item.word)), random).slice(0, 3);
        return {
          kind, item, answer: item.word,
          prompt: example.example.slice(0, example.start) + '_____' + example.example.slice(example.start + example.length),
          completedPrompt: example.example,
          choices: shuffle([item.word, ...others.map(other => other.word)], random),
        };
      }
      if (kind === 'plot' || kind === 'context') {
        return { kind, item, prompt: item.question, answer: item.choices[0], choices: shuffle(item.choices, random) };
      }
      return { kind, item };
    },
  };
}
