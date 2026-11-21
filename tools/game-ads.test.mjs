import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const source = readFileSync(new URL('../src/assets/js/game-ads.js', import.meta.url), 'utf8');
const { chooseGameAds, gameAds, gameAdUrl } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const themePages = { change: 6, christmas: 7, compassion: 5, family: 4, greed: 8, 'social-injustice': 5 };

test('fixed adverts stay fixed and random slots exclude pinned games without repeats', () => {
  const slots = ['theme-revision', 'earnings-game', ...Array(6).fill('random')];
  for (const random of [() => 0, () => 0.5, () => 0.999999]) {
    const ids = chooseGameAds(slots, random).map(game => game.id);
    assert.deepEqual(ids.slice(0, 2), ['theme-revision', 'earnings-game']);
    assert.equal(new Set(ids).size, slots.length);
  }
  assert.deepEqual(slots, ['theme-revision', 'earnings-game', ...Array(6).fill('random')]);
});

test('every other game can appear in an unpinned random slot', () => {
  const ids = chooseGameAds(['theme-revision', ...Array(17).fill('random')]).map(game => game.id);
  assert.deepEqual(new Set(ids), new Set(gameAds.map(game => game.id)));
});

test('theme games retain the current theme and other games use their source lesson', () => {
  for (const game of gameAds) {
    assert.equal(gameAdUrl(game, '/a-christmas-carol/family'),
      `/a-christmas-carol/${game.theme ? 'family' : game.page}#play-${game.id}`);
    const portrait = new URL(`../src/assets/pictures/acc/game-${game.image}.jpg`, import.meta.url);
    const landscape = new URL(`../src/assets/pictures/acc/game-${game.image}-landscape.jpg`, import.meta.url);
    assert.ok(existsSync(portrait), `Missing portrait: ${game.id}`);
    assert.ok(existsSync(landscape), `Missing landscape: ${game.id}`);
  }
});

test('all theme pages have editable numbered slots with the required fixed adverts', () => {
  for (const [slug, count] of Object.entries(themePages)) {
    const html = readFileSync(new URL(`../src/a-christmas-carol/${slug}.html`, import.meta.url), 'utf8');
    const slots = [...html.matchAll(/<aside class="margin-card game-ad-slot" id="([^"]+)" data-game-slot="([^"]+)"/g)];
    assert.equal(slots.length, count, slug);
    assert.deepEqual(slots.map(slot => slot[1]), Array.from({ length: count }, (_, i) => `game-slot-${String(i + 1).padStart(2, '0')}`));
    assert.equal(slots[0][2], 'theme-revision', slug);
    assert.equal(slots[1][2], slug === 'greed' ? 'earnings-game' : 'random', slug);
    assert.ok(slots.slice(slug === 'greed' ? 2 : 1).every(slot => slot[2] === 'random'), slug);
    const launchers = ['play-theme-revision', 'play-plot-quiz', 'play-analysis-gaps'];
    if (slug === 'greed') launchers.push('play-earnings-game', 'play-plot-order', 'play-quote-recall');
    for (const id of launchers) {
      assert.equal([...html.matchAll(new RegExp(`id="${id}"`, 'g'))].length, 1, `${slug}: ${id}`);
    }
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${slug}: duplicate ID`);
  }
});
