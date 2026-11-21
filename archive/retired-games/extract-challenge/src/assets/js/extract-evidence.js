(() => {
  const extract = document.getElementById('extract-evidence');
  const launch = document.getElementById('play-extract-evidence');
  if (!extract || !launch) return;
  const phrases = [...extract.querySelectorAll('[data-score]')];
  const question = extract.querySelector('.evidence-question');
  const count = extract.querySelector('.evidence-count');
  const check = extract.querySelector('.evidence-check');
  const feedback = extract.querySelector('.evidence-feedback');
  const score = feedback.querySelector('h3');
  const explanations = [...feedback.querySelectorAll('li')];
  const selected = new Set();

  function update() {
    count.textContent = selected.size + ' of 2 phrases selected';
    check.disabled = selected.size !== 2;
    phrases.forEach(phrase => {
      phrase.setAttribute('aria-pressed', selected.has(phrase));
      phrase.disabled = selected.size === 2 && !selected.has(phrase);
    });
  }

  function reset() {
    selected.clear();
    feedback.hidden = true;
    check.hidden = false;
    update();
  }

  launch.addEventListener('click', () => {
    reset();
    extract.showModal();
    question.focus();
  });
  phrases.forEach(phrase => {
    phrase.addEventListener('click', () => {
      if (selected.has(phrase)) selected.delete(phrase);
      else if (selected.size < 2) selected.add(phrase);
      update();
    });
  });
  check.addEventListener('click', () => {
    if (selected.size !== 2) return;
    const total = [...selected].reduce((sum, phrase) => sum + Number(phrase.dataset.score), 0);
    score.textContent = 'Your evidence score: ' + total + '/4';
    phrases.forEach((phrase, index) => {
      phrase.disabled = true;
      explanations[index].classList.toggle('evidence-selected', selected.has(phrase));
    });
    check.hidden = true;
    feedback.hidden = false;
    score.focus();
  });
  feedback.querySelector('.evidence-retry').addEventListener('click', () => {
    reset();
    question.focus();
  });
})();
