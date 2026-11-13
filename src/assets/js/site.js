// AQA English Revision: the little bits of behaviour the pages need.
//  1. Reading settings (font, text size, spacing, page colour), remembered in this browser only.
//  2. The contents column: "On this page" under the current page, and the Contents button on phones.
//  3. Reading progress bar, drop capital on the opening paragraph.
//  4. "Mark as read": ticks in the contents column, kept in this browser only.
(function () {
  var root = document.documentElement;

  /* ---------- 1. Reading settings ---------- */
  var KEY = 'aqa:reading:v1';
  var DEFAULT_SIZE = 18;
  var FONT_CSS = {
    clear: 'Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800',
    lexend: 'Lexend:wght@400;600'
  };
  var settings = {};
  try { settings = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { settings = {}; }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {} }
  function loadFont(name) {
    if (!FONT_CSS[name] || document.querySelector('link[data-font="' + name + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + FONT_CSS[name] + '&display=swap';
    link.setAttribute('data-font', name);
    document.head.appendChild(link);
  }
  // Fonts for the panel's own "Aa" samples
  loadFont('clear'); loadFont('lexend');

  function apply() {
    ['font', 'page', 'spacing'].forEach(function (k) {
      if (settings[k]) root.setAttribute('data-' + k, settings[k]); else root.removeAttribute('data-' + k);
    });
    if (settings.size) root.style.setProperty('--size', settings.size + 'px'); else root.style.removeProperty('--size');
    if (settings.font) loadFont(settings.font);
    var panel = document.getElementById('reading-settings');
    if (!panel) return;
    var current = { font: settings.font || 'book', page: settings.page || 'paper', spacing: settings.spacing || 'standard' };
    panel.querySelectorAll('[data-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', current[b.getAttribute('data-set')] === b.getAttribute('data-value') ? 'true' : 'false');
    });
    var sizeOut = panel.querySelector('.rs-size-value');
    if (sizeOut) sizeOut.textContent = String(currentSize());
  }
  function currentSize() {
    if (settings.size) return settings.size;
    var px = parseFloat(getComputedStyle(root).getPropertyValue('--size'));
    return px || DEFAULT_SIZE;
  }

  var toggle = document.querySelector('.reading-toggle');
  var panel = document.getElementById('reading-settings');
  if (toggle && panel) {
    toggle.addEventListener('click', function () {
      var open = panel.hasAttribute('hidden');
      if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-set')) {
        var k = b.getAttribute('data-set'), v = b.getAttribute('data-value');
        var isDefault = (k === 'font' && v === 'book') || (k === 'page' && v === 'paper') || (k === 'spacing' && v === 'standard');
        if (isDefault) delete settings[k]; else settings[k] = v;
      } else if (b.hasAttribute('data-step')) {
        var size = Math.max(14, Math.min(26, currentSize() + parseInt(b.getAttribute('data-step'), 10)));
        settings.size = size;
      } else if (b.hasAttribute('data-reset')) {
        settings = {};
      } else {
        return;
      }
      save();
      apply();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hasAttribute('hidden')) {
        panel.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }
  apply();

  /* ---------- 2. The contents column ---------- */
  var contents = document.querySelector('.contents');
  if (contents) {
    var ct = contents.querySelector('.contents-toggle');
    if (ct) ct.addEventListener('click', function () {
      var open = contents.classList.toggle('is-open');
      ct.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // "On this page": the page's headings, listed under the current page when possible.
    var currentPage = contents.querySelector('li li.is-current') || contents.querySelector('li.is-current');
    var here = currentPage || contents.querySelector('.contents-body');
    var main = document.getElementById('main');
    if (here && main) {
      var found = [];
      main.querySelectorAll('h2, h3').forEach(function (el) {
        var lessonHeading = el.matches('.lesson-section > h2');
        if (!lessonHeading && (!currentPage || el.closest('.card, .plate, .cards, .acts, .link-rows, aside, .tiles, .card-grid, .sec-dark'))) return;
        var text = el.textContent.replace(/\s+/g, ' ').trim().replace(/[:.]+$/, '');
        if (!text || (!lessonHeading && text.length > 48)) return;
        found.push({ el: el, text: text, lessonHeading: lessonHeading });
      });
      if (found.length > 14) found = found.filter(function (f) { return f.el.tagName === 'H2'; });
      var hasLessonHeading = found.some(function (f) { return f.lessonHeading; });
      if (hasLessonHeading && found.length > 18) found = found.filter(function (f) { return f.lessonHeading; });
      if (hasLessonHeading || (found.length >= 2 && found.length <= 18)) {
        var ul = document.createElement('ul');
        ul.className = 'otp';
        ul.setAttribute('aria-label', 'On this page');
        found.forEach(function (f, i) {
          var target = f.el;
          if (!target.id) {
            var id = 'section-' + (i + 1);
            while (document.getElementById(id)) id += '-heading';
            target.id = id;
          }
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '#' + target.id;
          a.textContent = f.text;
          a.addEventListener('click', function () {
            contents.classList.remove('is-open');
            if (ct) ct.setAttribute('aria-expanded', 'false');
          });
          li.appendChild(a);
          ul.appendChild(li);
          f.link = a; f.target = target;
        });
        here.appendChild(ul);

        // highlight the section being read
        if ('IntersectionObserver' in window) {
          var setHere = function (link) {
            found.forEach(function (f) { f.link.classList.toggle('is-here', f.link === link); });
          };
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
              if (en.isIntersecting) {
                var f = found.filter(function (x) { return x.target === en.target; })[0];
                if (f) setHere(f.link);
              }
            });
          }, { rootMargin: '0px 0px -70% 0px' });
          found.forEach(function (f) { io.observe(f.target); });
        }
      }
    }
  }

  /* ---------- 3. Reading progress and the opening paragraph ---------- */
  var bar = document.querySelector('.progress span');
  var mainEl = document.getElementById('main');
  if (bar && mainEl && document.body.classList.contains('is-article')) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var r = mainEl.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var done = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      bar.style.width = (done * 100).toFixed(1) + '%';
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  if (mainEl && document.body.classList.contains('is-article')) {
    var paras = mainEl.querySelectorAll('p');
    for (var i = 0; i < paras.length; i++) {
      var p = paras[i];
      if (p.closest('aside, .lesson-section, .sec-dark, .sec-light, .tile, .card')) continue;
      var t = p.textContent.trim();
      if (t.length > 140 && /^[A-Za-z]/.test(t)) { p.classList.add('lede'); }
      break;
    }
  }

  /* ---------- 4. Mark as read ---------- */
  var READ_KEY = 'aqa:read:v1';
  var read = {};
  try { read = JSON.parse(localStorage.getItem(READ_KEY) || '{}') || {}; } catch (e) { read = {}; }
  var here = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  var markBtn = document.querySelector('.mark-read');
  function showRead() {
    document.querySelectorAll('.contents li > a').forEach(function (a) {
      var u = (a.getAttribute('href') || '').replace(/\/$/, '');
      if (u.charAt(0) === '/' && a.parentElement) a.parentElement.classList.toggle('is-read', !!read[u]);
    });
    var prog = document.querySelector('.contents-progress');
    if (prog) {
      var links = document.querySelectorAll('.contents-body > ul:not(.otp) > li > a');
      var n = 0;
      links.forEach(function (a) { if (read[(a.getAttribute('href') || '').replace(/\/$/, '')]) n++; });
      if (n) { prog.textContent = n + ' of ' + links.length + ' pages read'; prog.hidden = false; } else { prog.hidden = true; }
    }
    if (markBtn) {
      markBtn.setAttribute('aria-pressed', read[here] ? 'true' : 'false');
      markBtn.querySelector('.mr-text').textContent = read[here] ? 'Read' : 'Mark as read';
    }
  }
  if (markBtn) {
    markBtn.hidden = false;
    markBtn.addEventListener('click', function () {
      if (read[here]) delete read[here]; else read[here] = 1;
      try { localStorage.setItem(READ_KEY, JSON.stringify(read)); } catch (e) {}
      showRead();
    });
  }
  showRead();
})();

