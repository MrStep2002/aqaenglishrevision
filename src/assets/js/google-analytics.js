// GA4 in basic consent mode: Google receives nothing before an affirmative choice.
(function () {
  'use strict';

  var loader = document.currentScript;
  if (!loader) return;
  var id = loader.getAttribute('data-ga-id') || '';
  if (!/^G-[A-Z0-9]{5,20}$/.test(id)) return;
  var liveSite;
  try { liveSite = new URL(loader.getAttribute('data-site-url')); }
  catch (e) { return; }
  if (location.protocol !== 'https:' || window.self !== window.top) return;
  if (location.hostname.replace(/^www\./, '') !== liveSite.hostname.replace(/^www\./, '')) return;

  var key = 'aqa:ga-consent:v1';
  var lifetime = 180 * 24 * 60 * 60 * 1000;
  var pageDisabled = loader.hasAttribute('data-analytics-disabled');
  var notice = document.getElementById('ga-consent-notice');
  var panel = document.getElementById('ga-consent-settings');
  var status = document.getElementById('ga-consent-status');
  var exclusion = document.getElementById('analytics-exclude');
  var buttons = document.querySelectorAll('[data-ga-consent]');
  var choice = null;
  var excluded = true;
  var storageAvailable = true;
  var loaded = false;

  function readPreferences() {
    choice = null;
    excluded = true;
    try {
      excluded = localStorage.getItem('skipgc') === 't';
      var raw = localStorage.getItem(key);
      var saved = null;
      try { saved = JSON.parse(raw || 'null'); }
      catch (e) { /* Treat a damaged choice as not yet given. */ }
      if (saved && (saved.choice === 'granted' || saved.choice === 'denied') &&
          typeof saved.time === 'number' && saved.time <= Date.now() && Date.now() - saved.time < lifetime) {
        choice = saved.choice;
      }
      storageAvailable = true;
    } catch (e) {
      // A broken or unreadable preference never enables Google Analytics.
      storageAvailable = false;
    }
  }

  function clearCookies() {
    // Remove GA cookies at the host and parent domain; keep reading and other preferences.
    var domains = location.hostname.split('.');
    var scopes = [''];
    for (var i = 0; i < domains.length - 1; i++) scopes.push('; Domain=' + domains.slice(i).join('.'));
    try {
      document.cookie.split(';').forEach(function (cookie) {
        var name = cookie.split('=')[0].trim();
        if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$))/.test(name)) return;
        scopes.forEach(function (scope) {
          document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax; Secure' + scope;
        });
      });
    } catch (e) {}
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window['ga-disable-' + id] = true;
  window.gtag('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied'
  });

  function loadGoogle() {
    if (loaded || pageDisabled || excluded || !storageAvailable || choice !== 'granted') return;
    loaded = true;
    window['ga-disable-' + id] = false;
    window.gtag('consent', 'update', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', id, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: lifetime / 1000,
      cookie_update: false,
      page_location: location.origin + location.pathname,
      page_referrer: cleanReferrer()
    });
    var tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(tag);
  }

  function cleanReferrer() {
    if (!document.referrer) return '';
    try { var url = new URL(document.referrer); return url.origin + url.pathname; }
    catch (e) { return ''; }
  }

  function refresh() {
    var enabled = storageAvailable && !excluded && choice === 'granted';
    window['ga-disable-' + id] = !enabled || pageDisabled;
    if (notice) notice.hidden = pageDisabled || !storageAvailable || excluded || choice !== null;
    if (panel) panel.hidden = false;
    if (status) status.textContent = !storageAvailable
      ? 'Google Analytics is off because this browser cannot save your privacy choice.'
      : excluded
        ? 'Google Analytics is off because you have excluded visits from this browser.'
        : choice === 'granted'
          ? 'Google Analytics is allowed in this browser.'
          : 'Google Analytics is off in this browser.';
    buttons.forEach(function (button) {
      button.disabled = !storageAvailable || excluded;
      button.setAttribute('aria-pressed', String(choice === button.getAttribute('data-ga-consent')));
    });
    if (!enabled) {
      clearCookies();
      // Remove an already loaded Google tag after consent is withdrawn, including in other tabs.
      if (loaded) { location.reload(); return; }
    }
    loadGoogle();
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      if (excluded || !storageAvailable) return;
      var next = button.getAttribute('data-ga-consent');
      if (next !== 'granted' && next !== 'denied') return;
      try {
        localStorage.setItem(key, JSON.stringify({ choice: next, time: Date.now() }));
        choice = next;
      } catch (e) {
        choice = null;
        storageAvailable = false;
      }
      refresh();
    });
  });
  if (exclusion) exclusion.addEventListener('change', function () {
    // The basic statistics loader saves this checkbox before this handler runs.
    readPreferences();
    refresh();
  });
  window.addEventListener('storage', function (event) {
    if (event.key !== key && event.key !== 'skipgc' && event.key !== null) return;
    readPreferences();
    refresh();
  });

  readPreferences();
  refresh();
})();
