import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createDocument } from './theme-revision-test-dom.mjs';
import { initialiseThemeRevision } from '../src/assets/js/theme-revision.js';

const require = createRequire(import.meta.url);
const nunjucks = require('nunjucks');
const data = require('../src/a-christmas-carol/a-christmas-carol.11tydata.js')();
const bank = JSON.parse(data.themeRevisionBanks.greed);
const environment = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/_includes')));

class Clock {
  time = 0;
  serial = 0;
  timers = new Map();
  setTimeout(callback, delay) { const id = ++this.serial; this.timers.set(id, { at: this.time + delay, callback }); return id; }
  clearTimeout(id) { this.timers.delete(id); }
  advance(milliseconds) {
    const target = this.time + milliseconds;
    while (true) {
      const entry = [...this.timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!entry) break;
      this.time = entry[1].at;
      this.timers.delete(entry[0]);
      entry[1].callback();
    }
    this.time = target;
  }
}

function fixture() {
  const html = environment.render('theme-revision.njk', { ...data, topic: 'greed' });
  const document = createDocument('<button id="play-theme-revision">Play</button>' + html);
  const dialog = document.getElementById('theme-revision');
  const launch = document.getElementById('play-theme-revision');
  const clock = new Clock();
  initialiseThemeRevision(dialog, launch, clock);
  launch.click();
  return { document, dialog, launch, clock };
}

function replaceParts(item, parts, value) {
  let end = 0, text = '';
  parts.forEach((part, index) => {
    text += item.analysis.slice(end, part.start) + value(part, index);
    end = part.start + part.answer.length;
  });
  return text + item.analysis.slice(end);
}

function answerChoices(dialog) {
  const kind = dialog.dataset.format;
  const prompt = dialog.querySelector('.theme-question').textContent;
  let answer;
  if (kind === 'quote-gap') answer = bank.quotes.flatMap(item => item.blanks).find(blank => '“' + blank.masked + '”' === prompt).answer;
  else if (kind === 'vocabulary') {
    answer = bank.vocabulary.find(item => {
      const example = dialog.dataset.level === '1' && item.fogEasy ? item.fogEasy : item;
      return example.example.slice(0, example.start) + '_____' + example.example.slice(example.start + example.length) === prompt;
    }).word;
  } else answer = bank[kind].find(item => item.question === prompt).choices[0];
  return { answer, buttons: dialog.querySelectorAll('.theme-choices button') };
}

function submitCorrect(dialog) {
  const kind = dialog.dataset.format;
  if (dialog.querySelector('.theme-choices')) {
    const { answer, buttons } = answerChoices(dialog);
    buttons.find(button => button.textContent === answer).click();
  } else if (kind === 'quote-order' || kind === 'jigsaw') {
    dialog.querySelectorAll('.theme-tiles button').sort((a, b) => Number(a.dataset.position) - Number(b.dataset.position)).forEach(button => button.click());
    dialog.querySelector('.theme-check').click();
  } else {
    const text = dialog.querySelector('.theme-paragraph').textContent;
    if (kind === 'analysis') {
      const item = bank.analysis.find(item => replaceParts(item, item.gaps, (_, index) => '[' + (index + 1) + ']') === text);
      assert.ok(item);
      item.gaps.forEach(gap => dialog.querySelectorAll('.theme-word-bank button').find(button => button.textContent === gap.answer).click());
    } else {
      const item = bank.corrections.find(item => replaceParts(item, item.forms, form => form.stem.toUpperCase()) === text);
      assert.ok(item);
      dialog.querySelectorAll('input').forEach((input, index) => { input.value = item.forms[index].answer; input.dispatch('input'); });
    }
    dialog.querySelector('.theme-check').click();
  }
}

function advanceToChoice(dialog) {
  for (let index = 0; index < 9; index++) {
    if (dialog.querySelector('.theme-choices')) return;
    dialog.querySelector('.theme-next').click();
  }
  throw new Error('No choice question');
}

test('all eight exercise formats advance at exactly 500 ms and continue through repeated rotations', () => {
  const { dialog, clock } = fixture();
  const kinds = new Set();
  for (let turn = 0; turn < 32; turn++) {
    const kind = dialog.dataset.format;
    kinds.add(kind);
    submitCorrect(dialog);
    assert.equal(dialog.querySelector('.theme-score').textContent, '100%');
    assert.equal(clock.timers.size, 1);
    const previous = dialog.querySelector('.theme-exercise').firstElementChild;
    clock.advance(499);
    assert.equal(dialog.querySelector('.theme-exercise').firstElementChild, previous);
    clock.advance(1);
    assert.notEqual(dialog.querySelector('.theme-exercise').firstElementChild, previous);
    assert.notEqual(dialog.dataset.format, kind);
    assert.equal(dialog.querySelector('.theme-next').textContent, 'Skip');
    assert.equal(clock.timers.size, 0);
  }
  assert.equal(kinds.size, 8);
});

test('wrong answers remain available for review and Next continues the session', () => {
  const { dialog, clock } = fixture();
  advanceToChoice(dialog);
  const { answer, buttons } = answerChoices(dialog);
  buttons.find(button => button.textContent !== answer).click();
  const previous = dialog.querySelector('.theme-exercise').firstElementChild;
  assert.equal(clock.timers.size, 0);
  clock.advance(5000);
  assert.equal(dialog.querySelector('.theme-exercise').firstElementChild, previous);
  dialog.querySelector('.theme-next').click();
  assert.notEqual(dialog.querySelector('.theme-exercise').firstElementChild, previous);
});

test('partially correct paragraphs wait for review rather than advancing', () => {
  const { dialog, clock } = fixture();
  for (let index = 0; index < 9 && dialog.dataset.format !== 'analysis'; index++) dialog.querySelector('.theme-next').click();
  assert.equal(dialog.dataset.format, 'analysis');
  const text = dialog.querySelector('.theme-paragraph').textContent;
  const item = bank.analysis.find(item => replaceParts(item, item.gaps, (_, index) => '[' + (index + 1) + ']') === text);
  const words = dialog.querySelectorAll('.theme-word-bank button');
  words.find(button => button.textContent === item.extras[0]).click();
  item.gaps.slice(1).forEach(gap => words.find(button => button.textContent === gap.answer).click());
  dialog.querySelector('.theme-check').click();
  assert.equal(dialog.querySelector('.theme-score').textContent, '80%');
  assert.equal(clock.timers.size, 0);
  assert.ok(dialog.querySelector('.theme-feedback').textContent.includes('4 of 5'));
});

for (const action of ['next', 'ghost', 'close']) {
  test(action + ' cancels a pending automatic advance without skipping the next question', () => {
    const { dialog, launch, clock } = fixture();
    advanceToChoice(dialog);
    submitCorrect(dialog);
    assert.equal(clock.timers.size, 1);
    clock.advance(200);
    if (action === 'next') dialog.querySelector('.theme-next').click();
    else if (action === 'ghost') dialog.querySelectorAll('[data-level]').find(button => button.dataset.level === '2').click();
    else { dialog.close(); launch.click(); }
    assert.equal(clock.timers.size, 0);
    const current = dialog.querySelector('.theme-exercise').firstElementChild;
    clock.advance(1000);
    assert.equal(dialog.querySelector('.theme-exercise').firstElementChild, current);
  });
}
