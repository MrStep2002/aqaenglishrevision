import test from 'node:test';
import assert from 'node:assert/strict';
import readBank from '../src/_data/connectingWallBank.js';
import { dealWall } from '../src/assets/js/connecting-wall-logic.mjs';

const bank = JSON.parse(await readBank());
let seed = 20261119;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const signature = wall => wall.map(group => group.id).sort().join('|');

test('each level generates varied walls with sixteen unambiguous displayed words', () => {
  for (const level of [1, 2, 3]) {
    const contents = new Set();
    let previous = [];
    for (let turn = 0; turn < 200; turn += 1) {
      const wall = dealWall(bank, level, previous, random);
      assert.equal(wall.length, 4);
      assert.equal(new Set(wall.map(group => group.id)).size, 4);
      assert.ok(wall.every(group => group.level === level && group.words.length === 4));
      const words = wall.flatMap(group => group.words.map(word => word.toLowerCase()));
      assert.equal(new Set(words).size, 16);
      const pools = wall.map(group => bank.find(pool => pool.id === group.id));
      for (const word of words) {
        assert.equal(pools.filter(pool => pool.words.some(member => member.toLowerCase() === word)).length, 1);
      }
      if (previous.length) assert.notEqual(signature(wall), signature(previous));
      contents.add(signature(wall) + JSON.stringify(words));
      previous = wall;
    }
    assert.ok(contents.size > 30);
  }
});

const group = (id, level, words) => ({ id, level, name: id, words, explanation: '' });
const four = prefix => [1, 2, 3, 4].map(index => `${prefix}${index}`);

test('shared words are excluded even when an otherwise compatible pool has spare words', () => {
  const pools = [
    group('a', 1, [...four('a'), 'shared', 'SHARED TWO']),
    group('b', 1, [...four('b'), 'SHARED', 'shared two']),
    group('c', 1, four('c')),
    group('d', 1, four('d'))
  ];
  const wall = dealWall(pools, 1, [], random);
  assert.equal(wall.length, 4);
  assert.ok(wall.flatMap(item => item.words).every(word => !word.toLowerCase().startsWith('shared')));
});

test('the search can leave an incompatible early category to find a complete wall', () => {
  const pools = ['a', 'b', 'c', 'd'].map(id => group(id, 1, four(id)));
  pools.unshift(group('blocking', 1, ['a1', 'b1', 'c1', 'd1']));
  const wall = dealWall(pools, 1, [], () => .999);
  assert.equal(wall.length, 4);
  assert.ok(wall.every(item => item.id !== 'blocking'));
});

test('nearby levels fill a wall only when the requested level cannot supply four categories', () => {
  const pools = [group('a', 1, four('a')), ...['b', 'c', 'd'].map(id => group(id, 2, four(id))), group('e', 3, four('e'))];
  const wall = dealWall(pools, 1, [], random);
  assert.deepEqual(wall.map(item => item.level).sort(), [1, 2, 2, 2]);
});

test('a bank with unavoidable cross-membership has no valid wall', () => {
  const pools = ['a', 'b', 'c', 'd'].map(id => group(id, 1, ['one', 'two', 'three', 'four']));
  assert.equal(dealWall(pools, 1, [], random), null);
});
