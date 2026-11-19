import { makeWordsearch, selectionPath, selectionWord } from './wordsearch-logic.mjs?v=2';

const launch = document.getElementById('play-wordsearch');
const game = document.getElementById('wordsearch');
if (launch && game) {
  const grid = game.querySelector('.wordsearch-grid');
  const board = game.querySelector('.wordsearch-board');
  const lines = game.querySelector('.wordsearch-lines');
  const status = game.querySelector('.wordsearch-status');
  const count = game.querySelector('.wordsearch-count');
  const clueButton = game.querySelector('.wordsearch-clue');
  const revealButton = game.querySelector('.wordsearch-reveal');
  const wordList = game.querySelector('.wordsearch-words');
  const bank = JSON.parse(game.querySelector('.wordsearch-bank').textContent);
  const colours = ['#a5d7b4', '#edc47a', '#c2b4df', '#91cdd0', '#e7a8b5', '#c6d591', '#b2c4ed', '#e9b08b'];
  let puzzle, cells = [], found = new Map(), revealed = new Set(), drag = null, keyboardStart = null, preview = [], focused = 0, hinted = null;

  function fitViewport() {
    const view = window.visualViewport;
    if (!game.open || !view || view.scale > 1.01) return;
    game.style.setProperty('--wordsearch-view-left', view.offsetLeft + 'px');
    game.style.setProperty('--wordsearch-view-top', view.offsetTop + 'px');
  }
  window.visualViewport?.addEventListener('scroll', fitViewport);
  window.visualViewport?.addEventListener('resize', fitViewport);

  function drawLines() {
    const paths = [...found.values()].map((path, i) => [path, colours[i % colours.length]]);
    if (preview.length > 1) paths.push([preview, '#e8bf74']);
    lines.replaceChildren(...paths.map(([path, colour]) => {
      const first = path[0], last = path.at(-1);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      for (const [name, value] of Object.entries({ x1: first % 10 + .5, y1: Math.floor(first / 10) + .5, x2: last % 10 + .5, y2: Math.floor(last / 10) + .5, stroke: colour })) line.setAttribute(name, value);
      return line;
    }));
    const selected = new Set(preview);
    cells.forEach((cell, i) => cell.setAttribute('aria-selected', String(selected.has(i))));
  }
  function cancel() {
    const pointer = drag?.id;
    drag = null; keyboardStart = null; preview = [];
    if (pointer != null && grid.hasPointerCapture(pointer)) grid.releasePointerCapture(pointer);
    drawLines();
  }
  function focusCell(index) {
    if (!cells[index]) return;
    if (cells[focused]) cells[focused].tabIndex = -1;
    focused = index;
    cells[index].tabIndex = 0;
    cells[index].focus({ preventScroll: true });
  }
  function labelCells() {
    const used = new Set([...found.values()].flat());
    cells.forEach((cell, i) => {
      cell.setAttribute('aria-label', cell.textContent + ', row ' + (Math.floor(i / 10) + 1) + ', column ' + (i % 10 + 1) + (used.has(i) ? ', found' : '') + (hinted?.cells[0] === i ? ', first letter of a hidden word' : ''));
    });
  }
  function clearClue() {
    if (hinted) cells[hinted.cells[0]]?.classList.remove('is-clue');
    hinted = null;
    labelCells();
  }
  function showClue() {
    if (!puzzle) return;
    const remaining = puzzle.placements.filter(entry => !found.has(entry.word));
    if (!remaining.length) return;
    const different = remaining.filter(entry => entry.word !== hinted?.word);
    const choices = different.length ? different : remaining;
    const next = choices[Math.floor(Math.random() * choices.length)];
    cancel(); clearClue();
    hinted = next;
    const first = next.cells[0];
    cells[first].classList.add('is-clue');
    labelCells();
    status.textContent = 'Try ' + next.word[0] + ' at row ' + (Math.floor(first / 10) + 1) + ', column ' + (first % 10 + 1) + '.';
  }
  function showWordList() {
    wordList.replaceChildren(...puzzle.words.map((word, index) => {
      const item = document.createElement('li');
      const visible = revealed.has(word), complete = found.has(word);
      item.className = 'wordsearch-word' + (complete ? ' is-found' : visible ? '' : ' is-unrevealed');
      item.setAttribute('aria-label', visible ? word + (complete ? ', found' : '') : 'Word ' + (index + 1) + ' not revealed');
      const label = document.createElement('span');
      label.textContent = visible ? word : '—';
      const tick = document.createElement('span');
      tick.setAttribute('aria-hidden', 'true');
      tick.textContent = complete ? '✓' : '';
      item.append(label, tick);
      return item;
    }));
    revealButton.disabled = revealed.size === puzzle.words.length;
  }
  function revealWord() {
    if (!puzzle) return;
    const word = puzzle.words.find(word => !revealed.has(word));
    if (!word) return;
    cancel();
    revealed.add(word);
    showWordList();
    const item = wordList.children[puzzle.words.indexOf(word)];
    const bounds = item.getBoundingClientRect(), box = wordList.getBoundingClientRect();
    if (bounds.bottom > box.bottom) wordList.scrollTop += bounds.bottom - box.bottom + 2;
    else if (bounds.top < box.top) wordList.scrollTop += bounds.top - box.top - 2;
    status.textContent = word + ' revealed.';
  }
  function accept(path) {
    preview = [];
    if (path.length < 2) { drawLines(); return; }
    const text = selectionWord(puzzle.grid, path);
    const backwards = [...text].reverse().join('');
    const word = puzzle.words.find(word => word === text || word === backwards);
    if (!word) status.textContent = 'Try another word.';
    else if (found.has(word)) status.textContent = word + ' is already found.';
    else {
      found.set(word, path);
      revealed.add(word);
      showWordList();
      const complete = found.size === puzzle.words.length;
      if (hinted?.word === word) clearClue();
      clueButton.disabled = complete;
      status.textContent = complete ? 'You found all ' + found.size + ' words!' : word + ' found.';
      count.textContent = found.size + ' / ' + puzzle.words.length;
      count.setAttribute('aria-label', found.size + ' of ' + puzzle.words.length + ' words found');
      board.classList.toggle('is-complete', complete);
      labelCells();
    }
    drawLines();
  }
  function deal(focus = true) {
    cancel(); clearClue();
    try { puzzle = makeWordsearch(bank); }
    catch (error) { status.textContent = 'Could not make a grid. Try New grid.'; return; }
    found = new Map(); revealed = new Set(); focused = 0; cells = [];
    clueButton.disabled = false;
    board.classList.remove('is-complete');
    grid.replaceChildren(...puzzle.grid.map((letters, row) => {
      const line = document.createElement('div');
      line.className = 'wordsearch-row';
      line.setAttribute('role', 'row');
      line.setAttribute('aria-rowindex', row + 1);
      line.append(...letters.map((letter, col) => {
        const cell = document.createElement('button');
        const index = row * 10 + col;
        cell.type = 'button';
        cell.className = 'wordsearch-cell';
        cell.dataset.index = index;
        cell.textContent = letter;
        cell.tabIndex = index === 0 ? 0 : -1;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-colindex', col + 1);
        cell.setAttribute('aria-label', letter + ', row ' + (row + 1) + ', column ' + (col + 1));
        cells.push(cell);
        return cell;
      }));
      return line;
    }));
    count.textContent = '0 / ' + puzzle.words.length;
    count.setAttribute('aria-label', '0 of ' + puzzle.words.length + ' words found');
    status.textContent = '';
    showWordList();
    wordList.scrollTop = 0;
    drawLines();
    if (focus) focusCell(0);
  }
  function cellAt(event) {
    const bounds = grid.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    if (x < 0 || y < 0 || x >= bounds.width || y >= bounds.height) return null;
    return Math.floor(y / bounds.height * 10) * 10 + Math.floor(x / bounds.width * 10);
  }
  grid.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary || drag) return;
    const cell = event.target.closest('[data-index]');
    if (!cell) return;
    event.preventDefault();
    cancel();
    const index = Number(cell.dataset.index);
    focusCell(index);
    drag = { id: event.pointerId, start: index };
    preview = [index];
    grid.setPointerCapture(event.pointerId);
    drawLines();
  });
  grid.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    const end = cellAt(event);
    preview = end == null ? [] : selectionPath(drag.start, end, 10, true);
    drawLines();
  });
  grid.addEventListener('pointerup', event => {
    if (drag?.id !== event.pointerId) return;
    const end = cellAt(event), start = drag.start;
    cancel();
    if (end != null) {
      accept(selectionPath(start, end, 10, true));
      focusCell(end);
    }
  });
  for (const name of ['pointercancel', 'lostpointercapture']) grid.addEventListener(name, event => {
    if (drag?.id === event.pointerId) cancel();
  });
  grid.addEventListener('keydown', event => {
    const cell = event.target.closest('[data-index]');
    if (!cell || event.altKey || event.metaKey || event.ctrlKey) return;
    const index = Number(cell.dataset.index), row = Math.floor(index / 10), col = index % 10;
    const moves = { ArrowLeft: row * 10 + Math.max(0, col - 1), ArrowRight: row * 10 + Math.min(9, col + 1), ArrowUp: Math.max(0, row - 1) * 10 + col, ArrowDown: Math.min(9, row + 1) * 10 + col, Home: row * 10, End: row * 10 + 9 };
    if (Object.hasOwn(moves, event.key)) {
      event.preventDefault();
      focusCell(moves[event.key]);
      if (keyboardStart != null) { preview = selectionPath(keyboardStart, moves[event.key]); drawLines(); }
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (event.repeat) return;
      if (keyboardStart == null) {
        cancel(); keyboardStart = index; preview = [index];
        status.textContent = 'Select the last letter.'; drawLines();
      } else {
        const start = keyboardStart;
        cancel(); accept(selectionPath(start, index));
      }
    }
  });
  game.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (drag || keyboardStart != null)) {
      event.preventDefault(); event.stopPropagation(); cancel();
    }
  });
  game.querySelector('.wordsearch-new').addEventListener('click', () => deal());
  clueButton.addEventListener('click', showClue);
  revealButton.addEventListener('click', revealWord);
  launch.addEventListener('click', () => {
    launch.focus({ preventScroll: true });
    if (!puzzle) deal(false);
    if (!game.open) game.showModal();
    fitViewport();
    focusCell(focused);
  });
  game.addEventListener('close', () => { cancel(); launch.focus({ preventScroll: true }); });
  window.addEventListener('blur', cancel);
}
