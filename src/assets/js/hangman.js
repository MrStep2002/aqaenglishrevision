(() => {
  const launch = document.querySelector('#play-hangman');
  const game = document.querySelector('#hangman');
  if (!launch || !game) return;

  const word = game.querySelector('.hangman-word');
  const feedback = game.querySelector('.hangman-feedback');
  const next = game.querySelector('.hangman-next');
  const hint = game.querySelector('.hangman-hint');
  const hintText = game.querySelector('.hangman-hint-text');
  const savedText = game.querySelector('.hangman-saved');
  const keys = game.querySelector('.hangman-keys');
  const levels = [...game.querySelectorAll('[data-level]')];
  const lives = [...game.querySelectorAll('.hangman-life')];
  const chances = game.querySelector('.hangman-chances');
  const status = game.querySelector('.hangman-status');
  const items = JSON.parse(game.querySelector('.quiz-bank').textContent);
  const isLetter = character => /\p{L}/u.test(character);

  let level = 1;
  let deck = [];
  let index = 0;
  let misses = 0;
  let finished = false;
  let saved = 0;
  const found = new Set();

  for (let code = 65; code <= 90; code += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.letter = String.fromCharCode(code);
    button.textContent = button.dataset.letter;
    button.addEventListener('click', () => guess(button.dataset.letter));
    keys.append(button);
  }

  function shuffle(list) {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
      const other = Math.floor(Math.random() * (i + 1));
      [result[i], result[other]] = [result[other], result[i]];
    }
    return result;
  }

  function current() {
    return deck[index];
  }

  function paintWord(revealAll, newLetter) {
    const tokens = current().word.split(/\s+/);
    const widest = Math.max(...tokens.map(token => [...token].length));
    const lineLength = Math.max(widest, Math.ceil([...tokens.join('')].length / 2));
    word.style.setProperty('--hangman-word-width', lineLength * 1.35);
    word.setAttribute('aria-label', [...current().word].map(character =>
      isLetter(character) && !revealAll && !found.has(character.toLowerCase()) ? 'blank' : character
    ).join(' '));
    word.replaceChildren(...tokens.map(token => {
      const group = document.createElement('span');
      group.className = 'hangman-token';
      group.setAttribute('aria-hidden', 'true');
      [...token].forEach(character => {
        const slot = document.createElement('span');
        const letter = isLetter(character);
        slot.className = letter ? 'hangman-slot' : 'hangman-mark';
        if (letter && (revealAll || found.has(character.toLowerCase()))) {
          slot.textContent = character;
          slot.classList.add('is-revealed');
          if (character.toLowerCase() === newLetter) slot.classList.add('is-new');
        }
        else if (!letter) slot.textContent = character;
        group.append(slot);
      });
      return group;
    }));
  }

  function updateMouse() {
    const used = game.dataset.state === 'won' ? 0 : misses;
    const mist = used / lives.length;
    game.style.setProperty('--mouse-opacity', 1 - mist);
    game.style.setProperty('--mouse-blur', mist * 3 + 'px');
    game.style.setProperty('--fog-opacity', mist);
    lives.forEach((life, index) => life.classList.toggle('is-spent', index < used));
    const remaining = lives.length - used;
    chances.textContent = `${remaining} ${remaining === 1 ? 'chance' : 'chances'} left`;
  }

  function showWord() {
    misses = 0;
    finished = false;
    found.clear();
    game.dataset.state = 'playing';
    updateMouse();
    status.textContent = '';
    feedback.textContent = '';
    next.hidden = true;
    hint.hidden = !current().definition;
    hintText.hidden = true;
    hintText.textContent = '';
    [...keys.children].forEach(button => {
      button.disabled = false;
      button.classList.remove('is-hit', 'is-miss');
    });
    paintWord(false);
    levels.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.level) === level)));
  }

  function startLevel(previousWord) {
    deck = shuffle(items.filter(item => item.level === level));
    if (deck.length > 1 && deck[0].word === previousWord) {
      [deck[0], deck[1]] = [deck[1], deck[0]];
    }
    index = 0;
    showWord();
  }

  function updateSaved() {
    savedText.textContent = `Saved ${saved}`;
  }

  function finish(message) {
    finished = true;
    [...keys.children].forEach(button => { button.disabled = true; });
    hint.hidden = true;
    hintText.hidden = true;
    feedback.textContent = message;
    next.hidden = false;
    next.focus();
  }

  function revealHint() {
    if (finished || !current().definition) return;
    hint.hidden = true;
    hintText.hidden = false;
    hintText.textContent = current().definition;
  }

  function win() {
    saved += 1;
    updateSaved();
    game.dataset.state = 'won';
    updateMouse();
    chances.textContent = 'Safe and sound';
    finish(current().definition || '');
  }

  function lose() {
    game.dataset.state = 'lost';
    chances.textContent = 'Lost in the fog';
    paintWord(true);
    finish(current().definition || '');
  }

  function guess(letter) {
    if (finished || !game.open) return;
    const button = keys.querySelector(`[data-letter="${letter.toUpperCase()}"]`);
    if (!button || button.disabled) return;
    button.disabled = true;
    const hit = [...current().word].some(character => character.toLowerCase() === letter.toLowerCase());
    if (hit) {
      button.classList.add('is-hit');
      found.add(letter.toLowerCase());
      paintWord(false, letter.toLowerCase());
      status.textContent = letter.toUpperCase() + ' is in the word.';
      const complete = [...current().word].filter(isLetter).every(character => found.has(character.toLowerCase()));
      if (complete) win();
      return;
    }
    button.classList.add('is-miss');
    misses += 1;
    updateMouse();
    status.textContent = letter.toUpperCase() + ' is not in the word. ' + chances.textContent + '.';
    if (misses === lives.length) lose();
  }

  function advance() {
    const previousWord = current().word;
    index += 1;
    if (index === deck.length) startLevel(previousWord);
    else showWord();
  }

  function openGame() {
    launch.focus({ preventScroll: true });
    if (!deck.length) startLevel();
    if (!game.open) game.showModal();
    (finished ? next : game).focus({ preventScroll: true });
  }

  launch.addEventListener('click', openGame);
  game.addEventListener('close', () => launch.focus());
  window.addEventListener('keydown', event => {
    if (!game.open || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target.closest && event.target.closest('input, textarea')) return;
    if (!/^[a-z]$/i.test(event.key)) return;
    event.preventDefault();
    guess(event.key);
  });
  levels.forEach(button => button.addEventListener('click', () => {
    const selected = Number(button.dataset.level);
    if (selected === level) return;
    level = selected;
    saved = 0;
    updateSaved();
    startLevel();
  }));
  next.addEventListener('click', advance);
  hint.addEventListener('click', revealHint);
  updateSaved();
})();
