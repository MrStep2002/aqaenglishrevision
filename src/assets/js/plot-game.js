(() => {
  const dialog = document.querySelector('.plot-game');
  const launch = document.querySelector('.quote-launch');
  const list = dialog.querySelector('.plot-events');
  const feedback = dialog.querySelector('.plot-feedback');
  const check = dialog.querySelector('.plot-check');
  const next = dialog.querySelector('.plot-new');
  let staves;
  let loading = false;
  let dragged;
  let advanceTimer;

  function readMoments(csv) {
    const [header, ...lines] = csv.trim().split(/\r?\n/);
    if (header !== 'order,stave,moment') throw new Error('Invalid plot CSV header');
    const groups = Array.from({ length: 5 }, () => []);
    const orders = new Set();
    for (const line of lines) {
      if (!line.trim()) continue;
      const row = /^(\d+),([1-5]),"((?:[^"]|"")+)"$/.exec(line);
      if (!row) throw new Error('Invalid plot CSV row');
      const [, order, stave, text] = row;
      const position = Number(order);
      if (orders.has(position)) throw new Error('Duplicate plot order');
      orders.add(position);
      groups[Number(stave) - 1].push({ order: position, text: text.replaceAll('""', '"') });
    }
    if (groups.some(group => group.length === 0)) throw new Error('Missing stave');
    return groups;
  }

  function updateArrows() {
    const rows = [...list.children];
    rows.forEach((row, index) => {
      const [up, down] = row.querySelectorAll('button');
      up.setAttribute('aria-disabled', String(index === 0));
      down.setAttribute('aria-disabled', String(index === rows.length - 1));
    });
  }

  function move(row, target) {
    if (!target || row === target) return;
    const rows = [...list.children];
    if (rows.indexOf(row) < rows.indexOf(target)) target.after(row);
    else target.before(row);
    updateArrows();
    feedback.textContent = '';
    dialog.removeAttribute('data-result');
  }

  function makeCard(moment) {
    const row = document.createElement('li');
    row.draggable = true;
    row.dataset.order = moment.order;
    const text = document.createElement('span');
    text.textContent = moment.text;
    const controls = document.createElement('div');
    controls.className = 'plot-move';
    for (const [arrow, direction, neighbour] of [
      ['↑', 'up', 'previousElementSibling'],
      ['↓', 'down', 'nextElementSibling'],
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = arrow;
      button.setAttribute('aria-label', 'Move ' + direction + ': ' + moment.text);
      button.addEventListener('click', () => {
        move(row, row[neighbour]);
        button.focus();
      });
      controls.append(button);
    }
    row.append(text, controls);
    return row;
  }

  function startRound() {
    clearTimeout(advanceTimer);
    finishDrag();
    dialog.removeAttribute('data-result');
    list.inert = false;
    const moments = staves.map(stave => stave[Math.floor(Math.random() * stave.length)]);
    for (let i = moments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [moments[i], moments[j]] = [moments[j], moments[i]];
    }
    if (inOrder(moments.map(moment => moment.order))) {
      [moments[0], moments[1]] = [moments[1], moments[0]];
    }
    list.replaceChildren(...moments.map(makeCard));
    updateArrows();
    feedback.textContent = '';
    check.disabled = false;
  }

  function inOrder(positions) {
    return positions.every((position, index) => index === 0 || position > positions[index - 1]);
  }

  async function loadMoments() {
    loading = true;
    next.disabled = true;
    feedback.textContent = 'Loading plot events…';
    try {
      const response = await fetch(dialog.dataset.moments);
      if (!response.ok) throw new Error('Could not fetch plot events');
      staves = readMoments(await response.text());
      startRound();
    } catch (error) {
      console.error(error);
      feedback.textContent = 'The plot events could not load. Try again.';
    } finally {
      loading = false;
      next.textContent = staves ? 'New round' : 'Try again';
      next.disabled = false;
    }
  }

  launch.addEventListener('click', () => {
    dialog.showModal();
    if (!staves && !loading) loadMoments();
  });
  next.addEventListener('click', () => {
    if (staves) startRound();
    else if (!loading) loadMoments();
  });
  check.addEventListener('click', () => {
    const positions = [...list.children].map(row => Number(row.dataset.order));
    const correct = inOrder(positions);
    dialog.removeAttribute('data-result');
    // Restart the pulse if the same order is checked twice.
    void dialog.offsetWidth;
    dialog.dataset.result = correct ? 'correct' : 'incorrect';
    feedback.textContent = correct ? 'Correct! All five events are in order.' :
      'Some events are out of order. Move them and check again.';
    if (correct) {
      check.disabled = true;
      list.inert = true;
      advanceTimer = setTimeout(startRound, 1000);
    }
  });

  list.addEventListener('dragstart', event => {
    dragged = event.target.closest('li');
    if (!dragged) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dragged.dataset.order);
  });
  // The native preview has been captured by the time the first drag event fires.
  list.addEventListener('drag', () => {
    if (dragged) dragged.classList.add('plot-dragging');
  });
  list.addEventListener('dragover', event => {
    const target = event.target.closest('li');
    if (!dragged || !target || target === dragged) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    target.classList.add('plot-target');
  });
  list.addEventListener('dragleave', event => {
    const target = event.target.closest('li');
    if (target && !target.contains(event.relatedTarget)) target.classList.remove('plot-target');
  });
  list.addEventListener('drop', event => {
    if (!dragged) return;
    event.preventDefault();
    move(dragged, event.target.closest('li'));
    finishDrag();
  });

  function finishDrag() {
    if (!dragged) return;
    dragged.classList.remove('plot-dragging');
    dragged = undefined;
    list.querySelectorAll('.plot-target').forEach(row => row.classList.remove('plot-target'));
  }

  list.addEventListener('dragend', finishDrag);
  dialog.addEventListener('close', finishDrag);
})();
