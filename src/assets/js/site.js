// Menu: phone/tablet toggle and the little arrows that open sub-menus.
(function () {
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.menu-toggle');
  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  document.querySelectorAll('.sub-toggle').forEach(function (btn) {
    var li = btn.parentElement;
    // On phones the section you're in starts open; on desktop menus open on hover/click.
    if (btn.getAttribute('aria-expanded') === 'true') {
      if (window.matchMedia('(max-width: 1240px)').matches) li.classList.add('is-expanded');
      else btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', function () {
      var open = li.classList.toggle('is-expanded');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  // Close desktop drop-downs when clicking elsewhere.
  document.addEventListener('click', function (e) {
    if (e.target.closest('.site-nav')) return;
    if (window.matchMedia('(min-width: 1241px)').matches) {
      document.querySelectorAll('.nav-list > li.is-expanded').forEach(function (li) {
        li.classList.remove('is-expanded');
        var b = li.querySelector(':scope > .sub-toggle');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Image carousels: add previous/next buttons.
  document.querySelectorAll('.carousel').forEach(function (car) {
    if (car.children.length < 2) return;
    var nav = document.createElement('div');
    nav.className = 'carousel-nav';
    nav.innerHTML = '<button type="button" aria-label="Previous picture">&#8249;</button>' +
                    '<button type="button" aria-label="Next picture">&#8250;</button>';
    car.after(nav);
    var buttons = nav.querySelectorAll('button');
    buttons[0].addEventListener('click', function () { car.scrollBy({ left: -car.clientWidth, behavior: 'smooth' }); });
    buttons[1].addEventListener('click', function () { car.scrollBy({ left: car.clientWidth, behavior: 'smooth' }); });
  });
})();
