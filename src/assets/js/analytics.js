// Simple page statistics. A visitor's exclusion preference is kept in this browser only.
(function () {
  'use strict';

  var loader = document.currentScript;
  var preference = document.getElementById('analytics-preference');
  var checkbox = document.getElementById('analytics-exclude');
  var status = document.getElementById('analytics-status');
  // Use GoatCounter's own exclusion key so its built-in exclusion link also works.
  var key = 'skipgc';
  var excluded = true;
  var storageAvailable = false;

  try {
    excluded = localStorage.getItem(key) === 't';
    storageAvailable = true;
  } catch (e) {
    // If a privacy choice cannot be read, leave statistics off.
  }

  function showPreference() {
    if (!preference || !checkbox || !status) return;
    preference.hidden = false;
    checkbox.checked = excluded;
    checkbox.disabled = !storageAvailable;
    status.textContent = !storageAvailable
      ? 'Your browser is blocking access to privacy preferences. Visitor statistics are off on this page.'
      : excluded
        ? 'Your future visits from this browser are excluded from visitor statistics.'
        : 'Visitor statistics are allowed in this browser.';
  }

  if (checkbox) {
    checkbox.addEventListener('change', function () {
      try {
        if (checkbox.checked) localStorage.setItem(key, 't');
        else localStorage.removeItem(key);
        excluded = checkbox.checked;
      } catch (e) {
        storageAvailable = false;
        excluded = true;
      }
      showPreference();
    });
  }
  window.addEventListener('storage', function (event) {
    if (event.key !== key && event.key !== null) return;
    try { excluded = localStorage.getItem(key) === 't'; }
    catch (e) { excluded = true; storageAvailable = false; }
    showPreference();
  });
  showPreference();

  if (!loader || excluded || loader.hasAttribute('data-analytics-disabled')) return;
  var code = loader.getAttribute('data-goatcounter-code') || '';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(code)) return;

  var liveSite;
  try { liveSite = new URL(loader.getAttribute('data-site-url')); }
  catch (e) { return; }
  if (location.protocol !== 'https:' || window.self !== window.top) return;
  if (location.hostname.replace(/^www\./, '') !== liveSite.hostname.replace(/^www\./, '')) return;

  // Keep this to page statistics; games and answers are not sent as events.
  window.goatcounter = { no_events: true };
  var counter = document.createElement('script');
  counter.setAttribute('data-goatcounter', 'https://' + code + '.goatcounter.com/count');
  counter.async = true;
  counter.src = 'https://gc.zgo.at/count.js';
  document.head.appendChild(counter);
})();
