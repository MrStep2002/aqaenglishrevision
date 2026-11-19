(() => {
  const launch = document.querySelector('#play-word-in-context');
  const game = document.querySelector('#word-in-context');
  if (!launch || !game) return;

  const prompt = game.querySelector('.quote-prompt');
  const options = game.querySelector('.quote-options');
  const feedback = game.querySelector('.quote-feedback');
  const next = game.querySelector('.quote-next');
  const meter = game.querySelector('meter');
  const percent = game.querySelector('.quote-percent');
  const levels = [...game.querySelectorAll('[data-level]')];
  const items = JSON.parse(game.querySelector('.quiz-bank').textContent);

  let level = 1;
  let deck = [];
  let index = 0;
  let answered = false;
  let lastCorrect = false;
  let correctCount = 0;
  let attempts = 0;
  let advanceTimer;

  function shuffle(list) {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function sentence(item, reveal) {
    const gap = reveal ? item.example.slice(item.start, item.start + item.length) : '_____';
    return item.example.slice(0, item.start) + gap + item.example.slice(item.start + item.length);
  }

  function resetScore() {
    correctCount = 0;
    attempts = 0;
    meter.value = 0;
    percent.textContent = '—';
  }

  function showQuestion() {
    clearTimeout(advanceTimer);
    answered = false;
    lastCorrect = false;
    feedback.textContent = '';
    next.hidden = true;
    const item = deck[index];
    const choices = shuffle([
      item,
      ...shuffle(deck.filter(entry => entry.word !== item.word)).slice(0, 3),
    ]);
    prompt.hidden = false;
    prompt.textContent = sentence(item);
    options.hidden = false;
    options.replaceChildren(...choices.map(choice => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = choice.word;
      button.addEventListener('click', () => check(choice.word));
      return button;
    }));
    if (game.open) prompt.focus();
  }

  function startLevel(previousWord) {
    deck = shuffle(items.filter(item => item.level === level));
    if (deck.length > 1 && deck[0].word === previousWord) {
      [deck[0], deck[1]] = [deck[1], deck[0]];
    }
    index = 0;
    levels.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.level) === level)));
    showQuestion();
  }

  function advance() {
    const previousWord = deck[index].word;
    index += 1;
    if (index === deck.length) startLevel(previousWord);
    else showQuestion();
  }

  function check(guess) {
    if (answered) return;
    const item = deck[index];
    const correct = guess === item.word;
    attempts += 1;
    if (correct) correctCount += 1;
    const accuracy = Math.round(correctCount / attempts * 100);
    meter.value = accuracy;
    percent.textContent = accuracy + '%';
    answered = true;
    lastCorrect = correct;
    prompt.textContent = sentence(item, true);
    options.hidden = true;
    feedback.textContent = correct
      ? 'Correct! ' + item.definition
      : `The answer was “${item.word}”. ${item.definition}`;
    if (correct) {
      prompt.focus();
      advanceTimer = setTimeout(advance, 750);
    } else {
      next.hidden = false;
      next.focus();
    }
  }

  launch.addEventListener('click', () => {
    game.showModal();
    if (!deck.length) startLevel();
    else if (!answered) prompt.focus();
  });

  game.addEventListener('close', () => {
    clearTimeout(advanceTimer);
    if (answered && lastCorrect) advance();
    launch.focus();
  });

  levels.forEach(button => button.addEventListener('click', () => {
    const selected = Number(button.dataset.level);
    if (selected === level) return;
    level = selected;
    resetScore();
    startLevel();
  }));

  next.addEventListener('click', advance);
})();
