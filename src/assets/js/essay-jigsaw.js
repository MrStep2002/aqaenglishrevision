(() => {
  const puzzles = [
    {
      question: 'How does Dickens show that Scrooge keeps other people at a distance?',
      sentences: [
        'Dickens introduces Scrooge as a man who keeps other people at a distance.',
        'He captures that isolation in the simile “solitary as an oyster”.',
        'The oyster’s hard shell suggests that Scrooge has a barrier between himself and everyone else.',
        'That barrier makes his later willingness to spend Christmas with Fred all the more striking.',
      ],
      hints: [
        'Start with the sentence that answers the question without referring back to anything.',
        'Find the sentence that picks up the idea of isolation and introduces the quotation.',
        'Which sentence explains the image in that quotation?',
        'Finish with the sentence that refers back to the barrier and contrasts it with the ending.',
      ],
      explanation: 'The point introduces isolation. The quotation gives you an image to analyse, and “that barrier” takes your analysis into the contrast with the ending.',
    },
    {
      question: 'How does Dickens criticise Scrooge’s attitude to poverty?',
      sentences: [
        'Dickens presents Scrooge’s attitude to poverty as cruel and impersonal.',
        'That attitude is clear when Scrooge talks about decreasing “the surplus population”.',
        'The word “surplus” makes people sound like stock a business has no use for.',
        'Dickens challenges that way of counting people when the Ghost of Christmas Present repeats Scrooge’s own words about the surplus population in reference to Tiny Tim.',
      ],
      hints: [
        'Open with a point about Scrooge’s attitude to poverty.',
        'Look for the sentence that refers back to that attitude and introduces a quotation.',
        'Now find the sentence that zooms in on one word from the quotation.',
        'End with the moment that challenges the way of thinking you have just explained.',
      ],
      explanation: '“That attitude” connects the quotation to the point. “Surplus” gives you a specific word to analyse, which makes the later reference to Tiny Tim more pointed.',
    },
    {
      question: 'How does Dickens use Fezziwig to show the influence of a good employer?',
      sentences: [
        'Dickens uses Fezziwig to show how an employer can make other people’s lives happier.',
        'Scrooge remembers that his old employer gave his staff a Christmas party.',
        'Looking back on that party, he says that the happiness Fezziwig gives is “quite as great as if it had cost a fortune”.',
        'The comparison with a fortune shows that Scrooge is beginning to recognise value beyond money.',
        'That insight prepares us for his decision to use his position to help Bob Cratchit at the end.',
      ],
      hints: [
        'Find the sentence that makes a point about what a good employer can do.',
        'Next, look for the scene that puts that idea into action.',
        'Find Scrooge’s reaction to the party. It brings in the quotation.',
        'Look for the sentence that explains the comparison with a fortune.',
        'End by linking Scrooge’s insight to a decision he makes later.',
      ],
      explanation: 'The party gives “that party” a clear reference. Scrooge’s comparison then gives you something to analyse, and “that insight” carries the argument into the ending.',
    },
    {
      question: 'How does Dickens use Belle to show what Scrooge’s greed costs him?',
      sentences: [
        'Dickens uses Belle’s broken engagement to show what Scrooge’s greed has cost him.',
        'When she explains why she is leaving him, Belle tells Scrooge that “a golden idol” has replaced her.',
        'The word “idol” suggests that Scrooge now gives money the devotion he once gave Belle.',
        'The Ghost of Christmas Past then shows Scrooge what that choice cost him by taking him to Belle’s family home.',
        'Seeing her with her children makes the personal cost of his devotion to money painfully clear.',
      ],
      hints: [
        'Open with a point that names Belle and answers the question.',
        'Look for Belle’s explanation of why the engagement is ending.',
        'Now find the sentence that zooms in on a word from her explanation.',
        'Find the sentence where the Ghost shows the consequences of that choice.',
        'Finish with the effect of what Scrooge sees in Belle’s home.',
      ],
      explanation: 'Belle’s words let you explain what Scrooge chose. “That choice” then connects the close analysis of “idol” to its consequences in the next vision.',
    },
    {
      question: 'How does Dickens use Ignorance and Want to warn against neglect?',
      sentences: [
        'Dickens presents the suffering of poor children as a problem for the whole of society.',
        'The Ghost of Christmas Present makes that suffering visible when he reveals Ignorance and Want beneath his robe.',
        'The Spirit describes the children as “Man’s”, making their condition a human responsibility.',
        'He then warns that the boy has “Doom” written on his brow.',
        'That warning turns the children’s suffering into a threat to the society that has ignored them.',
        'By making the danger a collective one, Dickens leaves his readers with some of the same responsibility that he places on Scrooge.',
      ],
      hints: [
        'Start with the main point about who is responsible for the problem.',
        'Find the moment that makes the suffering in that point visible.',
        'After the children appear, look for the quotation about who they belong to.',
        'Find the second thing the Spirit says about the children, this time about the boy.',
        'Look for the sentence that explains what the warning about Doom means for society.',
        'Finish by connecting that danger to the responsibility of Dickens’s readers.',
      ],
      explanation: 'The paragraph moves from the children and who is responsible for them to the danger for society. “That warning” and “the danger” carry the idea from the Spirit’s words to the reader.',
    },
  ];

  const game = document.getElementById('essay-jigsaw');
  const launch = document.getElementById('play-essay-jigsaw');
  const stage = game.querySelector('.jigsaw-stage');
  const workbench = game.querySelector('.jigsaw-workbench');
  const zone = game.querySelector('.jigsaw-zone');
  const answer = game.querySelector('.jigsaw-answer');
  const bank = game.querySelector('.jigsaw-bank');
  const placeholder = game.querySelector('.jigsaw-placeholder');
  const template = game.querySelector('#jigsaw-tile');
  const question = game.querySelector('#jigsaw-question');
  const guide = game.querySelector('.jigsaw-guide');
  const feedback = game.querySelector('.jigsaw-feedback');
  const status = game.querySelector('[role="status"]');
  const solved = game.querySelector('.jigsaw-solved');
  const model = game.querySelector('.jigsaw-model');
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
    if (order.every((position, index) => position === index)) order.push(order.shift());
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
    tile.firstElementChild.setAttribute('aria-describedby', placed ? 'jigsaw-return' : 'jigsaw-place');
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
    return [...answer.children].findIndex((tile, index) => Number(tile.dataset.position) !== index);
  }

  hint.addEventListener('click', () => {
    const mismatch = mismatchPosition();
    const position = mismatch === -1 ? answer.childElementCount : mismatch;
    showFeedback(puzzle.hints[position] ?? 'The sentences are in order. Press Check order.', answer.children[mismatch]);
  });

  check.addEventListener('click', () => {
    finishDrag();
    const mismatch = mismatchPosition();
    if (mismatch !== -1) {
      showFeedback(`Try sentence ${mismatch + 1} again. ${puzzle.hints[mismatch]}`, answer.children[mismatch]);
      return;
    }
    model.textContent = puzzle.sentences.join(' ');
    solved.querySelector('.jigsaw-explanation').textContent = puzzle.explanation;
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
})();
