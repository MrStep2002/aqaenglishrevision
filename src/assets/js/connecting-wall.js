import { dealWall, shuffle } from './connecting-wall-logic.mjs';

const launch = document.querySelector('#play-connecting-wall');
const game = document.querySelector('#connecting-wall');

if (launch && game) {
  const bank = JSON.parse(game.querySelector('.wall-bank').textContent);
  const board = game.querySelector('.wall-board');
  const feedback = game.querySelector('.wall-feedback');
  const progress = game.querySelector('.wall-progress');
  const explanations = game.querySelector('.wall-explanations');
  const levelButtons = [...game.querySelectorAll('[data-wall-level]')];
  const actions = [...game.querySelectorAll('[data-wall-action]')];
  const newButton = game.querySelector('[data-wall-action="new"]');
  const timerButton = game.querySelector('.wall-timer');
  let level = 1;
  let wall = null;
  let order = [];
  let solved = [];
  const selected = new Set();
  let busy = false;
  let pending = null;
  let clock = null;
  let remaining = 180;
  let timerStarted = false;
  const complete = () => solved.length === 4;
  const groupOf = tile => Math.floor(tile / 4);

  function say(message, state = '') {
    feedback.textContent = message;
    feedback.dataset.state = state;
  }

  function paintTimer() {
    const time = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
    timerButton.textContent = clock ? `Pause ${time}` : remaining === 0 ? 'Restart timer' : timerStarted ? `Resume ${time}` : 'Timer: 3 min';
    timerButton.setAttribute('aria-label', clock ? `Pause timer, ${time} remaining` : remaining === 0 ? 'Restart the three-minute timer' : timerStarted ? `Resume timer, ${time} remaining` : 'Start a three-minute timer');
    timerButton.disabled = complete();
  }

  function pauseClock() {
    clearInterval(clock);
    clock = null;
    paintTimer();
  }

  function resetClock() {
    pauseClock();
    remaining = 180;
    timerStarted = false;
    paintTimer();
  }

  function cancelPending() {
    clearTimeout(pending);
    pending = null;
    busy = false;
  }

  function paintSelection() {
    board.querySelectorAll('[data-tile]').forEach(button => {
      button.setAttribute('aria-pressed', String(selected.has(Number(button.dataset.tile))));
      button.setAttribute('aria-disabled', String(busy));
    });
    actions.forEach(button => { button.disabled = busy; });
  }

  function renderBoard(focusFirst = false) {
    const focusedControlWillHide = complete() && actions.some(button => button === document.activeElement
      && ['shuffle', 'reveal'].includes(button.dataset.wallAction));
    const rows = document.createDocumentFragment();
    solved.forEach((index, colour) => {
      const group = wall[index];
      const row = document.createElement('section');
      row.className = 'wall-solved';
      row.dataset.colour = colour;
      row.dataset.groupId = group.id;
      const title = document.createElement('h3');
      title.textContent = group.name;
      const words = document.createElement('div');
      words.className = 'wall-solved-words';
      group.words.forEach(word => {
        const item = document.createElement('span');
        item.textContent = word;
        words.append(item);
      });
      row.append(title, words);
      rows.append(row);
    });
    const rest = order.filter(tile => !solved.includes(groupOf(tile)));
    for (let start = 0; start < rest.length; start += 4) {
      const row = document.createElement('div');
      row.className = 'wall-row';
      rest.slice(start, start + 4).forEach(tile => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'wall-tile';
        button.dataset.tile = tile;
        button.textContent = wall[groupOf(tile)].words[tile % 4];
        row.append(button);
      });
      rows.append(row);
    }
    board.replaceChildren(rows);
    progress.textContent = `${solved.length} of 4 groups`;
    game.dataset.state = complete() ? 'complete' : 'playing';
    game.dataset.level = level;
    explanations.hidden = !complete();
    if (!complete()) explanations.open = false;
    const notes = explanations.querySelector('ul');
    notes.replaceChildren();
    if (complete()) {
      solved.forEach(index => {
        const item = document.createElement('li');
        const title = document.createElement('strong');
        title.textContent = `${wall[index].name}: `;
        item.append(title, document.createTextNode(wall[index].explanation || wall[index].words.join(', ')));
        notes.append(item);
      });
    }
    actions.filter(button => ['shuffle', 'reveal'].includes(button.dataset.wallAction))
      .forEach(button => { button.hidden = complete(); });
    paintSelection();
    paintTimer();
    if (focusFirst || focusedControlWillHide) (board.querySelector('[data-tile]') || newButton).focus({ preventScroll: true });
  }

  function startWall(fresh) {
    cancelPending();
    if (fresh || !wall) {
      const next = dealWall(bank, level, wall || []);
      if (!next) {
        say('No wall is available. Try another level.');
        return;
      }
      wall = next;
    }
    solved = [];
    selected.clear();
    order = shuffle(Array.from({ length: 16 }, (_, index) => index));
    resetClock();
    renderBoard();
    game.querySelector('.wall-stage').scrollTop = 0;
    const mixed = wall.some(group => group.level !== level);
    say(mixed ? 'A nearby level is included to complete this wall.' : 'Find four groups of four.');
  }

  function finishGroup(index, shown, focusFirst) {
    if (solved.includes(index)) return;
    solved.push(index);
    selected.clear();
    let message = `${shown ? 'Shown' : 'Found'}: ${wall[index].name}.`;
    if (solved.length === 3) {
      const last = wall.findIndex((_, candidate) => !solved.includes(candidate));
      solved.push(last);
      message += ` The remaining group is ${wall[last].name}. Wall complete.`;
    } else {
      message += ` ${solved.length} of 4 groups.`;
    }
    if (complete()) pauseClock();
    renderBoard(focusFirst);
    say(message, 'correct');
  }

  function pick(tile) {
    if (busy || complete()) return;
    if (selected.has(tile)) selected.delete(tile);
    else if (selected.size < 4) selected.add(tile);
    paintSelection();
    if (selected.size < 4) {
      say(selected.size ? `${selected.size} of 4 words selected.` : 'Select four words that belong together.');
      return;
    }
    const indices = [...selected].map(groupOf);
    const correct = indices.every(index => index === indices[0]);
    busy = true;
    paintSelection();
    pending = setTimeout(() => {
      pending = null;
      if (correct) {
        busy = false;
        finishGroup(indices[0], false, true);
      } else {
        board.querySelectorAll('[aria-pressed="true"]').forEach(button => button.classList.add('is-wrong'));
        say('Those words do not form a group. Try again.', 'wrong');
        pending = setTimeout(() => {
          pending = null;
          busy = false;
          selected.clear();
          board.querySelectorAll('.is-wrong').forEach(button => button.classList.remove('is-wrong'));
          paintSelection();
        }, 520);
      }
    }, 260);
  }

  board.addEventListener('click', event => {
    const button = event.target.closest('[data-tile]');
    if (button) pick(Number(button.dataset.tile));
  });

  board.addEventListener('keydown', event => {
    const button = event.target.closest('[data-tile]');
    if (!button || busy || event.altKey || event.ctrlKey || event.metaKey) return;
    const buttons = [...board.querySelectorAll('[data-tile]')];
    const index = buttons.indexOf(button);
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 };
    let next;
    if (Object.hasOwn(steps, event.key)) next = index + steps[event.key];
    else if (event.key === 'Home') next = Math.floor(index / 4) * 4;
    else if (event.key === 'End') next = Math.floor(index / 4) * 4 + 3;
    else return;
    event.preventDefault();
    buttons[Math.max(0, Math.min(buttons.length - 1, next))].focus();
  });

  levelButtons.forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.wallLevel);
    if (next === level) return;
    level = next;
    levelButtons.forEach(option => option.setAttribute('aria-pressed', String(Number(option.dataset.wallLevel) === level)));
    startWall(true);
  }));

  actions.forEach(button => button.addEventListener('click', () => {
    if (busy) return;
    const action = button.dataset.wallAction;
    if (action === 'new' || action === 'restart') startWall(action === 'new');
    else if (action === 'shuffle') {
      const rest = shuffle(order.filter(tile => !solved.includes(groupOf(tile))));
      order = [...order.filter(tile => solved.includes(groupOf(tile))), ...rest];
      selected.clear();
      renderBoard();
      say('The remaining words have been shuffled.');
    } else if (action === 'reveal') {
      finishGroup(wall.findIndex((_, index) => !solved.includes(index)), true, false);
    }
  }));

  timerButton.addEventListener('click', () => {
    if (clock) return pauseClock();
    if (remaining === 0) remaining = 180;
    timerStarted = true;
    clock = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = 0;
        pauseClock();
        say('Time’s up. You can keep going.');
      }
      paintTimer();
    }, 1000);
    paintTimer();
  });

  launch.addEventListener('click', () => {
    if (!wall) startWall(true);
    if (!game.open) game.showModal();
    levelButtons.find(button => Number(button.dataset.wallLevel) === level).focus({ preventScroll: true });
  });

  game.addEventListener('close', () => {
    cancelPending();
    pauseClock();
    selected.clear();
    if (wall) renderBoard();
    launch.focus({ preventScroll: true });
  });

}
