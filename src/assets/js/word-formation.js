(() => {
  const launch = document.querySelector('#play-word-formation');
  const game = document.querySelector('.word-formation');
  const form = game.querySelector('.word-formation-form');
  const levels = [...game.querySelectorAll('[data-level]')];
  const passage = game.querySelector('.analysis-gaps-passage');
  const feedback = game.querySelector('.analysis-gaps-feedback');
  const check = game.querySelector('.word-formation-check');
  const next = game.querySelector('.word-formation-next');
  const items = JSON.parse(document.querySelector('#word-formation-data').textContent);

  let level = levels[0].dataset.level;
  let deck = [];
  let position = 0;
  let fields = [];
  const normalise = word => word.trim().toLowerCase().replaceAll('’', "'");

  function updateProgress() {
    const completed = fields.filter(({ input }) => input.value.trim()).length;
    check.disabled = completed !== fields.length;
    feedback.textContent = `${completed} of ${fields.length} gaps filled.`;
  }

  function showParagraph() {
    const { analysis, forms } = deck[position];
    passage.replaceChildren();
    let end = 0;
    fields = forms.map(({ start, answer, stem }, index) => {
      const label = document.createElement('label');
      label.className = 'word-formation-gap';
      const cue = document.createElement('span');
      cue.className = 'word-formation-stem';
      cue.textContent = stem.toUpperCase();
      const input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.autocapitalize = 'none';
      input.spellcheck = false;
      input.setAttribute('aria-label', `Gap ${index + 1}, word to change: ${stem}`);
      input.enterKeyHint = index + 1 === forms.length ? 'done' : 'next';
      input.addEventListener('input', updateProgress);
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const following = fields[index + 1]?.input;
        if (following) following.focus();
        else if (!check.disabled) form.requestSubmit(check);
      });
      label.append(cue, input);
      passage.append(analysis.slice(end, start), label);
      end = start + answer.length;
      return { label, input };
    });
    passage.append(analysis.slice(end));
    check.hidden = false;
    next.hidden = true;
    game.scrollTop = 0;
    updateProgress();
    fields[0].input.focus({ preventScroll: true });
  }

  function startLevel() {
    deck = items.filter(item => item.level === level);
    for (let index = deck.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [deck[index], deck[other]] = [deck[other], deck[index]];
    }
    position = 0;
    levels.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.level === level)));
    showParagraph();
  }

  launch.addEventListener('click', () => {
    game.showModal();
    startLevel();
  });
  game.addEventListener('close', () => launch.focus());
  levels.forEach(button => button.addEventListener('click', () => {
    if (level === button.dataset.level) return;
    level = button.dataset.level;
    startLevel();
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (check.disabled || check.hidden) return;
    const { forms } = deck[position];
    let score = 0;
    forms.forEach(({ answer, stem, alternatives = [] }, index) => {
      const { label, input } = fields[index];
      const right = [answer, ...alternatives].some(value => normalise(input.value) === normalise(value));
      const mark = document.createElement('span');
      mark.className = right ? 'analysis-gap-right' : 'analysis-gap-wrong';
      if (right) {
        score++;
        if (normalise(input.value) !== normalise(answer)) {
          mark.title = `${input.value.trim()} also fits. The model paragraph uses ${answer}.`;
        }
      } else {
        const wrong = document.createElement('del');
        wrong.textContent = input.value.trim();
        mark.append(wrong, ' ');
        mark.title = `${stem.toUpperCase()} → ${answer}`;
      }
      mark.append(answer);
      label.replaceWith(mark);
    });
    feedback.textContent = score === forms.length
      ? 'All four correct!'
      : `${score} of ${forms.length} correct. The correct forms are shown in the paragraph.`;
    check.hidden = true;
    next.hidden = false;
    next.focus();
  });

  next.addEventListener('click', () => {
    if (++position === deck.length) startLevel();
    else showParagraph();
  });
})();
