(() => {
  const launch = document.querySelector('#play-analysis-gaps');
  const game = document.querySelector('.analysis-gaps');
  const levels = [...game.querySelectorAll('[data-level]')];
  const passage = game.querySelector('.analysis-gaps-passage');
  const bank = game.querySelector('.analysis-gaps-bank');
  const feedback = game.querySelector('.analysis-gaps-feedback');
  const corrections = game.querySelector('.analysis-gaps-corrections');
  const check = game.querySelector('.analysis-gaps-check');
  const next = game.querySelector('.analysis-gaps-next');
  const items = JSON.parse(document.getElementById('analysis-gaps-data').textContent);

  let level = levels[0].dataset.level;
  let deck = [];
  let position = 0;
  let selected = 0;
  let answers = [];
  let slots = [];
  let choices = [];
  let advanceTimer;

  function shuffle(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  }

  function button(label, onClick) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.addEventListener('click', onClick);
    return element;
  }

  function update() {
    slots.forEach((slot, index) => {
      slot.textContent = answers[index] || `[${index + 1}]`;
      slot.setAttribute('aria-label', `Gap ${index + 1}: ${answers[index] || 'empty'}`);
      slot.setAttribute('aria-pressed', String(index === selected));
    });
    choices.forEach(choice => { choice.disabled = answers.includes(choice.textContent); });
    check.disabled = answers.includes('');
  }

  function selectWord(word) {
    if (!answers.includes('')) return;
    answers[selected] = word;
    const following = answers.findIndex((answer, index) => index > selected && !answer);
    const firstEmpty = answers.indexOf('');
    if (firstEmpty !== -1) selected = following === -1 ? firstEmpty : following;
    update();
    if (check.disabled) choices.find(choice => !choice.disabled).focus({ preventScroll: true });
    else check.focus({ preventScroll: true });
  }

  function showParagraph(moveFocus) {
    const { analysis, gaps, extras } = deck[position];
    answers = gaps.map(() => '');
    selected = 0;
    game.classList.remove('analysis-gaps-success');
    feedback.textContent = '';
    corrections.replaceChildren();
    corrections.hidden = true;
    check.hidden = false;
    next.hidden = true;
    passage.replaceChildren();

    let end = 0;
    slots = gaps.map(({ start, answer }, index) => {
      const slot = button('', () => {
        selected = index;
        answers[selected] = '';
        update();
        choices.find(choice => !choice.disabled).focus({ preventScroll: true });
      });
      passage.append(analysis.slice(end, start), slot);
      end = start + answer.length;
      return slot;
    });
    passage.append(analysis.slice(end));
    choices = shuffle([...gaps.map(gap => gap.answer), ...extras]).map(word =>
      button(word, () => selectWord(word))
    );
    bank.replaceChildren(...choices);
    game.scrollTop = 0;
    update();
    if (moveFocus) slots[0].focus({ preventScroll: true });
  }

  function startLevel(moveFocus) {
    clearTimeout(advanceTimer);
    deck = shuffle(items.filter(item => item.level === level));
    position = 0;
    levels.forEach(control => control.setAttribute('aria-pressed', String(control.dataset.level === level)));
    showParagraph(moveFocus);
  }

  function advance() {
    position++;
    if (position === deck.length) startLevel(true);
    else showParagraph(true);
  }

  launch.addEventListener('click', () => {
    game.showModal();
    startLevel(true);
  });
  game.addEventListener('close', () => {
    clearTimeout(advanceTimer);
    launch.focus();
  });
  levels.forEach(control => control.addEventListener('click', () => {
    if (control.dataset.level === level) return;
    level = control.dataset.level;
    startLevel(false);
  }));

  check.addEventListener('click', () => {
    const { gaps } = deck[position];
    let correct = 0;
    slots.forEach((slot, index) => {
      const { answer, context } = gaps[index];
      const chosen = answers[index];
      const right = chosen === answer;
      const marked = document.createElement('span');
      marked.className = right ? 'analysis-gap-right' : 'analysis-gap-wrong';
      if (right) {
        correct++;
      } else {
        const removed = document.createElement('del');
        removed.textContent = chosen;
        marked.append(removed, ' ');
        const belongs = gaps.findIndex(gap => gap.answer === chosen);
        const note = document.createElement('li');
        note.textContent = belongs === -1
          ? `Gap ${index + 1}: “${chosen}” is an extra word. Read how “${answer}” fits the sentence: ${context}`
          : `Gap ${index + 1}: “${chosen}” belongs in gap ${belongs + 1}. Here the sentence needs “${answer}”: ${context}`;
        corrections.append(note);
      }
      marked.append(answer);
      slot.replaceWith(marked);
    });
    choices.forEach(choice => { choice.disabled = true; });
    check.hidden = true;
    if (correct === gaps.length) {
      game.classList.add('analysis-gaps-success');
      feedback.textContent = 'All five correct!';
      advanceTimer = setTimeout(advance, 1200);
    } else {
      feedback.textContent = `${correct} of ${gaps.length} correct. Read the corrections before moving on.`;
      corrections.hidden = false;
      next.hidden = false;
      next.focus({ preventScroll: true });
    }
  });

  next.addEventListener('click', advance);
})();
