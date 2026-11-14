(() => {
  const dialog = document.querySelector('.picture-planner');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const techniques = [
    ["Starts with an ‘ing word", "Swirling around like stardust, the snowfall left me breathless."],
    ["Starts with an adverb", "Gently drifting down, the snow made the world seem like it had slowed."],
    ["The two simile sentence", "It fell like a graceful dancer, like a slow-motion, acrobatic dream."],
    ["Five words exactly", "It was purely, simply: astonishing"],
    ["Uses onomatopoeia", "The drifts crunched underfoot as I moved through them"],
    ["The past tense verb – ‘ed starter", "Rested and calm, I headed for home."],
    ["End with ellipses", "But that wasn’t the end…"],
    ["Starts with a conjunction", "Because really the world was just sleeping"],
    ["Be three words long", "A magical creation"],
    ["A rhetorical question", "Was there anything more beautiful?"],
    ["Contains a metaphor", "A thick blanket of snow."],
    ["3 adjectives in a row", "I couldn’t believe my eyes: graceful, delicate, soft."],
    ["A so, so sentence", "It was so incredible to watch, so unforgettable to have been there."],
    ["Starts with a verb", "Drawing a deep breath, I stepped into the wasteland"],
    ["Uses personification", "The cold slipped its fingers around my throat."],
    ["Contains two wow words", "A petrifying tempest, a boreal blast"],
    ["Rhyme", "It was a circus show of falling snow, and one that only I would know."],
    ["Starts with a preposition", "In the centre of it all I found myself"],
    ["Starts with three adjectives", "Delicate, crisp, fragile; the snow surrounded me as far as I could see."],
    ["Contains three ing words in a row", "Drifting, dancing, tumbling; the most beautiful thing I’d ever seen."],
    ["Contains alliteration", "A terrible tempest of touch, like a boreal blast from above."],
    ["Contains sibilance", "Slipping and sliding, I sliced my knees."],
    ["Contains assonance", "It was a dry, wild kind of sky."],
    ["Contains a sub clause", "I moved through it with care, there were invisible rocks after all, but made it to the summit."],
    ["Uses repetition", "I’d keep going even though I was cold; I’d keep going even though I was tired; I’d keep going even though I was wet. I’d keep going."],
    ["Contains a complex list", "It was silent, except the sound of my feet as they crunched through the drifts; the sound of the birds as they sang in the trees; and the sounds of my thoughts as they drifted away."],
  ];
  const stage = dialog.querySelector('.planner-stage');
  const image = stage.querySelector('img');
  const grid = stage.querySelector('.planner-grid');
  const marks = stage.querySelector('.planner-marks');
  const cursor = stage.querySelector('.planner-cursor');
  const hint = dialog.querySelector('.planner-hint');
  const status = dialog.querySelector('.planner-status');
  const gridToggle = dialog.querySelector('[data-grid-toggle]');
  const circleToggle = dialog.querySelector('[data-circle-toggle]');
  const undo = dialog.querySelector('[data-undo]');
  const fields = dialog.querySelector('.planner-fields');
  const senses = fields.querySelectorAll('[data-sense]');
  const letters = fields.querySelector('#planner-letters');
  const results = fields.querySelector('#planner-techniques');
  let launcher;
  let circleMode = false;
  let x = 50;
  let y = 50;

  function setCircleMode(enabled) {
    circleMode = enabled;
    circleToggle.setAttribute('aria-pressed', enabled);
    hint.hidden = !enabled;
    cursor.hidden = true;
    if (enabled) stage.tabIndex = 0;
    else stage.removeAttribute('tabindex');
  }

  function position(element, left, top) {
    element.style.left = left + '%';
    element.style.top = top + '%';
  }

  function updateMarks() {
    const count = marks.childElementCount;
    undo.disabled = count === 0;
    status.textContent = count === 1 ? '1 circle' : count + ' circles';
  }

  function addCircle(left, top) {
    const mark = document.createElement('span');
    position(mark, left, top);
    marks.append(mark);
    updateMarks();
  }

  const gallery = document.querySelector('[data-picture-planner]');
  gallery.querySelectorAll('a').forEach(link => link.setAttribute('aria-haspopup', 'dialog'));
  gallery.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    launcher = link;
    image.alt = link.querySelector('img').alt;
    image.src = link.href;
    dialog.showModal();
  });

  dialog.addEventListener('close', () => {
    fields.reset();
    results.replaceChildren();
    senses.forEach(button => { button.querySelector('span').textContent = '0'; });
    marks.replaceChildren();
    status.textContent = '';
    undo.disabled = true;
    grid.hidden = true;
    gridToggle.setAttribute('aria-pressed', 'false');
    setCircleMode(false);
    x = y = 50;
    image.removeAttribute('src');
    launcher.focus();
  });

  gridToggle.addEventListener('click', () => {
    grid.hidden = !grid.hidden;
    gridToggle.setAttribute('aria-pressed', !grid.hidden);
  });
  circleToggle.addEventListener('click', () => setCircleMode(!circleMode));
  undo.addEventListener('click', () => {
    marks.lastElementChild?.remove();
    updateMarks();
    if (undo.disabled) circleToggle.focus();
  });
  stage.addEventListener('click', event => {
    if (!circleMode || !image.naturalWidth) return;
    const bounds = stage.getBoundingClientRect();
    addCircle(100 * (event.clientX - bounds.left) / bounds.width,
      100 * (event.clientY - bounds.top) / bounds.height);
  });
  stage.addEventListener('keydown', event => {
    if (!circleMode) return;
    switch (event.key) {
      case 'ArrowLeft': x = Math.max(0, x - 3); break;
      case 'ArrowRight': x = Math.min(100, x + 3); break;
      case 'ArrowUp': y = Math.max(0, y - 3); break;
      case 'ArrowDown': y = Math.min(100, y + 3); break;
      case 'Enter':
      case ' ': if (image.naturalWidth) addCircle(x, y); break;
      default: return;
    }
    event.preventDefault();
    cursor.hidden = false;
    position(cursor, x, y);
  });
  stage.addEventListener('blur', () => { cursor.hidden = true; });

  fields.addEventListener('submit', event => event.preventDefault());
  senses.forEach(button => {
    button.addEventListener('click', () => {
      const count = button.querySelector('span');
      count.textContent = Number(count.textContent) + 1;
    });
  });
  letters.addEventListener('input', () => {
    const selected = letters.value.toLowerCase().match(/[a-z]/g) || [];
    results.replaceChildren();
    selected.forEach((letter, index) => {
      const [name, example] = techniques[letter.charCodeAt(0) - 97];
      const row = document.createElement('li');
      const button = document.createElement('button');
      const popup = document.createElement('blockquote');
      button.type = 'button';
      button.textContent = name;
      popup.id = 'planner-example-' + index;
      popup.className = 'planner-example';
      popup.textContent = example;
      button.setAttribute('aria-controls', popup.id);
      let pinned = false;

      function show(visible) {
        popup.hidden = !visible;
        button.setAttribute('aria-expanded', visible);
      }
      show(false);
      row.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'touch') show(true);
      });
      row.addEventListener('pointerleave', () => {
        if (!pinned && !button.matches(':focus-visible')) show(false);
      });
      button.addEventListener('focus', () => {
        if (button.matches(':focus-visible')) show(true);
      });
      button.addEventListener('blur', () => {
        if (!pinned && !row.matches(':hover')) show(false);
      });
      button.addEventListener('click', () => {
        pinned = !pinned;
        show(pinned);
      });
      row.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || popup.hidden) return;
        event.preventDefault();
        event.stopPropagation();
        pinned = false;
        show(false);
      });
      row.append(button, popup);
      results.append(row);
    });
  });
})();
