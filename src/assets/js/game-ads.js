// Slot positions belong to the page HTML; only their advertised game changes.
export const gameAds = [
  { id: 'theme-revision', title: 'Revise This Theme', image: 'theme-revision', theme: true },
  { id: 'fog-run', title: 'Fog Run', image: 'fog-run', page: 'key-quotes' },
  { id: 'freds-or-dead', title: 'Fred’s or Dead', image: 'freds-or-dead', page: 'key-quotes' },
  { id: 'quote-recall', title: 'Learn the Quotes', image: 'quote-recall', page: 'key-quotes' },
  { id: 'quote-builder', title: 'Build the Quote', image: 'build-the-quote', page: 'key-quotes' },
  { id: 'context-quiz', title: 'Context Quiz', image: 'context', page: 'context' },
  { id: 'plot-order', title: 'Plot Sort', image: 'plot-order', page: 'plot' },
  { id: 'plot-quiz', title: 'For Plottin’', image: 'for-plottin', theme: true },
  { id: 'word-formation', title: 'Corrections', image: 'corrections', page: 'essays' },
  { id: 'word-in-context', title: 'Serve Your Sentence', image: 'serve-your-sentence', page: 'essays' },
  { id: 'hangman', title: 'Hangman', image: 'hangman', page: 'essays' },
  { id: 'crossword', title: 'Never a Crossword', image: 'never-a-crossword', page: 'essays' },
  { id: 'wordsearch', title: 'Wordsearch', image: 'wordsearch', page: 'essays' },
  { id: 'connecting-wall', title: 'Word Wall', image: 'word-wall', page: 'essays' },
  { id: 'essay-jigsaw', title: 'Essay Jigsaw', image: 'essay-jigsaw', page: 'essays' },
  { id: 'earnings-game', title: 'How Much Work?', image: 'how-much-work', page: 'greed' },
  { id: 'analysis-gaps', title: 'Analysis Gaps', image: 'analysis-gaps', theme: true },
];

export function chooseGameAds(slots, random = Math.random) {
  const pinned = new Set(slots.filter(id => id !== 'random'));
  const pool = gameAds.filter(game => game.id !== 'theme-revision' && !pinned.has(game.id));
  for (let index = pool.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  let position = 0;
  return slots.map(id => id === 'random'
    ? pool[position++ % pool.length]
    : gameAds.find(game => game.id === id));
}

export function gameAdUrl(game, themePath) {
  return `${game.theme ? themePath : '/a-christmas-carol/' + game.page}#play-${game.id}`;
}

if (typeof document !== 'undefined') {
  const slots = [...document.querySelectorAll('[data-game-slot]')];
  const choices = chooseGameAds(slots.map(slot => slot.dataset.gameSlot));
  const themePath = location.pathname.replace(/\.html$|\/$/g, '');
  slots.forEach((slot, index) => {
    const game = choices[index];
    if (!game) return;
    const control = slot.querySelector('.game-ad-link');
    const image = control.querySelector('img');
    const source = control.querySelector('source');
    if (control.matches('a')) control.href = gameAdUrl(game, themePath);
    control.dataset.gameTitle = game.title;
    control.setAttribute('aria-label', `Play ${game.title}`);
    image.alt = `Play ${game.title}`;
    image.src = `/assets/pictures/acc/game-${game.image}.jpg`;
    source.srcset = `/assets/pictures/acc/game-${game.image}-landscape.jpg`;
    slot.dataset.game = game.id;
  });
}
