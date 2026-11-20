import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createDocument } from './theme-revision-test-dom.mjs';
import { createSession } from '../src/assets/js/theme-revision-session.js';
import { renderExercise } from '../src/assets/js/theme-revision-exercises.js';
import { initialiseThemeRevision } from '../src/assets/js/theme-revision.js';

const require = createRequire(import.meta.url);
const nunjucks = require('nunjucks');
const data = require('../src/a-christmas-carol/a-christmas-carol.11tydata.js')();
const bank = JSON.parse(data.themeRevisionBanks.greed);
const environment = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/_includes')));
const kinds = ['quote-gap', 'quote-order', 'plot', 'context', 'analysis', 'corrections', 'vocabulary', 'jigsaw'];

function roundOf(kind) {
  const session = createSession(bank, 1);
  for (let index = 0; index < 8; index++) {
    const round = session.next();
    if (round.kind === kind) return round;
  }
  throw new Error('Missing format ' + kind);
}
function render(round) {
  const document = createDocument();
  const container = document.createElement('div');
  document.body.append(container);
  const state = { ready: false, submissions: 0, message: '' };
  const api = renderExercise(container, round, {
    ready(value) { state.ready = Boolean(value); },
    submit() { state.submissions++; }, focusCheck() {},
    message(value) { state.message = value; },
  });
  return { container, state, api };
}

for (const kind of ['quote-gap', 'plot', 'context', 'vocabulary']) {
  test(kind + ' checks the selected answer, reveals feedback and prevents a second score', () => {
    const round = roundOf(kind);
    const { container, state, api } = render(round);
    assert.equal(api.check(), null);
    const buttons = container.querySelectorAll('.theme-choices button');
    const correct = buttons.find(node => node.textContent === round.answer);
    correct.click();
    assert.equal(state.submissions, 1);
    const result = api.check();
    assert.equal(result.correct, true);
    assert.equal(result.correctCount, 1);
    assert.ok(buttons.every(node => node.disabled));
    assert.equal(api.check(), null);
  });
  test(kind + ' identifies and reveals a wrong answer', () => {
    const round = roundOf(kind);
    const { container, api } = render(round);
    const wrong = container.querySelectorAll('.theme-choices button').find(node => node.textContent !== round.answer);
    wrong.click();
    const result = api.check();
    assert.equal(result.correct, false);
    assert.ok(result.message.includes(round.answer));
    assert.equal(wrong.dataset.correct, 'false');
    assert.ok(container.querySelectorAll('button').some(node => node.dataset.correct === 'true'));
  });
}

