/* Shared annotation panel; switchable reading lenses; click-only questions. */
(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('reader-data').textContent);
  const root = document.documentElement;
  const segments = data.paragraphs.flatMap(p => p.segments);
  const segmentById = new Map(segments.map(s => [s.id, s]));
  const extractIds = Object.keys(data.extractNotes);
  const roles = { point: 'Point', evidence: 'Evidence', analysis: 'Analysis', context: 'Context' };
  const aos = { ao1: 'AO1', ao2: 'AO2', ao3: 'AO3' };
  const aoDescriptions = { ao1: 'Interpretation and relevant references', ao2: 'Language, form and structure', ao3: 'Relationships between text and context' };
  const markScheme = { title: 'AQA: marks for the 19th-century novel response', url: 'https://store.aqa.org.uk/resources/english/AQA-87021-SMS.PDF#page=9' };
  const assessmentObjectives = { title: 'AQA: assessment objectives', url: 'https://www.aqa.org.uk/subjects/english/gcse/english-8702/specification/scheme-of-assessment' };
  const readingGuides = {
    structure: {
      all: {
        title: 'How a paragraph works',
        paragraphs: [
          'Each colour shows a passage’s main job in the argument. A paragraph often opens with a point, supports it with evidence, then develops analysis of that evidence.',
          'Good paragraphs can move between these jobs more than once. They can also begin with a quotation or a link from the previous idea. The order should help the argument unfold.'
        ]
      },
      point: {
        title: 'Point: give the paragraph a direction',
        paragraphs: [
          'A point gives the paragraph an idea to develop and helps answer the question. Paragraphs normally begin with one so readers know where the argument is going.',
          'They don’t have to. A writer might begin with a quotation, a contrast or a link to the previous paragraph, then make the point clear as the thought develops.',
          'Look for a claim about Dickens’s presentation that the rest of the paragraph can explore.'
        ]
      },
      evidence: {
        title: 'Evidence: give your idea something to stand on',
        paragraphs: [
          'Evidence is a quotation or a precise reference that supports your point. Choose a short piece of wording that gives you something useful to explore.',
          'Analysis normally follows evidence: once you’ve shown the reader the words, explain what they suggest and how they support your argument. A paragraph can return to evidence and analysis several times.'
        ]
      },
      analysis: {
        title: 'Analysis: explain how the evidence works',
        paragraphs: [
          'Analysis usually follows evidence. It explains how Dickens’s choices create an impression, develop an idea or affect our response.',
          'Stay close to particular words, images or patterns, then connect what you notice to the question. Naming a technique is a useful start; explain what that choice helps Dickens communicate.',
          'Evidence and analysis can also be woven into the same sentence. These colours show the main job a passage is doing.'
        ]
      },
      context: {
        title: 'Context: a smaller strand with a purpose',
        paragraphs: [
          'There is less separate context commentary in these essays because AO3 carries 6 of the 30 marks in this question, compared with 12 each for AO1 and AO2.',
          'Context still matters. A brief connection to an idea such as Christian charity or social responsibility can sharpen a reading when it grows out of the text.',
          'Use the weighting to guide emphasis. Context can be woven into analysis, so the amount of purple is not a word-count target.'
        ],
        source: markScheme
      }
    },
    aos: {
      all: {
        title: 'Three strands of a response',
        paragraphs: [
          'AO1 concerns your interpretation and supporting references. AO2 explores how the writer creates meanings. AO3 connects the text with relevant contexts and perspectives.',
          'For this 19th-century novel question, AO1 and AO2 carry 12 marks each; AO3 carries 6. That gives more emphasis to argument and analysis, with relevant context woven through.',
          'A passage can contribute to several AOs. The background shows its main emphasis; an underline shows another contribution. The colours help you notice the balance.'
        ],
        source: markScheme
      },
      ao1: {
        title: 'AO1: make and support your argument',
        paragraphs: [
          'Develop your own answer to the question and support it with well-chosen quotations or precise references to the novella.',
          'Follow the argument as it develops across the essay. Points, evidence and explanations all help build the interpretation; quoting a line is only part of the work.'
        ],
        source: assessmentObjectives
      },
      ao2: {
        title: 'AO2: explore Dickens’s choices',
        paragraphs: [
          'Explain how language, form and structure create meanings and effects. Analysis normally follows the evidence so the reader can see how your interpretation grows from the words.',
          'Here, “structure” includes Dickens’s arrangement of the novella: for example, the contrast between Scrooge’s opening portrait and his behaviour at the end. Look beyond individual techniques to patterns and contrasts.'
        ],
        source: assessmentObjectives
      },
      ao3: {
        title: 'AO3: connect the text with its contexts',
        paragraphs: [
          'Explore how the novella’s ideas relate to relevant beliefs, values and circumstances. A connection to attitudes towards poverty, charity or family should help explain a particular reading.',
          'AO3 carries 6 of the 30 marks for this question. You’ll therefore see less separate context commentary than argument and analysis. A short, well-connected observation can do valuable work.',
          'Context can sit within an analytical sentence, so some passages contribute to AO3 alongside another AO.'
        ],
        source: markScheme
      }
    }
  };
  const panel = document.getElementById('annotation-panel');
  const noteContent = document.getElementById('note-content');
  const placeholder = noteContent.innerHTML;
  const noteNavigation = document.getElementById('note-navigation');
  const closeNote = document.getElementById('close-note');
  const essaySection = document.getElementById('model-essay');
  const legend = document.getElementById('colour-legend');
  let selected = null;
  let view = 'plain';
  let filter = 'all';
  let guidanceOpener = null;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function chip(label, category) {
    const node = element('span', 'note-chip', label);
    node.style.setProperty('--chip-bg', `var(--${category}-bg)`);
    node.style.setProperty('--chip-ink', `var(--${category}-ink)`);
    return node;
  }
  function clearSelection() {
    document.querySelectorAll('.essay-chunk[aria-pressed=true], .extract-phrase[aria-pressed=true]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  }
  function resetAnnotationPanel() {
    noteContent.innerHTML = placeholder;
    panel.classList.remove('is-open');
    delete panel.dataset.noteKind;
    document.body.classList.remove('has-note');
    closeNote.hidden = true;
    noteNavigation.hidden = true;
  }
  function showGuidance({ open = true, trigger = null } = {}) {
    if (trigger) guidanceOpener = trigger;
    // A selected passage keeps its own note until the reader closes it.
    // The latest view and category are still remembered for the fallback guide.
    if (selected) return;
    if (view === 'plain') {
      resetAnnotationPanel();
      return;
    }
    const guide = readingGuides[view][filter];
    const fragments = [
      element('p', 'note-source', view === 'structure' ? 'Writing guide · Structure' : 'Writing guide · Assessment objectives'),
      element('h3', '', guide.title)
    ];
    if (filter !== 'all') {
      const row = element('div', 'note-chips');
      row.append(chip((view === 'structure' ? roles : aos)[filter], filter));
      fragments.push(row);
    }
    guide.paragraphs.forEach(text => fragments.push(element('p', 'note-body', text)));
    fragments.push(element('p', 'ao-note', 'Select a passage to replace this guide with a note about the writing itself.'));
    if (guide.source) {
      const reference = element('a', 'guide-source-link', guide.source.title);
      reference.href = guide.source.url;
      reference.target = '_blank';
      reference.rel = 'noopener noreferrer';
      fragments.push(reference);
    }
    noteContent.replaceChildren(...fragments);
    panel.dataset.noteKind = 'guidance';
    panel.classList.toggle('is-open', open);
    document.body.classList.toggle('has-note', open);
    panel.scrollTop = 0;
    closeNote.hidden = false;
    noteNavigation.hidden = true;
    if (open && matchMedia('(max-width: 760px)').matches) {
      // Keep all the colour controls above the phone's annotation drawer.
      document.querySelector('.essay-toolbar').scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }
  function showNote(kind, id, { scroll = false, focus = false } = {}) {
    const item = kind === 'essay' ? segmentById.get(id) : data.extractNotes[id];
    const source = kind === 'essay' ? document.getElementById(id) : document.querySelector(`[data-extract-note="${id}"]`);
    if (!item || !source) return;
    clearSelection();
    source.setAttribute('aria-pressed', 'true');
    selected = { kind, id };
    const title = element('h3', '', item.title);
    const sourceLabel = element('p', 'note-source', kind === 'essay' ? (data.essayLabel || 'From the model essay') : 'From the extract');
    const quote = element('blockquote', 'note-quote', kind === 'essay' ? item.text : source.textContent);
    const body = element('p', 'note-body', item.note);
    const fragments = [sourceLabel, title, quote];
    if (kind === 'essay') {
      const roleRow = element('div', 'note-chips');
      roleRow.append(chip(roles[item.role], item.role));
      const aoRow = element('div', 'note-chips');
      item.aos.forEach(ao => {
        const aoChip = chip(aos[ao], ao);
        aoChip.title = aoDescriptions[ao];
        aoRow.append(aoChip);
      });
      fragments.push(roleRow, aoRow, body);
      if (item.aos.length > 1) fragments.push(element('p', 'ao-note', `Main emphasis: ${aos[item.aos[0]]}. This passage also contributes to ${item.aos.slice(1).map(a => aos[a]).join(' and ')}.`));
    } else {
      fragments.push(body);
    }
    if (Array.isArray(item.sources) && item.sources.length) {
      const references = element('div', 'note-sources');
      item.sources.forEach(reference => {
        const link = element('a', 'note-source-link', reference.title);
        link.href = reference.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        references.append(link);
      });
      fragments.push(references);
    }
    noteContent.replaceChildren(...fragments);
    panel.dataset.noteKind = 'passage';
    panel.classList.add('is-open');
    document.body.classList.add('has-note');
    panel.scrollTop = 0;
    closeNote.hidden = false;
    noteNavigation.hidden = false;
    const orderedIds = kind === 'essay' ? segments.map(s => s.id) : extractIds;
    const position = orderedIds.indexOf(id);
    document.getElementById('note-position').textContent = `${position + 1} of ${orderedIds.length}`;
    document.getElementById('previous-note').disabled = position === 0;
    document.getElementById('next-note').disabled = position === orderedIds.length - 1;
    const narrowScreen = matchMedia('(max-width: 760px)').matches;
    if (scroll || narrowScreen) {
      if (kind === 'extract') document.querySelector('.extract-details').open = true;
      source.scrollIntoView({ block: narrowScreen ? 'start' : 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    if (focus) source.focus({ preventScroll: true });
  }
  function closeAnnotation({ restoreFocus = false } = {}) {
    const last = selected;
    clearSelection();
    selected = null;
    if (last && view !== 'plain') showGuidance({ open: !matchMedia('(max-width: 760px)').matches });
    else resetAnnotationPanel();
    if (restoreFocus && last) {
      const target = last.kind === 'essay' ? document.getElementById(last.id) : document.querySelector(`[data-extract-note="${last.id}"]`);
      target?.focus({ preventScroll: true });
    }
    if (restoreFocus && !last && guidanceOpener?.isConnected) guidanceOpener.focus({ preventScroll: true });
  }
  closeNote.addEventListener('click', () => closeAnnotation({ restoreFocus: true }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (selected || panel.classList.contains('is-open'))) closeAnnotation({ restoreFocus: true });
  });
  function stepNote(direction) {
    if (!selected) return;
    const ids = selected.kind === 'essay' ? segments.map(s => s.id) : extractIds;
    const next = ids.indexOf(selected.id) + direction;
    if (next >= 0 && next < ids.length) showNote(selected.kind, ids[next], { scroll: true });
  }
  document.getElementById('previous-note').addEventListener('click', () => stepNote(-1));
  document.getElementById('next-note').addEventListener('click', () => stepNote(1));

  document.querySelectorAll('.extract-passage [data-note]').forEach(span => {
    const button = element('span', 'extract-phrase', span.textContent);
    button.setAttribute('role', 'button');
    button.tabIndex = 0;
    button.dataset.extractNote = span.dataset.note;
    button.setAttribute('aria-controls', 'note-content');
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => showNote('extract', button.dataset.extractNote));
    span.replaceWith(button);
  });
  document.querySelectorAll('.essay-chunk').forEach(button => {
    const s = segmentById.get(button.dataset.segment);
    const otherAos = s.aos.slice(1);
    if (otherAos.length) {
      const stops = otherAos.map((ao, i) => `var(--${ao}-ink) ${i * 100 / otherAos.length}% ${(i + 1) * 100 / otherAos.length}%`).join(', ');
      button.style.setProperty('--secondary-gradient', `linear-gradient(to right, ${stops})`);
    }
    button.addEventListener('click', () => showNote('essay', s.id));
  });
  document.querySelectorAll('.essay-chunk, .extract-phrase').forEach(passage => {
    passage.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        passage.click();
      }
    });
  });
  document.querySelectorAll('[data-show-segment]').forEach(button => {
    button.addEventListener('click', () => showNote('essay', button.dataset.showSegment, { scroll: true, focus: true }));
  });
  document.querySelectorAll('[data-show-extract]').forEach(button => {
    button.addEventListener('click', () => showNote('extract', button.dataset.showExtract, { scroll: true, focus: true }));
  });

  function applyFilter() {
    document.querySelectorAll('.essay-chunk').forEach(button => {
      const matches = filter === 'all' || (view === 'structure' ? button.dataset.role === filter : button.dataset.aos.split(' ').includes(filter));
      button.classList.toggle('category-excluded', !matches);
    });
    legend.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === filter)));
  }
  function setView(nextView, { trigger = null } = {}) {
    view = nextView;
    filter = 'all';
    essaySection.dataset.view = view;
    document.querySelectorAll('[data-view-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.viewChoice === view)));
    legend.replaceChildren();
    legend.hidden = view === 'plain';
    document.getElementById('view-explanation').textContent = {
      plain: 'Select any sentence to read its annotation.',
      structure: 'Colours show each passage’s main job. Choose a category for guidance, or a sentence for a closer look.',
      aos: 'Colour shows the main AO; an underline shows another. Choose an AO for guidance, or a sentence for a closer look.'
    }[view];
    if (view !== 'plain') {
      const categories = view === 'structure' ? roles : aos;
      for (const [key, label] of [['all', 'All'], ...Object.entries(categories)]) {
        const button = element('button', 'legend-button');
        button.type = 'button';
        button.dataset.category = key;
        button.setAttribute('aria-controls', 'note-content');
        button.setAttribute('aria-pressed', String(key === 'all'));
        if (key !== 'all') {
          const swatch = element('span', 'legend-swatch');
          swatch.setAttribute('aria-hidden', 'true');
          swatch.style.setProperty('--swatch', `var(--${key}-bg)`);
          swatch.style.setProperty('--swatch-ink', `var(--${key}-ink)`);
          button.append(swatch);
        }
        button.append(document.createTextNode(label));
        button.addEventListener('click', () => { filter = key; applyFilter(); showGuidance({ trigger: button }); });
        legend.append(button);
      }
    }
    applyFilter();
    showGuidance({ trigger });
  }
  document.querySelectorAll('[data-view-choice]').forEach(button => {
    button.setAttribute('aria-controls', 'note-content');
    button.addEventListener('click', () => setView(button.dataset.viewChoice, { trigger: button }));
  });

  const explored = new Set();
  function updateQuestionProgress() {
    document.getElementById('question-progress').textContent = `${explored.size} of ${data.questions.length} questions explored`;
  }
  document.querySelectorAll('.reading-question').forEach(form => {
    const q = data.questions.find(item => item.id === form.dataset.question);
    const submit = form.querySelector('[type=submit]');
    const feedback = form.querySelector('.question-feedback');
    form.addEventListener('change', () => { submit.disabled = false; feedback.hidden = true; });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const answer = form.querySelector('input:checked');
      if (!answer) return;
      const correct = Number(answer.value) === q.correct;
      const heading = element('strong', '', correct ? 'That’s right.' : 'Have another look.');
      const explanation = correct ? q.explanation : (q.optionFeedback?.[Number(answer.value)] || q.explanation);
      feedback.replaceChildren(heading, document.createTextNode(correct ? explanation : `${explanation} You can change your answer and check again.`));
      feedback.dataset.correct = String(correct);
      feedback.hidden = false;
      explored.add(q.id);
      updateQuestionProgress();
    });
  });
  document.getElementById('reset-questions').addEventListener('click', () => {
    document.querySelectorAll('.reading-question').forEach(form => {
      form.reset();
      form.querySelector('[type=submit]').disabled = true;
      form.querySelector('.question-feedback').hidden = true;
    });
    explored.clear();
    updateQuestionProgress();
  });

  const settingsPanel = document.getElementById('reading-settings');
  const settingsToggle = document.querySelector('.reading-toggle');
  const settingsKey = 'aqa:essay-mockup:reading:v1';
  let settings = { size: 19, font: 'book', spacing: 'standard' };
  try {
    const stored = JSON.parse(localStorage.getItem(settingsKey) || '{}');
    if (['book', 'clear'].includes(stored.font)) settings.font = stored.font;
    if (['standard', 'roomy'].includes(stored.spacing)) settings.spacing = stored.spacing;
    if (Number.isFinite(stored.size)) settings.size = Math.min(26, Math.max(16, stored.size));
  } catch (_) { /* Defaults work when browser storage is unavailable. */ }
  function applySettings() {
    root.dataset.font = settings.font;
    root.dataset.spacing = settings.spacing;
    root.style.setProperty('--size', `${settings.size}px`);
    document.getElementById('size-value').textContent = settings.size;
    document.querySelectorAll('[data-setting]').forEach(button => button.setAttribute('aria-pressed', String(settings[button.dataset.setting] === button.dataset.value)));
    try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch (_) { /* Storage is optional. */ }
  }
  settingsToggle.addEventListener('click', () => {
    settingsPanel.hidden = !settingsPanel.hidden;
    settingsToggle.setAttribute('aria-expanded', String(!settingsPanel.hidden));
  });
  settingsPanel.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.setting) settings[button.dataset.setting] = button.dataset.value;
    if (button.dataset.size) settings.size = Math.min(26, Math.max(16, settings.size + Number(button.dataset.size)));
    if (button.id === 'reset-reading') settings = { size: 19, font: 'book', spacing: 'standard' };
    applySettings();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !settingsPanel.hidden) {
      settingsPanel.hidden = true;
      settingsToggle.setAttribute('aria-expanded', 'false');
      settingsToggle.focus();
    }
  });
  new ResizeObserver(entries => {
    root.style.setProperty('--reader-header-h', `${Math.ceil(entries[0].target.getBoundingClientRect().height)}px`);
  }).observe(document.querySelector('.site-header'));
  const links = [...document.querySelectorAll('.reader-contents a')];
  let scheduled = false;
  function updateContents() {
    scheduled = false;
    const threshold = document.querySelector('.site-header').getBoundingClientRect().height + 140;
    let current = links[0];
    links.forEach(link => {
      if (document.querySelector(link.getAttribute('href')).getBoundingClientRect().top <= threshold) current = link;
    });
    links.forEach(link => {
      if (link === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateContents); }
  }, { passive: true });
  document.querySelectorAll('a[href="#the-extract"]').forEach(a => a.addEventListener('click', () => { document.querySelector('.extract-details').open = true; }));
  applySettings();
  root.classList.add('js-ready');
  updateContents();
})();
