/* Question-led evidence selection. No student typing or network requests. */
(() => {
  'use strict';
  const dataNode = document.getElementById('xp-data');
  if (!dataNode) return;
  const data = JSON.parse(dataNode.textContent);
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
  const quotes = new Map(data.quotes.map(q => [q.id, q]));
  const focuses = new Map(data.focuses.map(f => [f.id, f]));
  const moments = new Map(data.moments.map(m => [m.id, m]));
  const stages = ['question', 'evidence', 'connections', 'plan'];
  const state = {focus:null, stage:'question', selected:[], activeQuote:null, activeCard:0, answers:{}, argument:{}, planVisible:false, support:true, recall:false};
  const focus = () => focuses.get(state.focus);
  const currentQuote = () => quotes.get(state.selected[state.activeCard]);
  const answer = qid => {
    const cache = state.answers[state.focus] ||= {};
    return cache[qid] ||= {useChoice:null, useChecked:false, moment:'', linkChoice:null, linkChecked:false};
  };
  const ready = qid => {
    if (!state.focus) return false;
    const a = answer(qid), m = moments.get(a.moment);
    return a.useChecked && a.useChoice === state.focus && focus().moments.includes(a.moment) && m && a.linkChecked && a.linkChoice === m.links[state.focus].correct;
  };
  const allReady = () => state.selected.length === 2 && state.selected.every(ready);
  const announce = message => { $('xp-announcement').textContent = message; $('xp-announcement').hidden = !message; };
  const invalidatePlan = () => { state.planVisible = false; $('xp-plan-output').hidden = true; $('xp-plan-output').replaceChildren(); };
  // Stable mixing prevents a fixed correct-answer position while keeping revisits familiar.
  function mixed(items, seed) {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; const j = h % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  function syncProgress() {
    $('xp-begin-evidence').disabled = !state.focus;
    $('xp-review-evidence').disabled = state.selected.length !== 2;
    $('xp-go-connections').disabled = state.selected.length !== 2;
    $('xp-go-plan').disabled = !allReady();
    $('xp-build-plan').disabled = !allReady() || state.argument[state.focus] == null;
    document.querySelectorAll('.xp-steps [data-stage]').forEach(b => {
      const stage = b.dataset.stage;
      b.disabled = stage === 'evidence' ? !state.focus : stage === 'connections' ? state.selected.length !== 2 : stage === 'plan' ? !allReady() : false;
      if (stage === state.stage) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    const complete = state.selected.filter(ready).length;
    $('xp-connection-status').textContent = `${complete} of 2 quotations have a focused reading and an explained wider link.`;
    $('xp-current-focus').textContent = state.focus ? `Your question: ${focus().short}` : 'Choose a question to begin.';
    document.querySelectorAll('[data-work-index]').forEach(b => {
      const i = Number(b.dataset.workIndex);
      b.setAttribute('aria-pressed', String(i === state.activeCard));
      b.textContent = `Quotation ${i + 1}${ready(state.selected[i]) ? ' · connected' : ''}`;
    });
  }
  function renderQuestion() {
    document.querySelectorAll('[name="question-focus"]').forEach(input => { input.checked = input.value === state.focus; });
    $('xp-question-display').innerHTML = !state.focus ? '<p>Choose a focus to reveal your question.</p>' : `<p class="xp-label">Your practice question</p><h3>${esc(focus().question)}</h3><p>Write about:</p><ul><li>${esc(focus().extractTask)}</li><li>${esc(focus().wholeTask)}.</li></ul><p class="xp-coach">${esc(focus().coach)}</p>`;
    document.querySelectorAll('.xp-active-task').forEach(el => { el.innerHTML = state.focus ? `<p class="xp-label">Keep the question in view</p><p>${esc(focus().question)}</p>` : ''; });
  }
  function setFocus(id) {
    if (!focuses.has(id) || id === state.focus) return;
    const previous = state.focus;
    state.focus = id;
    invalidatePlan();
    $('xp-evidence-review').hidden = true;
    renderQuestion(); renderPicked(); renderNote(); syncProgress();
    if (previous && state.selected.length) announce('Question changed. Your quotations are still here; reconsider what each one can show for this focus.');
    else announce('');
    if (state.stage === 'connections' || state.stage === 'plan') showStage('question');
    const url = new URL(location.href); url.searchParams.set('focus', id); history.replaceState(null, '', url);
  }
  function showStage(stage) {
    if (!stages.includes(stage)) return;
    if (stage !== 'question' && !state.focus) return;
    if (stage === 'connections' && state.selected.length !== 2) return;
    if (stage === 'plan' && !allReady()) return;
    state.stage = stage;
    document.querySelectorAll('[data-stage-panel]').forEach(el => { el.hidden = el.dataset.stagePanel !== stage; });
    closeNote();
    if (stage === 'connections') renderWork();
    if (stage === 'plan') renderArguments();
    syncProgress();
    const heading = $(`xp-${stage}-panel`).querySelector('h2');
    heading.focus({preventScroll:true}); heading.scrollIntoView({block:'start'});
  }
  function closeNote() { $('xp-note-panel').classList.remove('is-open'); }
  function openNote(qid, opener) {
    if (!quotes.has(qid)) return;
    state.activeQuote = qid;
    state.noteOpener = opener;
    renderNote();
    $('xp-note-panel').classList.add('is-open');
    $('xp-note-panel').scrollTop = 0;
    updatePhrases();
    if (window.matchMedia('(max-width:780px)').matches) {
      if (opener?.matches('.xp-phrase')) opener.scrollIntoView({block:'start'});
      $('xp-close-note').focus({preventScroll:true});
    }
  }
  function renderNote() {
    const q = quotes.get(state.activeQuote);
    if (!q || !state.focus) return;
    $('xp-note-heading').textContent = q.label;
    let actions = '';
    if (state.selected.includes(q.id)) actions = `<button class="xp-button" type="button" data-remove="${q.id}">Remove from my evidence</button>`;
    else if (state.selected.length < 2) actions = `<button class="xp-button xp-primary" type="button" data-add="${q.id}">Use this quotation</button>`;
    else actions = `<p class="xp-small">Your two places are filled. Replace a quotation if this one gives you more to say.</p>${state.selected.map((id, i) => `<button class="xp-button" type="button" data-replace="${i}" data-candidate="${q.id}">Replace quotation ${i + 1}: ${esc(quotes.get(id).label)}</button>`).join('')}`;
    const use = q.uses[state.focus];
    $('xp-note-body').innerHTML = `<div class="xp-note-actions">${actions}</div><blockquote>“${esc(q.text)}”</blockquote>${state.support ? `<p>${esc(q.note)}</p><div class="xp-note-reading"><p class="xp-label">For ${esc(focus().label.toLowerCase())}</p><p>${esc(use.reading)}</p><p><strong>Look closely:</strong> ${esc(use.words)}.</p>${use.caution ? `<p class="xp-small">${esc(use.caution)}</p>` : ''}</div>` : '<p class="xp-small">Annotations are hidden. What can these words help you argue?</p>'}<div class="xp-note-reading"><p class="xp-label">Try another question</p><div class="xp-theme-switches">${data.focuses.filter(f => f.id !== state.focus).map(f => `<button class="xp-text-button" type="button" data-focus="${f.id}">${esc(f.label)}</button>`).join('')}</div></div>`;
  }
  function updatePhrases() {
    document.querySelectorAll('.xp-phrase').forEach(el => {
      el.classList.toggle('is-selected', state.selected.includes(el.dataset.quote));
      el.classList.toggle('is-active', el.dataset.quote === state.activeQuote);
      el.setAttribute('aria-pressed', String(state.selected.includes(el.dataset.quote)));
      el.setAttribute('aria-label', `${el.textContent}${state.selected.includes(el.dataset.quote) ? ', chosen for your evidence' : ', explore quotation'}`);
    });
  }
  function renderPicked() {
    $('xp-pick-count').textContent = `${state.selected.length} of 2 quotations chosen`;
    $('xp-picked-list').innerHTML = state.selected.length ? state.selected.map((id, i) => `<div class="xp-picked-item"><p class="xp-label">Quotation ${i + 1}</p><blockquote>“${esc(quotes.get(id).text)}”</blockquote><div class="xp-picked-controls"><button class="xp-text-button" type="button" data-read-note="${id}">Read note</button><button class="xp-text-button" type="button" data-remove="${id}">Remove</button></div></div>`).join('') : '<p class="xp-small">Nothing chosen yet. Start with a phrase in the extract.</p>';
    updatePhrases();
  }
  function changeEvidence(action, id, index) {
    if (!quotes.has(id) || !state.focus) return;
    if (action === 'add' && state.selected.length < 2 && !state.selected.includes(id)) state.selected.push(id);
    else if (action === 'remove') state.selected = state.selected.filter(qid => qid !== id);
    else if (action === 'replace' && Number.isInteger(index) && index >= 0 && index < state.selected.length && !state.selected.includes(id)) state.selected[index] = id;
    else return;
    state.activeCard = Math.min(state.activeCard, Math.max(0, state.selected.length - 1));
    invalidatePlan(); $('xp-evidence-review').hidden = true;
    renderPicked(); renderNote(); syncProgress();
    announce(`${state.selected.length} of 2 quotations chosen. You can change them as your thinking develops.`);
    if ((state.stage === 'connections' || state.stage === 'plan') && state.selected.length < 2) showStage('evidence');
  }
  function reviewEvidence() {
    if (state.selected.length !== 2) return;
    const qs = state.selected.map(id => quotes.get(id));
    let comments = qs.map(q => `<p><strong>${esc(q.label)}:</strong> ${esc(q.uses[state.focus].caution || `A useful starting point for ${focus().label.toLowerCase()}. Develop the words ${q.uses[state.focus].words} rather than repeating the quotation’s meaning.`)}</p>`).join('');
    if (qs[0].family === qs[1].family) comments += '<p>These quotations share an image pattern. Give them different jobs in the argument, or consider a contrast from another part of the extract.</p>';
    comments += '<p>Next, explain what each quotation can show and find a wider moment that develops that thought.</p>';
    $('xp-evidence-review').innerHTML = comments; $('xp-evidence-review').hidden = false;
  }
  function renderWork() {
    if (state.selected.length !== 2) return;
    $('xp-work-tabs').innerHTML = state.selected.map((id, i) => `<button class="xp-button" type="button" data-work-index="${i}" aria-pressed="${i === state.activeCard}">Quotation ${i + 1}</button>`).join('');
    const q = currentQuote(), a = answer(q.id);
    state.activeQuote = q.id; renderNote(); updatePhrases();
    const readings = mixed(data.focuses.map(f => ({id:f.id, text:q.uses[f.id].reading})), `${q.id}:${state.focus}:reading`);
    $('xp-work-area').innerHTML = `<div class="xp-work-quote"><p class="xp-label">Your evidence · ${esc(q.label)}</p><blockquote>“${esc(q.text)}”</blockquote><p class="xp-small">Words worth exploring: ${esc(q.uses[state.focus].words)}.</p><button class="xp-text-button" type="button" data-read-note="${q.id}">Revisit the annotation</button></div><div class="xp-task-part"><p class="xp-label">Make the quotation answer</p><fieldset class="xp-choice-field"><legend>Which reading most directly addresses this question?</legend>${readings.map(r => `<label class="xp-choice"><input type="radio" name="quote-use" value="${r.id}" ${a.useChoice === r.id ? 'checked' : ''}><span>${esc(r.text)}</span></label>`).join('')}</fieldset><button id="xp-check-use" class="xp-button" type="button" ${a.useChoice == null ? 'disabled' : ''}>Check the focus</button><div id="xp-use-feedback" class="xp-feedback" role="status" hidden></div></div><div class="xp-task-part"><p class="xp-label">Take the idea elsewhere</p><h3>What does another moment add?</h3><p>A connection should do more than repeat the same theme. It might reveal a cause, develop a pattern or show a change.</p><label class="xp-select-label" for="xp-moment-select">Choose a moment from the wider novella</label><select id="xp-moment-select"><option value="">Choose a moment…</option>${focus().moments.map(id => { const m = moments.get(id); return `<option value="${id}" ${a.moment === id ? 'selected' : ''}>Stave ${m.stave}: ${esc(m.title)}</option>`; }).join('')}</select><div id="xp-moment-detail"></div></div>`;
    if (a.useChecked) renderUseFeedback();
    renderMoment(); syncProgress();
  }
  function renderUseFeedback() {
    const q = currentQuote(), a = answer(q.id), out = $('xp-use-feedback');
    if (!a.useChecked || !focuses.has(a.useChoice)) { out.hidden = true; return; }
    const right = a.useChoice === state.focus;
    out.innerHTML = right ? `<p><strong>This reading keeps the question in view.</strong></p><p>${esc(q.uses[state.focus].reading)}</p><p>Develop the wording ${esc(q.uses[state.focus].words)} to show how Dickens creates that impression.</p>` : `<p><strong>Refocus this reading.</strong></p><p>This is a possible direction for a question about ${esc(focuses.get(a.useChoice).label.toLowerCase())}. Here, make ${esc(focus().short)} the centre of the claim.</p><p>${esc(focus().coach)}</p>`;
    out.hidden = false;
  }
  function renderMoment() {
    const q = currentQuote(), a = answer(q.id), m = moments.get(a.moment), out = $('xp-moment-detail');
    if (!m || !focus().moments.includes(m.id)) { out.replaceChildren(); return; }
    const link = m.links[state.focus];
    const options = mixed(link.options.map((text, i) => ({text, i})), `${q.id}:${state.focus}:${m.id}:link`);
    out.innerHTML = `<div class="xp-moment-context"><p class="xp-label">Stave ${m.stave} · ${esc(m.title)}</p><p>${esc(m.context)}</p><blockquote>“${esc(m.quote)}”</blockquote><a class="xp-source" href="${esc(m.source)}" target="_blank" rel="noopener">Read the moment in the novella</a></div><fieldset class="xp-choice-field"><legend>Which explanation develops your extract point for this question?</legend>${options.map(o => `<label class="xp-choice"><input type="radio" name="moment-link" value="${o.i}" ${a.linkChoice === o.i ? 'checked' : ''}><span>${esc(o.text)}</span></label>`).join('')}</fieldset><button id="xp-check-link" class="xp-button" type="button" ${a.linkChoice == null ? 'disabled' : ''}>Check the connection</button><div id="xp-link-feedback" class="xp-feedback" role="status" hidden></div>`;
    if (a.linkChecked) renderLinkFeedback();
  }
  function renderLinkFeedback() {
    const a = answer(currentQuote().id), m = moments.get(a.moment), out = $('xp-link-feedback');
    if (!out || !m || !a.linkChecked || a.linkChoice == null) return;
    const link = m.links[state.focus], right = a.linkChoice === link.correct;
    out.innerHTML = `<p><strong>${right ? esc(link.kind) : 'Test that connection more carefully.'}</strong></p><p>${esc(link.feedback[a.linkChoice])}</p>${right ? '<p>Now make the bridge explicit: name the idea in your extract quotation that this moment extends or challenges.</p>' : ''}`;
    out.hidden = false;
  }
  function renderArguments() {
    $('xp-argument-choices').innerHTML = `<legend>Choose a starting argument</legend>${focus().arguments.map((text, i) => `<label class="xp-choice"><input type="radio" name="plan-argument" value="${i}" ${state.argument[state.focus] === i ? 'checked' : ''}><span>${esc(text)}</span></label>`).join('')}`;
  }
  function planText() {
    const lines = [focus().question, '', 'STARTING ARGUMENT', focus().arguments[state.argument[state.focus]], ''];
    state.selected.forEach((id, i) => {
      const q = quotes.get(id), a = answer(id), m = moments.get(a.moment), link = m.links[state.focus];
      lines.push(`THREAD ${i + 1}`, `Extract: “${q.text}”`, `Claim: ${q.uses[state.focus].reading}`, `Explore: ${q.uses[state.focus].words}`, `Wider moment: Stave ${m.stave}, ${m.title}`, `“${m.quote}”`, m.context, `Connection: ${link.options[link.correct]}`, '');
    });
    lines.push('DEVELOP IT', 'Explain the wording and the connection in your own words. What does the relationship between these moments suggest about Dickens’s view of people and responsibility?', '', 'This is a rehearsal outline, not a prescribed exam structure.');
    return lines.join('\n');
  }
  function buildPlan() {
    if (!allReady() || state.argument[state.focus] == null) return;
    state.planVisible = true; state.recall = false;
    const sameMoment = answer(state.selected[0]).moment === answer(state.selected[1]).moment;
    $('xp-plan-output').innerHTML = `<p class="xp-label">Your rehearsal outline</p><h3>A route through your response</h3><p><strong>${esc(focus().arguments[state.argument[state.focus]])}</strong></p><p class="xp-small">These threads organise the ideas you have chosen. Decide how to develop and order them when you write.</p>${state.selected.map((id, i) => { const q = quotes.get(id), a = answer(id), m = moments.get(a.moment), link = m.links[state.focus]; return `<article class="xp-plan-thread"><p class="xp-label">Thread ${i + 1} · ${esc(q.label)}</p><h3>${esc(q.uses[state.focus].reading)}</h3><blockquote>“${esc(q.text)}”</blockquote><p><strong>Explore the language:</strong> ${esc(q.uses[state.focus].words)}.</p><p class="xp-label">Wider novella · Stave ${m.stave}</p><p><strong>${esc(m.title)}</strong></p><p>${esc(m.context)}</p><blockquote class="xp-wider-quote">“${esc(m.quote)}”</blockquote><p class="xp-recall-prompt" hidden>Recall a short quotation or a precise detail from this moment.</p><p><strong>${esc(link.kind)}:</strong> ${esc(link.options[link.correct])}</p></article>`; }).join('')}${sameMoment ? '<p class="xp-coach">You used the same wider moment twice. That can work if it develops two different points. Would another moment add range or a useful contrast?</p>' : ''}<div class="xp-coach"><p><strong>Now make the thinking yours.</strong></p><p>Cover the outline and explain each connection aloud. Then develop a paragraph on paper: how do the words support your claim, and what does the wider moment add?</p><p>What does the pattern suggest about Dickens’s view of human relationships, wealth or responsibility? Bring that perspective into your argument where the text supports it.</p></div><div class="xp-actions"><button id="xp-recall-toggle" class="xp-button" type="button" aria-pressed="false">Hide wider quotations to practise recall</button><button id="xp-download" class="xp-button" type="button">Download my outline</button></div><p class="xp-small">Your choices stay here while this page is open. Download the outline if you want to keep it.</p><p><a href="${esc(focus().essayUrl)}">${esc(focus().essayLabel)}</a></p>`;
    $('xp-plan-output').hidden = false;
    $('xp-plan-output').scrollIntoView({block:'start'});
  }
  document.addEventListener('change', event => {
    const el = event.target;
    if (el.name === 'question-focus') { setFocus(el.value); return; }
    if (el.name === 'plan-argument') { state.argument[state.focus] = Number(el.value); invalidatePlan(); syncProgress(); return; }
    if (state.stage !== 'connections' || !currentQuote()) return;
    const a = answer(currentQuote().id);
    if (el.name === 'quote-use') {
      if (!focuses.has(el.value)) return;
      a.useChoice = el.value; a.useChecked = false; $('xp-use-feedback').hidden = true; $('xp-check-use').disabled = false; invalidatePlan();
    } else if (el.id === 'xp-moment-select') {
      if (el.value && !focus().moments.includes(el.value)) return;
      a.moment = el.value; a.linkChoice = null; a.linkChecked = false; renderMoment(); invalidatePlan();
    } else if (el.name === 'moment-link') {
      const choice = Number(el.value);
      if (![0,1,2].includes(choice)) return;
      a.linkChoice = choice; a.linkChecked = false; $('xp-link-feedback').hidden = true; $('xp-check-link').disabled = false; invalidatePlan();
    }
    syncProgress();
  });
  document.addEventListener('click', event => {
    const el = event.target.closest('button, .xp-phrase');
    if (!el || el.disabled) return;
    if (el.dataset.stage) { showStage(el.dataset.stage); return; }
    if (el.dataset.quote) { openNote(el.dataset.quote, el); return; }
    if (el.dataset.readNote) { openNote(el.dataset.readNote, el); return; }
    if (el.dataset.focus) { setFocus(el.dataset.focus); return; }
    if (el.dataset.add) { changeEvidence('add', el.dataset.add); return; }
    if (el.dataset.remove) { changeEvidence('remove', el.dataset.remove); return; }
    if (el.dataset.replace != null) { changeEvidence('replace', el.dataset.candidate, Number(el.dataset.replace)); return; }
    if (el.dataset.workIndex != null) { state.activeCard = Number(el.dataset.workIndex); renderWork(); return; }
    switch (el.id) {
      case 'xp-begin-evidence': showStage('evidence'); break;
      case 'xp-go-connections': showStage('connections'); break;
      case 'xp-go-plan': showStage('plan'); break;
      case 'xp-review-evidence': reviewEvidence(); break;
      case 'xp-support-toggle': state.support = !state.support; el.setAttribute('aria-pressed', String(state.support)); el.textContent = state.support ? 'Hide annotations' : 'Show annotations'; renderNote(); break;
      case 'xp-close-note': closeNote(); if (state.noteOpener?.isConnected) state.noteOpener.focus({preventScroll:true}); break;
      case 'xp-check-use': answer(currentQuote().id).useChecked = true; renderUseFeedback(); syncProgress(); break;
      case 'xp-check-link': answer(currentQuote().id).linkChecked = true; renderLinkFeedback(); syncProgress(); break;
      case 'xp-build-plan': buildPlan(); break;
      case 'xp-recall-toggle':
        state.recall = !state.recall;
        document.querySelectorAll('.xp-wider-quote').forEach(q => { q.hidden = state.recall; });
        document.querySelectorAll('.xp-recall-prompt').forEach(p => { p.hidden = !state.recall; });
        el.textContent = state.recall ? 'Show wider quotations' : 'Hide wider quotations to practise recall'; el.setAttribute('aria-pressed', String(state.recall)); break;
      case 'xp-download': {
        if (!state.planVisible || !allReady()) break;
        const url = URL.createObjectURL(new Blob([planText()], {type:'text/plain;charset=utf-8'}));
        const link = document.createElement('a'); link.href = url; link.download = `scrooge-${state.focus}-outline.txt`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); break;
      }
      case 'xp-start-again':
        state.selected = []; state.answers = {}; state.argument = {}; state.activeQuote = null; state.activeCard = 0;
        invalidatePlan(); renderPicked(); $('xp-evidence-review').hidden = true;
        $('xp-note-heading').textContent = 'A fresh start'; $('xp-note-body').innerHTML = '<p>Read your question again. Which words in the extract could help you answer it?</p>';
        announce('Your planning choices have been cleared.'); showStage('question'); break;
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeNote(); return; }
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.xp-phrase')) { event.preventDefault(); openNote(event.target.dataset.quote, event.target); }
  });
  const sizeObserver = new ResizeObserver(() => {
    document.body.style.setProperty('--xp-header-h', `${document.querySelector('.site-header').getBoundingClientRect().height}px`);
    document.body.style.setProperty('--xp-step-h', `${document.querySelector('.xp-step-bar').getBoundingClientRect().height}px`);
  });
  sizeObserver.observe(document.querySelector('.site-header')); sizeObserver.observe(document.querySelector('.xp-step-bar'));
  const initial = new URLSearchParams(location.search).get('focus');
  if (focuses.has(initial)) setFocus(initial);
  else { renderQuestion(); syncProgress(); }
  renderPicked(); updatePhrases();
})();
