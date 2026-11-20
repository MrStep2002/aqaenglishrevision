import { createSession, formatNames } from './theme-revision-session.js?v=2';
import { renderExercise } from './theme-revision-exercises.js?v=2';

export function initialiseThemeRevision(dialog, launcher, clock = globalThis) {
  const find = selector => dialog.querySelector(selector);
  const bank = JSON.parse(find('.theme-revision-data').textContent);
  const levels = [...dialog.querySelectorAll('[data-level]')];
  const stage = find('.theme-stage'), exercise = find('.theme-exercise');
  const feedback = find('.theme-feedback'), score = find('.theme-score');
  const check = find('.theme-check'), hint = find('.theme-hint'), next = find('.theme-next');
  let level = 1, session, renderer, answered = false, correct = 0, attempts = 0, generation = 0;
  let advanceTimer;

  function cancelAdvance() {
    clock.clearTimeout(advanceTimer);
    advanceTimer = undefined;
  }

  function submit() {
    if (!dialog.open || answered || !renderer || (renderer.checkLabel && check.disabled)) return;
    const result = renderer.check();
    if (!result) return;
    answered = true;
    correct += result.correctCount;
    attempts += result.total;
    score.textContent = Math.round(correct / attempts * 100) + '%';
    score.setAttribute('aria-label', 'Accuracy: ' + score.textContent);
    feedback.textContent = result.message;
    feedback.dataset.correct = String(result.correct);
    check.hidden = hint.hidden = true;
    next.textContent = 'Next';
    if (result.correct) {
      const current = generation;
      advanceTimer = clock.setTimeout(() => {
        advanceTimer = undefined;
        if (dialog.open && generation === current && answered) showNext();
      }, 500);
    } else {
      next.focus({ preventScroll: true });
    }
  }

  function showNext() {
    cancelAdvance();
    const current = ++generation;
    answered = false;
    const round = session.next();
    dialog.dataset.format = round.kind;
    find('.theme-kind').textContent = formatNames[round.kind];
    exercise.replaceChildren();
    feedback.textContent = '';
    delete feedback.dataset.correct;
    check.hidden = hint.hidden = true;
    check.disabled = true;
    next.textContent = 'Skip';
    renderer = renderExercise(exercise, round, {
      submit() { if (generation === current) submit(); },
      ready(enabled) { if (generation === current && !answered) check.disabled = !enabled; },
      focusCheck() { if (generation === current && !check.disabled) check.focus({ preventScroll: true }); },
      message(text) { if (generation === current && !answered) feedback.textContent = text; },
    });
    check.hidden = !renderer.checkLabel;
    check.textContent = renderer.checkLabel || 'Check';
    hint.hidden = !renderer.hint;
    stage.scrollTop = 0;
    if (dialog.open) renderer.focus?.focus({ preventScroll: true });
  }

  function startLevel() {
    cancelAdvance();
    session = createSession(bank, level);
    dialog.dataset.level = String(level);
    correct = attempts = 0;
    score.textContent = '—';
    score.setAttribute('aria-label', 'Accuracy: no answers yet');
    levels.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.level) === level)));
    showNext();
  }

  launcher.addEventListener('click', () => {
    if (dialog.open) return;
    dialog.showModal();
    startLevel();
  });
  levels.forEach(button => button.addEventListener('click', () => {
    const selected = Number(button.dataset.level);
    if (selected === level) return;
    level = selected;
    startLevel();
  }));
  check.addEventListener('click', submit);
  hint.addEventListener('click', () => {
    if (!answered && renderer?.hint) feedback.textContent = renderer.hint();
  });
  next.addEventListener('click', () => { if (dialog.open) showNext(); });
  dialog.addEventListener('close', () => { cancelAdvance(); generation++; renderer = null; session = null; });
}

if (typeof document !== 'undefined') {
  const dialog = document.getElementById('theme-revision');
  const launcher = document.getElementById('play-theme-revision');
  if (dialog && launcher) initialiseThemeRevision(dialog, launcher);
}
