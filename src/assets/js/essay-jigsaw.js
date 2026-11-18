document.querySelectorAll('dialog[data-paragraph-game]').forEach(game => {
  const launch = document.getElementById('play-' + game.id);
  if (!launch) return;
  const puzzles = JSON.parse(game.querySelector('.jigsaw-data').textContent);
  const stage = game.querySelector('.jigsaw-stage');
  const workbench = game.querySelector('.jigsaw-workbench');
  const zone = game.querySelector('.jigsaw-zone');
  const answer = game.querySelector('.jigsaw-answer');
  const bank = game.querySelector('.jigsaw-bank');
  const placeholder = game.querySelector('.jigsaw-placeholder');
  const template = game.querySelector('.jigsaw-tile-template');
  const question = game.querySelector('.jigsaw-question');
  const guide = game.querySelector('.jigsaw-guide');
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
  let drag;
  let suppressClick = false;

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
    placeholder.textContent = answer.childElementCount ? 'Drop the next sentence here' : 'Drop sentences here';
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
    finishDrag();
    // As in Build the sentence, refill the shuffled deck at the end of each pass.
    if (!deck.length) {
      deck = shuffle(puzzles);
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
    guide.hidden = false;
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

  function moveTile(tile, destination, before = null) {
    if (tile.parentElement === destination && tile.nextElementSibling === before) return;
    destination.insertBefore(tile, before);
    const placed = destination === answer;
    tile.firstElementChild.setAttribute('aria-describedby', game.id + (placed ? '-return' : '-place'));
    clearFeedback();
    updateControls();
    if (placed) {
      const position = [...answer.children].indexOf(tile) + 1;
      status.textContent = `Sentence placed at position ${position}.`;
      if (!reducedMotion.matches) {
        tile.getAnimations().forEach(animation => animation.cancel());
        tile.animate([{ opacity: .65, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }],
          { duration: 180, easing: 'ease-out' });
      }
    } else {
      status.textContent = 'Sentence returned.';
    }
  }

  // Click, tap, Enter and Space all use the same placement rule as the reference game.
  workbench.addEventListener('click', event => {
    const tile = event.target.closest('.jigsaw-tile');
    if (!tile || (event.detail && suppressClick)) return;
    finishDrag();
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
    if (position === puzzle.sentences.length) return 'The sentences are in order. Press Check order.';
    return puzzle.hints[position] || (position === 0 ? 'Which sentence introduces the main idea?' :
      'Look for the sentence that follows on from the one before it.');
  }

  hint.addEventListener('click', () => {
    const mismatch = mismatchPosition();
    const position = mismatch === -1 ? answer.childElementCount : mismatch;
    showFeedback(hintFor(position), answer.children[mismatch]);
  });

  check.addEventListener('click', () => {
    finishDrag();
    const mismatch = mismatchPosition();
    if (mismatch !== -1) {
      showFeedback(`Try sentence ${mismatch + 1} again. ${hintFor(mismatch)}`, answer.children[mismatch]);
      return;
    }
    model.textContent = puzzle.sentences.join(' ');
    explanation.textContent = puzzle.explanation;
    explanation.hidden = !puzzle.explanation;
    clearFeedback();
    status.textContent = 'Paragraph complete.';
    guide.hidden = true;
    workbench.hidden = true;
    solved.hidden = false;
    hint.hidden = true;
    check.hidden = true;
    next.hidden = false;
    stage.scrollTop = 0;
    model.focus({ preventScroll: true });
  });

  function dropAt(x, y) {
    if (!zone.contains(document.elementFromPoint(x, y))) return;
    // A drop over the answer can insert between sentences. The open gap appends.
    const before = [...answer.children].find(tile => {
      if (tile === drag.tile) return false;
      const rect = tile.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });
    return { before: before ?? null };
  }

  function paintDrag() {
    const { x, y, ghost, offsetX, offsetY, width } = drag;
    const bounds = stage.getBoundingClientRect();
    if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
      const edge = Math.min(44, bounds.height / 4);
      if (y < bounds.top + edge) stage.scrollTop -= (bounds.top + edge - y) / 4;
      if (y > bounds.bottom - edge) stage.scrollTop += (y - bounds.bottom + edge) / 4;
    }
    const left = Math.max(bounds.left + 4, Math.min(x - offsetX, bounds.right - width - 4));
    ghost.style.transform = `translate3d(${left}px, ${y - offsetY}px, 0)`;
    const destination = dropAt(x, y);
    zone.toggleAttribute('data-drop', Boolean(destination));
    zone.toggleAttribute('data-append', destination?.before === null);
    if (drag.before !== destination?.before) {
      drag.before?.removeAttribute('data-before');
      drag.before = destination?.before;
      drag.before?.setAttribute('data-before', '');
    }
    drag.frame = requestAnimationFrame(paintDrag);
  }

  workbench.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || drag) return;
    suppressClick = false;
    const piece = event.target.closest('.jigsaw-piece');
    // On touchscreens the sentence text remains a surface for scrolling the board.
    if (!piece || (event.pointerType === 'touch' && !event.target.closest('.jigsaw-grip'))) return;
    piece.setPointerCapture(event.pointerId);
    drag = { piece, tile: piece.parentElement, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
  });

  workbench.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (drag.ghost || Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return;
    const rect = drag.piece.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'jigsaw-piece jigsaw-ghost';
    ghost.textContent = drag.tile.querySelector('.jigsaw-text').textContent;
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.width = rect.width + 'px';
    game.append(ghost);
    drag.ghost = ghost;
    drag.width = rect.width;
    drag.offsetX = drag.startX - rect.left;
    drag.offsetY = drag.startY - rect.top;
    drag.tile.setAttribute('data-dragging', '');
    paintDrag();
  });

  function finishDrag(event) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    const { piece, tile, ghost, frame, before, pointerId } = drag;
    const released = ghost && event?.type === 'pointerup';
    const destination = released ? dropAt(event.clientX, event.clientY) : undefined;
    drag = undefined;
    if (released) suppressClick = true;
    if (piece.hasPointerCapture(pointerId)) piece.releasePointerCapture(pointerId);
    cancelAnimationFrame(frame);
    ghost?.remove();
    zone.removeAttribute('data-drop');
    zone.removeAttribute('data-append');
    before?.removeAttribute('data-before');
    tile.removeAttribute('data-dragging');
    if (destination) moveTile(tile, answer, destination.before);
  }

  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    workbench.addEventListener(event, finishDrag);
  }
  game.addEventListener('close', () => finishDrag());
  launch.addEventListener('click', showPuzzle);
  next.addEventListener('click', showPuzzle);
});
