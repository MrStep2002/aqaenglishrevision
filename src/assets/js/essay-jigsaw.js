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
  ];

  const game = document.getElementById('essay-jigsaw');
  const launch = document.getElementById('play-essay-jigsaw');
  const list = game.querySelector('ol');
  const question = game.querySelector('.jigsaw-question');
  const feedback = game.querySelector('.plot-feedback');
  const check = game.querySelector('.plot-check');
  const next = game.querySelector('.jigsaw-next');
  let round = 0;

  function updateArrows() {
    [...list.children].forEach(row => {
      const [up, down] = row.querySelectorAll('button');
      up.setAttribute('aria-disabled', !row.previousElementSibling);
      down.setAttribute('aria-disabled', !row.nextElementSibling);
    });
  }

  function showPuzzle() {
    const puzzle = puzzles[round];
    question.textContent = puzzle.question;
    const order = [0, 1, 2, 3];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.every((value, index) => value === index)) [order[0], order[1]] = [order[1], order[0]];
    list.replaceChildren(...order.map(index => {
      const row = document.createElement('li');
      row.dataset.position = index;
      row.style.cursor = 'auto';
      const sentence = document.createElement('span');
      sentence.textContent = puzzle.sentences[index];
      const controls = document.createElement('div');
      controls.className = 'plot-move';
      for (const direction of ['up', 'down']) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = direction === 'up' ? '↑' : '↓';
        button.setAttribute('aria-label', 'Move ' + direction + ': ' + sentence.textContent);
        button.addEventListener('click', () => {
          const neighbour = direction === 'up' ? row.previousElementSibling : row.nextElementSibling;
          if (!neighbour) return;
          if (direction === 'up') neighbour.before(row);
          else neighbour.after(row);
          feedback.textContent = '';
          updateArrows();
          button.focus();
        });
        controls.append(button);
      }
      row.append(sentence, controls);
      return row;
    }));
    updateArrows();
    check.hidden = false;
    next.hidden = true;
    feedback.textContent = '';
  }

  launch.addEventListener('click', () => {
    round = 0;
    showPuzzle();
    game.showModal();
    question.focus();
  });
  check.addEventListener('click', () => {
    const firstMismatch = [...list.children].findIndex((row, index) => Number(row.dataset.position) !== index);
    if (firstMismatch !== -1) {
      feedback.textContent = puzzles[round].hints[firstMismatch];
      return;
    }
    feedback.textContent = 'Correct. ' + puzzles[round].explanation;
    list.querySelectorAll('button').forEach(button => { button.disabled = true; });
    check.hidden = true;
    next.textContent = round === puzzles.length - 1 ? 'Play again' : 'Next paragraph';
    next.hidden = false;
    next.focus();
  });
  next.addEventListener('click', () => {
    round = (round + 1) % puzzles.length;
    showPuzzle();
    question.focus();
  });
})();
