// Game links keep their lesson address as a fallback, but normal clicks play here.
(() => {
  if (typeof HTMLDialogElement === 'undefined') return;

  const games = {
    'fog-run': { page: 'key-quotes' },
    'freds-or-dead': { page: 'key-quotes' },
    'quote-recall': { page: 'key-quotes', script: 'quote-game.js' },
    'quote-builder': { page: 'key-quotes' },
    'extract-evidence': { page: 'key-quotes' },
    'context-quiz': { page: 'context', script: 'quote-game.js' },
    'plot-order': { page: 'plot', selector: '.plot-game', script: 'plot-game.js' },
    'plot-quiz': { page: 'plot', script: 'quote-game.js' },
    'word-formation': { page: 'essays', selector: '.word-formation', data: 'word-formation-data' },
    'word-in-context': { page: 'essays' },
    hangman: { page: 'essays' },
    crossword: { page: 'essays' },
    wordsearch: { page: 'essays' },
    'connecting-wall': { page: 'essays' },
    'essay-jigsaw': { page: 'essays', script: 'essay-jigsaw.js' },
    'earnings-game': { page: 'greed', selector: '.earnings-dialog' },
    'theme-revision': { page: 'change', script: 'quote-game.js' },
    'analysis-gaps': { page: 'essays', selector: '.analysis-gaps:not(.word-formation)', data: 'analysis-gaps-data' },
  };
  const pages = new Map();
  let shell, frame, status, errorBox, errorLink, heading;
  let active, request = 0, deadline;

  function findGame(doc, id, config) {
    const controlled = doc.getElementById('play-' + id)?.getAttribute('aria-controls');
    const candidate = (controlled && doc.getElementById(controlled)) || doc.getElementById(id)
      || doc.querySelector(config.selector || `dialog[aria-labelledby="${id}-title"]`);
    return candidate?.matches('dialog') ? candidate : null;
  }

  function details(control) {
    if (control.matches('a') && (control.hasAttribute('download')
      || (control.target && control.target !== '_self'))) return null;
    const url = new URL(control.matches('a') ? control.href : location.href);
    if (url.origin !== location.origin) return null;
    const match = (control.matches('a') ? url.hash : '#' + control.id).match(/^#play-([a-z0-9-]+)$/);
    if (!match) return null;
    const id = match[1];
    const config = games[id] || (document.getElementById(id)?.matches('dialog[data-paragraph-game]')
      ? { script: 'essay-jigsaw.js' } : null);
    if (!config) return null;
    url.hash = '';
    if (control.matches('button') && !findGame(document, id, config)) {
      url.pathname = '/a-christmas-carol/' + config.page;
      url.search = '';
    }
    const title = control.dataset.gameTitle || control.querySelector('.card-title')?.textContent
      || control.textContent.trim().replace(/^Play\s+/i, '') || 'Revision game';
    const relatedUrl = new URL(control.dataset.relatedLesson || url.href, location.href);
    if (relatedUrl.origin !== location.origin) return null;
    if (relatedUrl.hash.startsWith('#play-')) relatedUrl.hash = '';
    return { id, config, url, relatedUrl, control, title };
  }

  function createShell() {
    shell = document.createElement('dialog');
    shell.className = 'game-launcher';
    shell.id = 'game-launcher';
    shell.setAttribute('aria-labelledby', 'game-launcher-title');
    shell.innerHTML = '<h2 id="game-launcher-title" class="game-launcher-title"></h2>'
      + '<div class="game-launcher-stage"><div class="game-launcher-status"><p role="status">Loading game…</p>'
      + '<button type="button" class="game-launcher-dismiss">Cancel</button></div>'
      + '<div class="game-launcher-error" hidden><p role="alert">The game could not load. Try again or open the related lesson.</p>'
      + '<button type="button">Try again</button> <a>Open related lesson</a> '
      + '<button type="button" class="game-launcher-dismiss">Close game</button></div></div>';
    document.body.append(shell);
    heading = shell.querySelector('h2');
    status = shell.querySelector('.game-launcher-status');
    errorBox = shell.querySelector('.game-launcher-error');
    errorLink = errorBox.querySelector('a');
    for (const button of shell.querySelectorAll('.game-launcher-dismiss')) {
      button.addEventListener('click', () => shell.close());
    }
    errorBox.querySelector('button').addEventListener('click', () => openGame(active));
    shell.addEventListener('close', () => {
      request++;
      clearTimeout(deadline);
      frame?.remove();
      frame = null;
      document.documentElement.classList.remove('game-is-open');
      active?.control.focus({ preventScroll: true });
      if (active) window.scrollTo(active.scrollX, active.scrollY);
    });
  }

  async function sourcePage(url) {
    // Fetch clean markup even for the current lesson: its live game controls
    // may already have been populated by the original engine.
    if (!pages.has(url.href)) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const loaded = fetch(url.href, { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error('Game lesson returned ' + response.status);
        return response.text();
      }).then(html => new DOMParser().parseFromString(html, 'text/html'))
        .catch(error => { pages.delete(url.href); throw error; })
        .finally(() => clearTimeout(timer));
      pages.set(url.href, loaded);
    }
    return pages.get(url.href);
  }

  function playerDocument(source, game, launch) {
    const player = document.implementation.createHTMLDocument(launch.title);
    const root = player.documentElement;
    root.lang = 'en-GB';
    root.className = 'game-player';
    root.dataset.world = source.documentElement.dataset.world || 'navy';
    for (const setting of ['font', 'page', 'spacing']) {
      if (document.documentElement.dataset[setting]) root.dataset[setting] = document.documentElement.dataset[setting];
    }
    root.style.cssText = document.documentElement.style.cssText;
    const base = player.createElement('base');
    base.href = launch.url.href;
    player.head.prepend(base);
    const viewport = player.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1';
    player.head.append(viewport);
    for (const stylesheet of source.querySelectorAll('link[rel="stylesheet"]')) {
      const link = stylesheet.cloneNode(true);
      link.href = new URL(stylesheet.getAttribute('href'), launch.url).href;
      player.head.append(link);
    }
    const button = player.createElement('button');
    button.id = 'play-' + launch.id;
    button.type = 'button';
    button.hidden = true;
    player.body.dataset.gameId = launch.id;
    player.body.append(button, game.cloneNode(true));
    if (launch.config.data) {
      const data = source.getElementById(launch.config.data);
      if (!data) throw new Error('Game data is missing');
      player.body.append(data.cloneNode(true));
    }
    const scriptName = launch.config.script || launch.id + '.js';
    const engine = [...source.querySelectorAll('script[src]')].find(script =>
      new URL(script.getAttribute('src'), launch.url).pathname === '/assets/js/' + scriptName);
    if (!engine) throw new Error('Game script is missing');
    const bridge = player.createElement('script');
    bridge.src = '/assets/js/game-player.js?v=2';
    bridge.defer = true;
    const script = engine.cloneNode(true);
    script.src = new URL(engine.getAttribute('src'), launch.url).href;
    script.defer = true;
    player.body.append(bridge, script);
    return '<!doctype html>\n' + root.outerHTML;
  }

  function fail(error) {
    clearTimeout(deadline);
    if (active) pages.delete(active.url.href);
    frame?.remove();
    frame = null;
    status.hidden = true;
    errorBox.hidden = false;
    errorBox.querySelector('button').focus();
    console.error('Could not open revision game:', error);
  }

  async function openGame(launch) {
    if (!shell) createShell();
    const current = ++request;
    active = { ...launch, scrollX: launch.scrollX ?? window.scrollX, scrollY: launch.scrollY ?? window.scrollY };
    heading.textContent = launch.title;
    errorLink.href = launch.relatedUrl.href;
    status.hidden = false;
    errorBox.hidden = true;
    frame?.remove();
    frame = null;
    clearTimeout(deadline);
    document.documentElement.classList.add('game-is-open');
    if (!shell.open) shell.showModal();
    deadline = setTimeout(() => { if (request === current) fail(new Error('Game loading timed out')); }, 20000);
    try {
      const source = await sourcePage(launch.url);
      if (current !== request || !shell.open) return;
      const game = findGame(source, launch.id, launch.config);
      if (!game) throw new Error('Game is missing from its lesson');
      const title = game.querySelector('h2')?.textContent.trim() || game.getAttribute('aria-label') || launch.title;
      heading.textContent = title;
      const content = playerDocument(source, game, launch);
      frame = document.createElement('iframe');
      frame.className = 'game-launcher-frame';
      frame.title = title;
      frame.tabIndex = -1;
      frame.srcdoc = content;
      shell.querySelector('.game-launcher-stage').append(frame);
    } catch (error) {
      if (current === request && shell.open) fail(error);
    }
  }

  window.addEventListener('message', event => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin) return;
    if (event.data?.game !== active.id) return;
    if (event.data.type === 'revision-game-ready') {
      clearTimeout(deadline);
      frame.classList.add('is-ready');
      status.hidden = true;
      frame.contentWindow.postMessage({ type: 'revision-game-focus-first', game: active.id }, location.origin);
    } else if (event.data.type === 'revision-game-close') shell.close();
    else if (event.data.type === 'revision-game-error') fail(new Error('Game could not start'));
  });

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const control = event.target.closest('a[href], button[id^="play-"]');
    if (!control || control.closest('.game-launcher')) return;
    const launch = details(control);
    if (!launch) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openGame(launch);
  }, true);

  function openLinkedGame() {
    const control = document.getElementById(location.hash.slice(1));
    if (!location.hash.startsWith('#play-') || !control?.matches('button')) return;
    const launch = details(control);
    if (launch) openGame(launch);
  }

  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href*="#play-"]').forEach(link => {
      if (!details(link)) return;
      link.dataset.gameLaunch = '';
      link.setAttribute('aria-haspopup', 'dialog');
    });
    openLinkedGame();
  });
  window.addEventListener('hashchange', openLinkedGame);
})();
