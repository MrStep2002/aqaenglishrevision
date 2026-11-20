document.querySelectorAll('dialog[data-paragraph-game]').forEach(game => {
  const launch = document.getElementById('play-' + game.id);
  if (!launch) return;
  const puzzles = JSON.parse(game.querySelector('.jigsaw-data').textContent);
  const levelGroup = game.querySelector('.jigsaw-levels');
  const levelControls = [...game.querySelectorAll('[data-jigsaw-level]')];
  const levels = ['Foundation', 'Intermediate', 'Advanced'].filter(level => puzzles.some(puzzle => puzzle.level === level));
  const stage = game.querySelector('.jigsaw-stage');
  const workbench = game.querySelector('.jigsaw-workbench');
  const answer = game.querySelector('.jigsaw-answer');
  const bank = game.querySelector('.jigsaw-bank');
  const placeholder = game.querySelector('.jigsaw-placeholder');
  const template = game.querySelector('.jigsaw-tile-template');
  const question = game.querySelector('.jigsaw-question');
  const feedback = game.querySelector('.jigsaw-feedback');
  const status = game.querySelector('[role="status"]');
  const solved = game.querySelector('.jigsaw-solved');
  const model = game.querySelector('.jigsaw-model');
  const explanation = game.querySelector('.jigsaw-explanation');
  const hint = game.querySelector('.jigsaw-hint');
  const check = game.querySelector('.jigsaw-check');
  const next = game.querySelector('.jigsaw-next');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let deck = [];
  let puzzle;
  let level = levels[0] || null;

  function updateLevels() {
    if (levelGroup) levelGroup.hidden = !levels.length;
    levelControls.forEach(control => {
      control.hidden = !levels.includes(control.dataset.jigsawLevel);
      control.setAttribute('aria-pressed', String(control.dataset.jigsawLevel === level));
    });
  }
  updateLevels();

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function makeTile(position) {
    const tile = template.content.firstElementChild.cloneNode(true);
    tile.dataset.position = position;
    tile.querySelector('.jigsaw-text').textContent = puzzle.sentences[position];
    return tile;
  }

  function updateControls() {
    const complete = !bank.childElementCount;
    check.disabled = !complete;
    placeholder.hidden = complete;
    placeholder.textContent = answer.childElementCount ? 'Select the next piece below' : 'Select a piece below to start';
  }

  function clearFeedback() {
    feedback.hidden = true;
    answer.querySelector('[data-review]')?.removeAttribute('data-review');
  }

  function showFeedback(message, tile) {
    clearFeedback();
    feedback.textContent = message;
    feedback.hidden = false;
    status.textContent = message;
    if (tile) {
      tile.setAttribute('data-review', '');
      tile.scrollIntoView({ block: 'nearest' });
    }
  }

  function showPuzzle() {
    // As in Build the sentence, refill the shuffled deck at the end of each pass.
    if (!deck.length) {
      deck = shuffle(level ? puzzles.filter(puzzle => puzzle.level === level) : puzzles);
      if (deck.length > 1 && deck[0] === puzzle) deck.push(deck.shift());
    }
    puzzle = deck.shift();
    const order = shuffle(puzzle.sentences.map((_, position) => position));
    if (order.every((position, index) => puzzle.sentences[position] === puzzle.sentences[index])) {
      order.push(order.shift());
    }
    question.textContent = puzzle.question;
    answer.replaceChildren();
    bank.replaceChildren(...order.map(makeTile));
    clearFeedback();
    status.textContent = '';
    solved.hidden = true;
    workbench.hidden = false;
    hint.hidden = false;
    check.hidden = false;
    next.hidden = true;
    updateControls();
    if (!game.open) game.showModal();
    stage.scrollTop = 0;
    question.focus({ preventScroll: true });
  }

  function moveTile(tile, destination) {
    destination.append(tile);
    const placed = destination === answer;
    tile.firstElementChild.setAttribute('aria-describedby', game.id + (placed ? '-return' : '-place'));
    clearFeedback();
    updateControls();
    if (placed) {
      const position = [...answer.children].indexOf(tile) + 1;
      status.textContent = `Piece placed at position ${position}.`;
      if (!reducedMotion.matches) {
        tile.getAnimations().forEach(animation => animation.cancel());
        tile.animate([{ opacity: .65, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }],
          { duration: 180, easing: 'ease-out' });
      }
    } else {
      status.textContent = 'Piece returned.';
    }
  }

  workbench.addEventListener('click', event => {
    const piece = event.target.closest('.jigsaw-piece');
    if (!piece) return;
    const tile = piece.parentElement;
    const destination = tile.parentElement === bank ? answer : bank;
    const neighbour = tile.nextElementSibling || tile.previousElementSibling;
    moveTile(tile, destination);
    const focus = neighbour?.firstElementChild || (destination === answer ? check : tile.firstElementChild);
    focus.focus({ preventScroll: true });
    if (event.detail === 0) focus.scrollIntoView({ block: 'nearest' });
  });

  function mismatchPosition() {
    return [...answer.children].findIndex((tile, index) => puzzle.sentences[Number(tile.dataset.position)] !== puzzle.sentences[index]);
  }

  function hintFor(position) {
    if (position === puzzle.sentences.length) return 'The pieces are in order. Press Check order.';
    return puzzle.hints[position] || (position === 0 ? 'Which piece introduces the main idea?' :
      'Look for the piece that follows on from the one before it.');
  }

  hint.addEventListener('click', () => {
    const mismatch = mismatchPosition();
    const position = mismatch === -1 ? answer.childElementCount : mismatch;
    showFeedback(hintFor(position), answer.children[mismatch]);
  });

  check.addEventListener('click', () => {
    const mismatch = mismatchPosition();
    if (mismatch !== -1) {
      showFeedback(`Try piece ${mismatch + 1} again. ${hintFor(mismatch)}`, answer.children[mismatch]);
      return;
    }
    model.textContent = puzzle.sentences.join(' ');
    explanation.textContent = puzzle.explanation;
    explanation.hidden = !puzzle.explanation;
    clearFeedback();
    status.textContent = 'Paragraph complete.';
    workbench.hidden = true;
    solved.hidden = false;
    hint.hidden = true;
    check.hidden = true;
    next.hidden = false;
    stage.scrollTop = 0;
    model.focus({ preventScroll: true });
  });

  launch.addEventListener('click', showPuzzle);
  next.addEventListener('click', showPuzzle);
  levelControls.forEach(control => control.addEventListener('click', () => {
    const selected = control.dataset.jigsawLevel;
    if (selected === level || !levels.includes(selected)) return;
    level = selected;
    deck = [];
    updateLevels();
    showPuzzle();
  }));
});
