import { shuffle } from './carol-word-choices.js';
import { createStreet } from './fog-street.js?v=6';
import { FogCourse, goal } from './fog-course.js?v=6';

const dialog = document.getElementById('fog-run');
const launcher = document.getElementById('play-fog-run');
const find = selector => dialog.querySelector(selector);
const bank = JSON.parse(find('.fog-data').textContent);
const scene = find('.fog-street');
const street = createStreet(find('canvas'), find('.fog-signs'));
const start = find('.fog-start'), result = find('.fog-result');
const question = find('.fog-question'), clue = find('#fog-clue'), message = find('.fog-message');
const hud = find('.fog-hud'), pauseButton = find('.fog-pause'), zone = find('.fog-jump-zone');
const controls = find('.fog-controls');
const held = new Map();
let course, paused = false, frame, previousTime;
let selected = find('.fog-ghost');
const active = () => course && course.state !== 'won';

function makeRun() {
  const pool = bank.filter(entry => entry.level === Number(selected.dataset.level));
  const chosen = [], used = new Set();
  function add(entry) {
    if (!entry || used.has(entry.word.toLowerCase())) return;
    used.add(entry.word.toLowerCase());
    chosen.push(entry);
  }
  // Include each available clue type, then fill the street with distinct answers.
  for (const type of shuffle([...new Set(pool.map(entry => entry.type))])) {
    add(shuffle(pool).find(entry => entry.type === type && !used.has(entry.word.toLowerCase())));
  }
  for (const entry of shuffle(pool)) {
    if (chosen.length === goal) break;
    add(entry);
  }
  const rounds = shuffle(chosen);
  const words = shuffle(rounds.map(entry => entry.word));
  // The clue order and the street order are separate, so finding the next word
  // can mean returning to a place the player has already visited.
  if (words.every((word, index) => word === rounds[index].word)) words.push(words.shift());
  return new FogCourse(rounds, words);
}
function showClue() {
  const entry = course.rounds[course.score];
  const types = { definition: 'Find the word', character: 'Find the character', quote: 'Complete the quotation' };
  find('.fog-prompt-type').textContent = 'Clue ' + (course.score + 1) + ' of ' + goal + ' · ' + types[entry.type];
  const parts = entry.clue.split('____');
  if (parts.length === 1) clue.textContent = entry.clue;
  else {
    const gap = document.createElement('span');
    gap.className = 'fog-gap';
    gap.setAttribute('role', 'img');
    gap.setAttribute('aria-label', 'missing word');
    clue.replaceChildren(parts[0], gap, parts[1]);
  }
}
function say(text, kind = '') { message.textContent = text; message.dataset.kind = kind; }
function count() { find('.fog-count').textContent = course.score + ' / ' + goal; }
function stop() { cancelAnimationFrame(frame); previousTime = null; }
function finish() {
  stop();
  dialog.dataset.phase = 'won';
  pauseButton.hidden = zone.hidden = controls.hidden = question.hidden = true;
  result.hidden = false;
  result.querySelector('h3').textContent = 'You made it to Fred’s party!';
  result.querySelector('p').textContent = 'All ten words collected in clue order. Fred has saved you a place by the fire.';
  result.querySelector('h3').focus({ preventScroll: true });
}
function onEvent(event) {
  dialog.dataset.phase = course.state;
  if (event === 'score') {
    count();
    if (course.partyReady) {
      find('.fog-prompt-type').textContent = 'Ten words collected';
      clue.textContent = 'Find Fred’s door at the far right of the street.';
      say('The party is open. Run right to go in.', 'good');
    } else {
      say('“' + course.rounds[course.score - 1].word + '” collected.', 'good');
      showClue();
    }
  } else if (event === 'wrong') say('Try another word for this clue.', 'wrong');
  else if (event === 'locked') say('Collect all ten words before entering Fred’s party.');
  else if (event === 'enter') {
    held.clear();
    controls.inert = true;
    zone.hidden = true;
    say('Fred is waiting. Come in!', 'good');
  } else if (event === 'won') finish();
}
function animate(now) {
  if (paused || !dialog.open || !active()) return;
  let remaining = previousTime == null ? 0 : Math.min(.12, (now - previousTime) / 1000);
  previousTime = now;
  const direction = Array.from(held.values()).at(-1) || 0;
  while (remaining > 0 && active()) {
    const dt = Math.min(remaining, 1 / 60);
    const event = course.tick(dt, direction);
    remaining -= dt;
    if (event) onEvent(event);
  }
  street.draw(course);
  if (active() && !paused) frame = requestAnimationFrame(animate);
}
function run() {
  stop(); held.clear();
  course = makeRun();
  paused = false;
  dialog.dataset.phase = 'running';
  start.hidden = result.hidden = true;
  scene.hidden = hud.hidden = question.hidden = zone.hidden = controls.hidden = pauseButton.hidden = false;
  controls.inert = false;
  pauseButton.textContent = 'Pause';
  hud.querySelector('span').textContent = selected.querySelector('.fog-difficulty').textContent;
  count(); showClue(); street.draw(course);
  say('Explore both ways. Jump for the word that fits the clue.');
  find('.fog-body').scrollTop = 0;
  zone.focus({ preventScroll: true });
  frame = requestAnimationFrame(animate);
}
function setPaused(value) {
  held.clear();
  if (!active() || paused === value) return;
  stop(); paused = value;
  dialog.dataset.phase = value ? 'paused' : course.state;
  pauseButton.textContent = value ? 'Resume' : 'Pause';
  controls.inert = value || course.state !== 'running';
  zone.hidden = value || course.state !== 'running';
  if (!value && dialog.open) {
    if (!zone.hidden) zone.focus({ preventScroll: true });
    frame = requestAnimationFrame(animate);
  }
}
function jump() { if (dialog.open && !paused) course?.jump(); }
zone.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  event.preventDefault(); jump();
});
zone.addEventListener('click', event => { if (event.detail === 0) jump(); });
for (const button of controls.querySelectorAll('[data-direction]')) {
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0 || paused || course?.state !== 'running') return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    held.set(event.pointerId, Number(button.dataset.direction));
  });
  button.addEventListener('lostpointercapture', event => held.delete(event.pointerId));
  button.addEventListener('click', event => {
    if (event.detail !== 0 || paused || course?.state !== 'running') return;
    const result = course.tick(.2, Number(button.dataset.direction));
    if (result) onEvent(result);
    street.draw(course);
  });
}
dialog.addEventListener('keydown', event => {
  if (!active() || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key.toLowerCase() === 'p' && !event.repeat) {
    event.preventDefault(); setPaused(!paused); return;
  }
  if (paused || course.state !== 'running') return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    if (!event.repeat) held.set(event.key, event.key === 'ArrowLeft' ? -1 : 1);
  } else if (event.key === 'ArrowUp' || (event.key === ' ' && (event.target === zone || !event.target.closest('button')))) {
    event.preventDefault(); if (!event.repeat) jump();
  }
});
window.addEventListener('keyup', event => held.delete(event.key));
for (const ghost of start.querySelectorAll('.fog-ghost')) ghost.addEventListener('click', () => { selected = ghost; run(); });
pauseButton.addEventListener('click', () => setPaused(!paused));
find('.fog-again').addEventListener('click', run);
find('.fog-change').addEventListener('click', () => {
  stop(); held.clear(); course = null;
  start.hidden = false; scene.hidden = result.hidden = hud.hidden = true;
  dialog.dataset.phase = 'start'; street.draw(null);
  selected.focus();
});
launcher.addEventListener('click', () => {
  if (dialog.open) return;
  dialog.showModal();
  street.draw(course || null);
  if (!course) selected.focus();
  else if (paused) pauseButton.focus();
  else if (!active()) result.querySelector('h3').focus();
});
dialog.addEventListener('close', () => { setPaused(true); stop(); });
window.addEventListener('blur', () => { if (dialog.open) setPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
