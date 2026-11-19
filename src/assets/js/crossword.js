(() => {
  const game = document.querySelector('.quote-game.crossword');
  if (!game) return;

  const bank = JSON.parse(game.querySelector('.quiz-bank').textContent);
  const grid = game.querySelector('.crossword-grid');
  const status = game.querySelector('.crossword-status');
  const acrossList = game.querySelector('[data-clues="across"]');
  const downList = game.querySelector('[data-clues="down"]');
  const pool = bank.words;
  const target = Math.min(8, pool.length);
  const minimum = Math.min(6, pool.length);

  let puzzle = null;
  let entries = [];
  let rows = 0;
  let columns = 0;
  const solution = new Map();
  const letters = new Map();
  const cellButtons = new Map();
  let selected = 0;
  let cursor = null;
  let checked = false;

  const key = (row, column) => `${row},${column}`;
  const cellsOf = entry => [...entry.word].map((_, offset) => ({
    row: entry.row + (entry.direction === 'down' ? offset : 0),
    column: entry.column + (entry.direction === 'across' ? offset : 0)
  }));
  const entryAt = (row, column, direction) => entries.findIndex(entry => (
    entry.direction === direction && cellsOf(entry).some(cell => cell.row === row && cell.column === column)
  ));
  const shuffle = list => {
    const copy = [...list];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  };

  function deal() {
    let best = null;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const placed = pack(shuffle(pool));
      if (!placed || placed.entries.length < minimum) continue;
      const span = Math.max(placed.rows, placed.columns);
      if (!best || placed.entries.length > best.entries.length || (placed.entries.length === best.entries.length && span < Math.max(best.rows, best.columns))) {
        best = placed;
      }
      if (placed.entries.length >= target && span <= 12) break;
    }
    puzzle = best;
    entries = puzzle.entries;
    rows = puzzle.rows;
    columns = puzzle.columns;
    solution.clear();
    letters.clear();
    checked = false;
    entries.forEach(entry => {
      cellsOf(entry).forEach((cell, offset) => solution.set(key(cell.row, cell.column), entry.word[offset].toUpperCase()));
    });
    draw();
    const first = entries.reduce((choice, entry, index) => (
      entry.direction === 'across' && (choice < 0 || entry.number < entries[choice].number) ? index : choice
    ), -1);
    selectEntry(first === -1 ? 0 : first, true);
  }

  function pack(words) {
    const board = new Board();
    board.place(words[0], 0, 0, Math.random() < 0.5);
    shuffle(words.slice(1)).forEach(entry => {
      if (board.placed.length >= target) return;
      const options = board.options(entry.word).filter(option => option.span <= 12);
      if (!options.length) return;
      const best = options[0].crosses;
      const shortlist = options.filter(option => option.crosses === best).slice(0, 4);
      const choice = shortlist[Math.floor(Math.random() * shortlist.length)];
      board.place(entry, choice.row, choice.column, choice.down);
    });
    if (board.placed.length < minimum) return null;
    return finish(board.placed);
  }

  function finish(placed) {
    const minRow = Math.min(...placed.map(entry => entry.row));
    const minColumn = Math.min(...placed.map(entry => entry.column));
    const built = placed.map(entry => ({
      word: entry.word,
      clue: entry.clue,
      direction: entry.down ? 'down' : 'across',
      row: entry.row - minRow + 1,
      column: entry.column - minColumn + 1
    }));
    const starts = new Map();
    built.forEach(entry => {
      const square = key(entry.row, entry.column);
      if (!starts.has(square)) starts.set(square, []);
      starts.get(square).push(entry);
    });
    [...starts.keys()].sort((a, b) => {
      const [aRow, aColumn] = a.split(',').map(Number);
      const [bRow, bColumn] = b.split(',').map(Number);
      return aRow - bRow || aColumn - bColumn;
    }).forEach((square, index) => starts.get(square).forEach(entry => { entry.number = index + 1; }));
    return {
      entries: built,
      rows: Math.max(...built.map(entry => entry.row + (entry.direction === 'down' ? entry.word.length - 1 : 0))),
      columns: Math.max(...built.map(entry => entry.column + (entry.direction === 'across' ? entry.word.length - 1 : 0)))
    };
  }

  function draw() {
    grid.replaceChildren();
    acrossList.replaceChildren();
    downList.replaceChildren();
    cellButtons.clear();
    grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    const numbers = new Map(entries.map(entry => [key(entry.row, entry.column), entry.number]));
    for (let row = 1; row <= rows; row += 1) {
      for (let column = 1; column <= columns; column += 1) {
        const id = key(row, column);
        if (!solution.has(id)) {
          const block = document.createElement('div');
          block.className = 'crossword-block';
          block.setAttribute('aria-hidden', 'true');
          grid.append(block);
          continue;
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'crossword-cell';
        button.setAttribute('aria-label', `Row ${row}, column ${column}`);
        if (numbers.has(id)) {
          const number = document.createElement('sup');
          number.textContent = numbers.get(id);
          button.append(number);
        }
        const letter = document.createElement('span');
        letter.className = 'crossword-letter';
        button.append(letter);
        button.addEventListener('click', () => chooseCell(row, column));
        grid.append(button);
        cellButtons.set(id, button);
      }
    }
    entries.forEach((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'crossword-clue';
      button.dataset.index = index;
      const number = document.createElement('span');
      number.textContent = entry.number;
      button.append(number, document.createTextNode(entry.clue));
      button.addEventListener('click', () => selectEntry(index, true));
      (entry.direction === 'across' ? acrossList : downList).append(button);
    });
    [acrossList, downList].forEach(list => {
      [...list.children]
        .sort((a, b) => Number(a.querySelector('span').textContent) - Number(b.querySelector('span').textContent))
        .forEach(button => list.append(button));
    });
  }

  function chooseCell(row, column) {
    const same = cursor && cursor.row === row && cursor.column === column;
    const across = entryAt(row, column, 'across');
    const down = entryAt(row, column, 'down');
    const current = entries[selected];
    const inCurrent = current && cellsOf(current).some(cell => cell.row === row && cell.column === column);
    let index = across === -1 ? down : across;
    if (same && across !== -1 && down !== -1) index = current.direction === 'across' ? down : across;
    else if (inCurrent) index = selected;
    cursor = { row, column };
    selectEntry(index, false);
  }

  function selectEntry(index, fromStart) {
    if (index < 0) return;
    selected = index;
    const cells = cellsOf(entries[index]);
    const inside = cursor && cells.some(cell => cell.row === cursor.row && cell.column === cursor.column);
    if (fromStart || !inside) cursor = cells[0];
    paint();
  }

  function paint() {
    const cells = new Set(cellsOf(entries[selected]).map(cell => key(cell.row, cell.column)));
    cellButtons.forEach((button, id) => {
      const guess = letters.get(id) || '';
      button.classList.toggle('is-selected', cells.has(id));
      button.classList.toggle('is-current', cursor && id === key(cursor.row, cursor.column));
      button.classList.toggle('is-wrong', checked && guess && guess !== solution.get(id));
      button.classList.toggle('is-right', checked && guess === solution.get(id));
      button.querySelector('.crossword-letter').textContent = guess;
    });
    game.querySelectorAll('.crossword-clue').forEach(button => {
      button.classList.toggle('is-current', Number(button.dataset.index) === selected);
    });
    const complete = [...solution.keys()].every(id => letters.get(id) === solution.get(id));
    status.textContent = complete ? 'Complete.' : '';
  }

  function revealLetter() {
    const cells = cellsOf(entries[selected]);
    const start = Math.max(0, cells.findIndex(cell => cursor && cell.row === cursor.row && cell.column === cursor.column));
    const ordered = [...cells.slice(start), ...cells.slice(0, start)];
    let target = ordered.find(cell => letters.get(key(cell.row, cell.column)) !== solution.get(key(cell.row, cell.column)));
    if (!target) {
      target = [...solution.keys()].map(id => {
        const [row, column] = id.split(',').map(Number);
        return { row, column };
      }).find(cell => letters.get(key(cell.row, cell.column)) !== solution.get(key(cell.row, cell.column)));
    }
    if (!target) return;
    checked = false;
    letters.set(key(target.row, target.column), solution.get(key(target.row, target.column)));
    const index = cells.findIndex(cell => cell.row === target.row && cell.column === target.column);
    cursor = index >= 0 && index < cells.length - 1 ? cells[index + 1] : target;
    if (index < 0) {
      const across = entryAt(target.row, target.column, 'across');
      selectEntry(across === -1 ? entryAt(target.row, target.column, 'down') : across, false);
      return;
    }
    paint();
  }

  function typeLetter(letter) {
    if (!cursor) return;
    checked = false;
    letters.set(key(cursor.row, cursor.column), letter);
    const cells = cellsOf(entries[selected]);
    const index = cells.findIndex(cell => cell.row === cursor.row && cell.column === cursor.column);
    if (index < cells.length - 1) cursor = cells[index + 1];
    paint();
  }

  function backspace() {
    if (!cursor) return;
    checked = false;
    const cells = cellsOf(entries[selected]);
    const index = cells.findIndex(cell => cell.row === cursor.row && cell.column === cursor.column);
    if (!letters.get(key(cursor.row, cursor.column)) && index > 0) cursor = cells[index - 1];
    letters.delete(key(cursor.row, cursor.column));
    paint();
  }

  function move(rowStep, columnStep) {
    if (!cursor) return;
    let row = cursor.row;
    let column = cursor.column;
    do {
      row += rowStep;
      column += columnStep;
    } while (row >= 1 && column >= 1 && row <= rows && column <= columns && !solution.has(key(row, column)));
    if (!solution.has(key(row, column))) return;
    const direction = rowStep ? 'down' : 'across';
    const preferred = entryAt(row, column, direction);
    cursor = { row, column };
    selectEntry(preferred === -1 ? entryAt(row, column, direction === 'down' ? 'across' : 'down') : preferred, false);
  }

  class Board {
    constructor() {
      this.letters = new Map();
      this.placed = [];
    }

    place(entry, row, column, down) {
      const stepRow = down ? 1 : 0;
      const stepColumn = down ? 0 : 1;
      this.placed.push({ ...entry, row, column, down });
      [...entry.word].forEach((letter, offset) => {
        this.letters.set(key(row + stepRow * offset, column + stepColumn * offset), letter);
      });
    }

    options(word) {
      const seen = new Set();
      const found = [];
      this.placed.forEach(entry => {
        const stepRow = entry.down ? 1 : 0;
        const stepColumn = entry.down ? 0 : 1;
        [...entry.word].forEach((letter, index) => {
          [...word].forEach((candidate, offset) => {
            if (candidate !== letter) return;
            const down = !entry.down;
            const row = entry.row + stepRow * index - (down ? offset : 0);
            const column = entry.column + stepColumn * index - (down ? 0 : offset);
            const id = `${row},${column},${down}`;
            if (seen.has(id) || !this.fits(word, row, column, down)) return;
            seen.add(id);
            found.push({ row, column, down, crosses: this.fits(word, row, column, down), span: this.span(word, row, column, down) });
          });
        });
      });
      return found.sort((a, b) => b.crosses - a.crosses || a.span - b.span || a.row - b.row || a.column - b.column);
    }

    fits(word, row, column, down) {
      const stepRow = down ? 1 : 0;
      const stepColumn = down ? 0 : 1;
      if (this.letters.has(key(row - stepRow, column - stepColumn))) return 0;
      if (this.letters.has(key(row + stepRow * word.length, column + stepColumn * word.length))) return 0;
      let crosses = 0;
      let previousFilled = false;
      for (let offset = 0; offset < word.length; offset += 1) {
        const cellRow = row + stepRow * offset;
        const cellColumn = column + stepColumn * offset;
        const existing = this.letters.get(key(cellRow, cellColumn));
        if (existing) {
          if (existing !== word[offset] || previousFilled) return 0;
          crosses += 1;
          previousFilled = true;
        } else {
          previousFilled = false;
          if (this.letters.has(key(cellRow + stepColumn, cellColumn + stepRow)) || this.letters.has(key(cellRow - stepColumn, cellColumn - stepRow))) return 0;
        }
      }
      return crosses;
    }

    span(word, row, column, down) {
      let minRow = row;
      let maxRow = row + (down ? word.length - 1 : 0);
      let minColumn = column;
      let maxColumn = column + (down ? 0 : word.length - 1);
      this.letters.forEach((letter, square) => {
        const [cellRow, cellColumn] = square.split(',').map(Number);
        minRow = Math.min(minRow, cellRow);
        maxRow = Math.max(maxRow, cellRow);
        minColumn = Math.min(minColumn, cellColumn);
        maxColumn = Math.max(maxColumn, cellColumn);
      });
      return Math.max(maxRow - minRow + 1, maxColumn - minColumn + 1);
    }
  }

  game.querySelector('.crossword-check').addEventListener('click', () => {
    checked = true;
    paint();
  });
  game.querySelector('.crossword-reveal').addEventListener('click', () => {
    revealLetter();
    game.focus();
  });
  game.querySelector('.crossword-new').addEventListener('click', () => {
    deal();
    game.focus();
  });

  window.addEventListener('keydown', event => {
    if (!game.open || event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (/^[a-z]$/i.test(event.key)) {
      event.preventDefault();
      typeLetter(event.key.toUpperCase());
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      backspace();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(0, -1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(0, 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1, 0);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1, 0);
    }
  });

  document.querySelector('#play-crossword')?.addEventListener('click', () => {
    const opening = !game.open;
    if (opening) game.showModal();
    if (opening || !puzzle) deal();
    setTimeout(() => game.focus(), 0);
  });
})();
