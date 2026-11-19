(() => {
  const dialog = document.getElementById('quote-builder');
  const launcher = document.getElementById('play-quote-builder');
  const board = dialog.querySelector('.builder-board');
  const bank = dialog.querySelector('.builder-bank');
  const answer = dialog.querySelector('.builder-answer');
  const count = dialog.querySelector('.builder-count');
  const status = dialog.querySelector('.builder-status');
  const retry = dialog.querySelector('.builder-retry');
  const title = dialog.querySelector('h2');
  const rounds = JSON.parse(dialog.querySelector('.builder-data').textContent);
  let remaining = [];
  let tiles;
  let placed = 0;
  let advanceTimer;

  function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function showNext() {
    if (!dialog.open) return;
    if (!remaining.length) {
      remaining = shuffled(rounds);
      if (remaining.length > 1 && remaining.at(-1) === tiles) {
        const last = remaining.length - 1;
        [remaining[0], remaining[last]] = [remaining[last], remaining[0]];
      }
    }
    tiles = remaining.pop();
    const choices = shuffled(tiles);
    if (choices.every((tile, i) => tile === tiles[i])) {
      [choices[0], choices[1]] = [choices[1], choices[0]];
    }
    placed = 0;
    answer.replaceChildren();
    count.textContent = '0 / ' + tiles.length;
    bank.replaceChildren(...choices.map(tile => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'builder-tile';
      button.textContent = tile;
      return button;
    }));
    dialog.dataset.state = 'playing';
    retry.hidden = true;
    status.textContent = 'Choose the first tile.';
    board.scrollTop = 0;
    title.focus();
  }

  function pauseAfterSuccess() {
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(showNext, 750);
  }

  bank.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled || dialog.dataset.state !== 'playing') return;
    if (button.textContent !== tiles[placed]) {
      dialog.dataset.state = 'error';
      button.classList.add('is-mistake');
      for (const choice of bank.children) choice.disabled = true;
      status.textContent = '“' + button.textContent + '” comes later in the quotation.';
      retry.hidden = false;
      retry.focus();
      return;
    }

    const tile = document.createElement('span');
    tile.className = 'builder-tile';
    tile.setAttribute('role', 'listitem');
    tile.textContent = button.textContent;
    answer.append(tile);
    button.disabled = true;
    button.classList.add('is-placed');
    placed++;
    count.textContent = placed + ' / ' + tiles.length;
    if (placed === tiles.length) {
      dialog.dataset.state = 'complete';
      status.textContent = 'Correct! Quotation complete.';
      pauseAfterSuccess();
    } else {
      status.textContent = '“' + tile.textContent + '” placed. Choose the next tile.';
      if (event.detail === 0) bank.querySelector('button:enabled').focus();
    }
  });

  retry.addEventListener('click', () => {
    if (dialog.dataset.state !== 'error') return;
    for (const button of bank.children) {
      button.disabled = button.classList.contains('is-placed');
      button.classList.remove('is-mistake');
    }
    dialog.dataset.state = 'playing';
    retry.hidden = true;
    status.textContent = placed ? 'Choose the next tile.' : 'Choose the first tile.';
    bank.querySelector('button:enabled').focus();
  });

  launcher.addEventListener('click', () => {
    if (dialog.open) return;
    dialog.showModal();
    if (!tiles || dialog.dataset.state === 'complete') showNext();
    else if (dialog.dataset.state === 'error') retry.focus();
    else title.focus();
  });
  dialog.addEventListener('close', () => clearTimeout(advanceTimer));
})();