// Keep the notes in the page so the extract is readable without scripting.
document.querySelectorAll('.annotated-extract').forEach(function (extract) {
  var panel = extract.querySelector('.extract-notes');
  var display = panel.querySelector('.extract-note-display');
  var list = extract.querySelector('.extract-note-list');
  var pinned = null;

  function show(button) {
    var note = button && document.getElementById(button.dataset.note);
    if (!note) {
      display.textContent = 'Choose an underlined phrase.';
      return;
    }
    var title = document.createElement('strong');
    title.textContent = note.previousElementSibling.textContent;
    display.replaceChildren(title, document.createTextNode(note.textContent));
  }

  extract.querySelectorAll('[data-note]').forEach(function (phrase) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'extract-phrase';
    button.dataset.note = phrase.dataset.note;
    button.textContent = phrase.textContent;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-controls', display.id);
    phrase.replaceWith(button);

    button.addEventListener('pointerenter', function (event) {
      if (event.pointerType !== 'touch') show(button);
    });
    button.addEventListener('pointerleave', function () {
      show(document.activeElement === button ? button : pinned);
    });
    button.addEventListener('focus', function () { show(button); });
    button.addEventListener('blur', function () { show(pinned); });
    button.addEventListener('click', function () {
      var wasPinned = pinned === button;
      if (pinned) pinned.setAttribute('aria-pressed', 'false');
      pinned = wasPinned ? null : button;
      if (pinned) pinned.setAttribute('aria-pressed', 'true');
      show(button);
    });
  });

  show(null);
  display.hidden = false;
  list.hidden = true;
  panel.classList.add('is-ready');
  extract.querySelector('.extract-instructions').hidden = false;
});