for (const kind of ['quote-order', 'jigsaw']) {
  test(kind + ' lets pieces be placed and returned, gives hints and accepts the correct order', () => {
    const round = roundOf(kind);
    const { container, state, api } = render(round);
    const pieces = kind === 'jigsaw' ? round.item.sentences : round.item.tiles;
    assert.equal(state.ready, false);
    assert.equal(api.check(), null);
    assert.ok(api.hint());
    const first = container.querySelector('.theme-tiles button');
    first.click();
    assert.equal(container.querySelectorAll('.theme-answer button').length, 1);
    first.click();
    assert.equal(container.querySelectorAll('.theme-answer button').length, 0);
    for (let index = 0; index < pieces.length; index++) {
      container.querySelectorAll('.theme-tiles button').find(node => Number(node.dataset.position) === index).click();
    }
    assert.equal(state.ready, true);
    assert.equal(api.check().correct, true);
    assert.equal(container.querySelector('.theme-model').textContent, pieces.join(' '));
    assert.equal(api.check(), null);
  });
  test(kind + ' reveals the original model after an incorrect order', () => {
    const round = roundOf(kind);
    const { container, api } = render(round);
    const tiles = container.querySelectorAll('.theme-tiles button').sort((a, b) => Number(a.dataset.position) - Number(b.dataset.position));
    [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
    tiles.forEach(node => node.click());
    assert.equal(api.check().correct, false);
    assert.equal(container.querySelector('.theme-answer').hidden, true);
    assert.ok(container.querySelector('.theme-model').textContent);
  });
}

test('Analysis Gaps supports changing a choice, checks five gaps and reveals correct text', () => {
  const round = roundOf('analysis');
  const { container, state, api } = render(round);
  const slots = container.querySelectorAll('.theme-gap');
  const words = container.querySelectorAll('.theme-word-bank button');
  words.find(node => node.textContent === round.item.extras[0]).click();
  slots[0].click();
  for (const gap of round.item.gaps) words.find(node => node.textContent === gap.answer).click();
  assert.equal(state.ready, true);
  const result = api.check();
  assert.equal(result.correctCount, 5);
  assert.equal(result.total, 5);
  assert.equal(container.querySelector('.theme-paragraph').textContent, round.item.analysis);
  assert.equal(container.querySelector('.theme-word-bank').hidden, true);
});

test('Analysis Gaps preserves partial scores and supplies context for wrong choices', () => {
  const round = roundOf('analysis');
  const { container, api } = render(round);
  const words = container.querySelectorAll('.theme-word-bank button');
  words.find(node => node.textContent === round.item.extras[0]).click();
  for (const gap of round.item.gaps.slice(1)) words.find(node => node.textContent === gap.answer).click();
  const result = api.check();
  assert.equal(result.correctCount, 4);
  assert.equal(result.total, 5);
  assert.ok(container.querySelector('.theme-review').textContent.includes(round.item.gaps[0].context));
});

test('Corrections handles empty answers, keyboard navigation and canonical forms', () => {
  const round = roundOf('corrections');
  const { container, state, api } = render(round);
  const inputs = container.querySelectorAll('input');
  assert.equal(api.check(), null);
  inputs.forEach((input, index) => { input.value = round.item.forms[index].answer.toUpperCase(); input.dispatch('input'); });
  assert.equal(state.ready, true);
  inputs[0].dispatch('keydown', { key: 'Enter' });
  assert.equal(container.ownerDocument.activeElement, inputs[1]);
  inputs.at(-1).dispatch('keydown', { key: 'Enter' });
  assert.equal(state.submissions, 1);
  assert.equal(api.check().correctCount, 4);
  assert.equal(container.querySelector('.theme-paragraph').textContent, round.item.analysis);
});

test('Corrections accepts explicit alternatives and reports partial scores', () => {
  const round = roundOf('corrections');
  round.item = structuredClone(round.item);
  round.item.forms[0].alternatives = ['allowed'];
  const { container, api } = render(round);
  container.querySelectorAll('input').forEach((input, index) => {
    input.value = index === 0 ? 'allowed' : index === 1 ? 'incorrect' : round.item.forms[index].answer;
    input.dispatch('input');
  });
  const result = api.check();
  assert.equal(result.correctCount, 3);
  assert.equal(result.total, 4);
  assert.equal(container.querySelectorAll('.theme-wrong').length, 1);
});

test('the real window rotates all formats, skips without scoring, changes ghosts and reopens cleanly', () => {
  const html = environment.render('theme-revision.njk', { ...data, topic: 'greed' });
  const document = createDocument('<button id="play-theme-revision">Play</button>' + html);
  const dialog = document.getElementById('theme-revision');
  const launch = document.getElementById('play-theme-revision');
  initialiseThemeRevision(dialog, launch);
  launch.click();
  assert.equal(dialog.open, true);
  const formats = new Set();
  const next = dialog.querySelector('.theme-next');
  for (let index = 0; index < 8; index++) { formats.add(dialog.dataset.format); next.click(); }
  assert.deepEqual(formats, new Set(kinds));
  assert.equal(dialog.querySelector('.theme-score').textContent, '—');
  for (const level of [2, 3, 1]) {
    dialog.querySelectorAll('[data-level]').find(node => Number(node.dataset.level) === level).click();
    assert.equal(dialog.dataset.level, String(level));
    assert.equal(dialog.querySelectorAll('[aria-pressed="true"]').filter(node => node.hasAttribute('data-level')).length, 1);
    assert.equal(dialog.querySelector('.theme-score').textContent, '—');
  }
  dialog.close();
  assert.equal(dialog.open, false);
  launch.click();
  assert.equal(dialog.open, true);
  assert.ok(dialog.querySelector('.theme-exercise').children.length);
});

test('the window scores only submitted answers, preserves accuracy on Skip and ignores stale exercise callbacks', () => {
  const html = environment.render('theme-revision.njk', { ...data, topic: 'greed' });
  const document = createDocument('<button id="play-theme-revision">Play</button>' + html);
  const dialog = document.getElementById('theme-revision');
  initialiseThemeRevision(dialog, document.getElementById('play-theme-revision'));
  document.getElementById('play-theme-revision').click();
  const score = dialog.querySelector('.theme-score');
  const next = dialog.querySelector('.theme-next');
  function choiceRound() {
    for (let index = 0; index < 9; index++) {
      const choices = dialog.querySelectorAll('.theme-choices button');
      if (choices.length) {
        const prompt = dialog.querySelector('.theme-question').textContent;
        let answer;
        if (dialog.dataset.format === 'quote-gap') answer = bank.quotes.flatMap(item => item.blanks).find(blank => '“' + blank.masked + '”' === prompt).answer;
        else if (dialog.dataset.format === 'vocabulary') answer = bank.vocabulary.find(item => {
          const example = dialog.dataset.level === '1' && item.fogEasy ? item.fogEasy : item;
          return example.example.slice(0, example.start) + '_____' + example.example.slice(example.start + example.length) === prompt;
        }).word;
        else answer = bank[dialog.dataset.format].find(item => item.question === prompt).choices[0];
        return { choices, answer };
      }
      next.click();
    }
    throw new Error('No choice exercise appeared');
  }
  let current = choiceRound();
  current.choices.find(node => node.textContent === current.answer).click();
  assert.equal(score.textContent, '100%');
  assert.equal(next.textContent, 'Next');
  dialog.querySelector('.theme-check').click();
  assert.equal(score.textContent, '100%');
  next.click();
  assert.equal(score.textContent, '100%');
  current = choiceRound();
  current.choices.find(node => node.textContent !== current.answer).click();
  assert.equal(score.textContent, '50%');
  const stale = current.choices[0];
  dialog.querySelectorAll('[data-level]').find(node => node.dataset.level === '2').click();
  assert.equal(score.textContent, '—');
  stale.disabled = false; stale.click();
  assert.equal(score.textContent, '—');
});
