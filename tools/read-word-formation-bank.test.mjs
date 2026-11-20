import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const loader = fileURLToPath(new URL('./read-word-formation-bank.js', import.meta.url));
const source = readFileSync(loader, 'utf8');
const realRequire = createRequire(loader);
const header = 'level,paragraph,stem1,stem2,stem3,stem4,alternatives1,alternatives2,alternatives3,alternatives4';
const paragraph = 'His [[kindness]] makes [[generosity]] seem [[valuable]] and invites [[judgement]].';
const row = level => [level, paragraph, 'kind', 'generous', 'value', 'judge', '', '', '', ''];
const csv = rows => [header, ...rows.map(values => values.map(value => `"${value.replaceAll('"', '""')}"`).join(','))].join('\n');
const allLevels = () => ['Foundation', 'Intermediate', 'Advanced'].map(row);
function readFixture(text, filename = 'fixture.csv') {
  const module = { exports: {} };
  const fn = vm.runInNewContext(`(function(require,module,__dirname){\n${source}\n})`, { Intl });
  fn(name => name === 'node:fs' ? { readFileSync: () => text } : realRequire(name), module, path.dirname(loader));
  return module.exports(filename);
}

test('reads the three levels with canonical answers and exact offsets', () => {
  const deck = JSON.parse(readFixture(csv(allLevels())));
  assert.deepEqual(deck.map(item => item.level), ['Foundation', 'Intermediate', 'Advanced']);
  assert.equal(deck[0].analysis, paragraph.replace(/\[\[|\]\]/g, ''));
  assert.equal(deck[0].forms.length, 4);
  for (const form of deck[0].forms) {
    assert.equal(deck[0].analysis.slice(form.start, form.start + form.answer.length), form.answer);
    assert.equal(form.context, deck[0].analysis);
    assert(!('alternatives' in form));
  }
});

test('markers select the specified occurrence of a repeated word', () => {
  const rows = allLevels();
  rows[0][1] = 'His kindness matters. His [[kindness]] makes [[generosity]] seem [[valuable]] and invites [[judgement]].';
  const [item] = JSON.parse(readFixture(csv(rows)));
  assert.equal(item.forms[0].start, item.analysis.lastIndexOf('kindness'));
  assert.equal(item.forms[0].context, 'His kindness makes generosity seem valuable and invites judgement.');
});

test('reads explicit alternatives for the appropriate gap', () => {
  const rows = allLevels();
  rows[0][9] = 'judgment';
  const [item] = JSON.parse(readFixture(csv(rows)));
  assert.deepEqual(item.forms[3].alternatives, ['judgment']);
  assert(!('alternatives' in item.forms[0]));
});

test('rejects missing levels and invalid row levels', () => {
  assert.throws(() => readFixture(csv([row('Foundation')])), /all three/);
  const rows = allLevels(); rows[1][0] = 'Higher';
  assert.throws(() => readFixture(csv(rows)), /Row 3.*Foundation, Intermediate or Advanced/);
});

test('rejects incomplete markers and too few or too many gaps', () => {
  for (const text of [paragraph.replace('[[kindness]]', 'kindness'), paragraph + ' [[kindness]]', paragraph + ' [[broken']) {
    const rows = allLevels(); rows[0][1] = text;
    assert.throws(() => readFixture(csv(rows)), /Row 2.*exactly four/);
  }
});

test('rejects partial words and multiword or unchanged stems', () => {
  for (const [field, value] of [[1, paragraph.replace('[[kindness]]', 'un[[kindness]]')],
    [1, paragraph.replace('[[kindness]]', '[[kindness]]es')], [2, 'kindness'], [2, 'be kind'], [2, '']]) {
    const rows = allLevels(); rows[0][field] = value;
    assert.throws(() => readFixture(csv(rows)), /Row 2.*gap 1.*whole word/);
  }
});

test('rejects malformed alternatives and duplicate canonical answers', () => {
  for (const value of ['kindness', 'kind', 'kindly;kindly', 'two words', 'kindly;']) {
    const rows = allLevels(); rows[0][6] = value;
    assert.throws(() => readFixture(csv(rows)), /Row 2.*gap 1.*alternatives/);
  }
});

test('escapes script delimiters without changing paragraph text', () => {
  const rows = allLevels(); rows[0][1] = '<script> ' + paragraph;
  const encoded = readFixture(csv(rows));
  assert(!encoded.includes('<'));
  assert(JSON.parse(encoded)[0].analysis.startsWith('<script>'));
});

test('rejects invalid headers, extra fields and filenames outside the data folder', () => {
  assert.throws(() => readFixture(csv(allLevels()).replace('stem1', 'prompt1')), /header/);
  const rows = allLevels(); rows[0].push('unexpected');
  assert.throws(() => readFixture(csv(rows)), /Row 2.*ten fields/);
  assert.throws(() => readFixture(csv(allLevels()), '../fixture.csv'), /CSV filename/);
});

test('reads optional theme tags without changing answers or offsets', () => {
  const text = csv(allLevels().map(values => [...values, 'Change; Social Injustice'])).replace(header, header + ',themes');
  const items = JSON.parse(readFixture(text));
  const originals = JSON.parse(readFixture(csv(allLevels())));
  for (let index = 0; index < items.length; index++) {
    assert.deepEqual(items[index].themes, ['change', 'social-injustice']);
    const { themes, ...exercise } = items[index];
    assert.deepEqual(exercise, originals[index]);
  }
});

test('rejects invalid explicit theme tags and names the row', () => {
  for (const value of ['', 'Poverty', 'Family; family', 'Change;']) {
    const text = csv(allLevels().map(values => [...values, value])).replace(header, header + ',themes');
    assert.throws(() => readFixture(text), /Row 2.*themes/);
  }
});
