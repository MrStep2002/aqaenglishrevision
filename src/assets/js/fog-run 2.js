import { shuffle, wordChoices } from './carol-word-choices.js';
import { createStreet } from './fog-street.js?v=4';
import { FogCourse, goal } from './fog-course.js?v=4';

const dialog = document.getElementById('fog-run');
const launcher = document.getElementById('play-fog-run');
const find = selector => dialog.querySelector(selector);
const bank = JSON.parse(find('.fog-data').textContent);
const scene = find('.fog-street');
const street = createStreet(find('canvas'),find('.fog-signs'));
const start = find('.fog-start'), result = find('.fog-result');
const question = find('.fog-question'), clue = find('#fog-clue'), meaning = find('.fog-meaning');
const hud = find('.fog-hud'), pauseButton = find('.fog-pause'), zone = find('.fog-jump-zone');
const controls = find('.fog-controls');
const held = new Map();
let course, paused = false, frame, previousTime;
let selected = find('.fog-ghost');
const active = () => course && !['won','lost'].includes(course.state);

function makeRounds() {
  const level = Number(selected.dataset.level);
  const pool = bank.filter(entry => entry.level === level);
  let bag = [];
  return Array.from({length:goal},(_,i) => {
    if (!bag.length) bag = shuffle(pool);
    const entry = bag.pop();
    const sentence = i % 2 === 1;
    const houses = wordChoices(entry,pool).map(choice => ({word:choice.word, correct:choice === entry}));
    const wordCount = (sentence ? entry.example : entry.definition).split(/\s+/).length;
    return {entry,sentence,houses,readTime:Math.min(5.5,1.3 + wordCount*.15)};
  });
}
function showClue() {
  const {entry,sentence} = course.rounds[course.score];
  find('.fog-prompt-type').textContent = sentence ? 'Complete the sentence' : 'Find the word';
  meaning.hidden = !sentence;
  meaning.textContent = sentence ? entry.definition : '';
  if (sentence) {
    const gap = document.createElement('span');
    gap.className = 'fog-gap';
    gap.setAttribute('role','img'); gap.setAttribute('aria-label','missing word');
    clue.replaceChildren(entry.example.slice(0,entry.start),gap,entry.example.slice(entry.start+entry.length));
  } else clue.textContent = entry.definition;
}
function count() { find('.fog-count').textContent = course.score + ' / ' + goal; }
function stop() { cancelAnimationFrame(frame); previousTime = null; }
function finish() {
  stop();
  const won = course.state === 'won';
  dialog.dataset.phase = course.state;
  pauseButton.hidden = zone.hidden = controls.hidden = question.hidden = true;
  result.hidden = false;
  result.querySelector('h3').textContent = won ? 'You made it to Fred’s party!' : 'The ghosts caught Scrooge!';
  let message = 'Ten word wreaths collected. Fred has saved you a place by the fire.';
  if (!won) {
    const answer = course.rounds[course.score].entry.word;
    message = course.reason === 'missed' ? '“' + answer + '” left the street.' :
      'You caught “' + course.failedHouse.word + '”. The clue called for “' + answer + '”.';
  }
  result.querySelector('p').textContent = message;
  result.querySelector('h3').focus({preventScroll:true});
}
function onEvent(event) {
  dialog.dataset.phase = course.state;
  if (event === 'score') {
    count();
    if (course.score < goal) showClue();
    else {
      zone.hidden = controls.hidden = true;
      find('.fog-prompt-type').textContent = 'Ten wreaths collected';
      clue.textContent = 'Fred’s house is just ahead.';
      meaning.hidden = true;
    }
  } else if (event === 'missed' || event === 'wrong') {
    zone.hidden = controls.hidden = true;
  } else if (event === 'lost' || event === 'won') finish();
}
function animate(now) {
  if (paused || !dialog.open || !active()) return;
  let remaining = previousTime == null ? 0 : Math.min(.12,(now-previousTime)/1000);
  previousTime = now;
  const direction = Array.from(held.values()).at(-1) || 0;
  while (remaining > 0 && active()) {
    const dt = Math.min(remaining,1/60);
    const event = course.tick(dt,direction);
    remaining -= dt;
    if (event) onEvent(event);
  }
  street.draw(course);
  if (active() && !paused) frame = requestAnimationFrame(animate);
}
function run() {
  stop(); held.clear();
  course = new FogCourse(makeRounds());
  paused = false;
  dialog.dataset.phase = 'running';
  start.hidden = result.hidden = true;
  scene.hidden = hud.hidden = question.hidden = zone.hidden = controls.hidden = pauseButton.hidden = false;
  controls.inert = false;
  pauseButton.textContent = 'Pause';
  hud.querySelector('span').textContent = selected.querySelector('.fog-difficulty').textContent;
  count(); showClue(); street.draw(course);
  find('.fog-body').scrollTop = 0;
  zone.focus({preventScroll:true});
  frame = requestAnimationFrame(animate);
}
function setPaused(value) {
  held.clear();
  if (!active() || paused === value) return;
  stop(); paused = value;
  dialog.dataset.phase = value ? 'paused' : course.state;
  pauseButton.textContent = value ? 'Resume' : 'Pause';
  zone.hidden = value || course.state !== 'running';
  controls.hidden = course.state !== 'running';
  controls.inert = value;
  if (!value && dialog.open) {
    if (!zone.hidden) zone.focus({preventScroll:true});
    frame = requestAnimationFrame(animate);
  }
}
function jump() {
  if (dialog.open && !paused) course?.jump();
}
zone.addEventListener('pointerdown',event => {
  if (event.button !== 0) return;
  event.preventDefault(); jump();
});
zone.addEventListener('click',event => { if (event.detail === 0) jump(); });
for (const button of controls.querySelectorAll('[data-direction]')) {
  button.addEventListener('pointerdown',event => {
    if (event.button !== 0 || paused) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    held.set(event.pointerId,Number(button.dataset.direction));
  });
  button.addEventListener('lostpointercapture',event => held.delete(event.pointerId));
}
dialog.addEventListener('keydown',event => {
  if (!active() || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key.toLowerCase() === 'p' && !event.repeat) {
    event.preventDefault(); setPaused(!paused); return;
  }
  if (paused || course.state !== 'running') return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    if (!event.repeat) held.set(event.key,event.key === 'ArrowLeft' ? -1 : 1);
  } else if (event.key === 'ArrowUp' || (event.key === ' ' && (event.target === zone || !event.target.closest('button')))) {
    event.preventDefault(); if (!event.repeat) jump();
  }
});
window.addEventListener('keyup',event => held.delete(event.key));
for (const ghost of start.querySelectorAll('.fog-ghost')) {
  ghost.addEventListener('click',()=>{ selected = ghost; run(); });
}
pauseButton.addEventListener('click',()=>setPaused(!paused));
find('.fog-again').addEventListener('click',run);
find('.fog-change').addEventListener('click',()=>{
  stop(); held.clear(); course = null;
  start.hidden = false; scene.hidden = result.hidden = hud.hidden = true;
  dialog.dataset.phase = 'start'; street.draw(null);
  selected.focus();
});
launcher.addEventListener('click',()=>{
  if (dialog.open) return;
  dialog.showModal();
  street.draw(course || null);
  if (!course) selected.focus();
  else if (paused) pauseButton.focus();
  else if (!active()) result.querySelector('h3').focus();
});
dialog.addEventListener('close',()=>{setPaused(true);stop();});
window.addEventListener('blur',()=>{if(dialog.open)setPaused(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true);});
