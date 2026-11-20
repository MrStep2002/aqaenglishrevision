// Only the selected game and its engine run in this isolated player document.
(() => {
  const id = document.body.dataset.gameId;
  const game = document.querySelector('dialog');
  const origin = new URL(document.baseURI).origin;
  let ready = false;
  const send = type => window.parent.postMessage({ type: 'revision-game-' + type, game: id }, origin);

  window.addEventListener('error', () => { if (!ready) send('error'); }, true);
  window.addEventListener('unhandledrejection', () => { if (!ready) send('error'); });
  if (!game) return send('error');

  // The outer player is already modal. Keep the game non-modal inside
  // the frame and cycle Tab through its visible controls below.
  game.showModal = () => { if (!game.open) game.show(); };
  game.addEventListener('close', () => send('close'));
  function controls() {
    return [...game.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
      .filter(control => control.tabIndex >= 0 && !control.disabled && control.getClientRects().length);
  }
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      game.close();
    } else if (event.key === 'Tab') {
      const buttons = controls();
      if (event.shiftKey && document.activeElement === buttons[0]) {
        event.preventDefault();
        buttons.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
        event.preventDefault();
        buttons[0].focus();
      }
    }
  });
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== origin || event.data?.game !== id) return;
    if (event.data.type === 'revision-game-focus-first') controls()[0]?.focus();
  });
  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('play-' + id).click();
    if (!game.open) return send('error');
    ready = true;
    send('ready');
  });
})();
