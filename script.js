
// Sidebar toggle for mobile
const hamburger = document.querySelector('.hamburger');
const sidebar = document.querySelector('.sidebar');
if (hamburger) {
  hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// Nav dropdowns
document.querySelectorAll('.nav-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const sub = toggle.nextElementSibling;
    toggle.classList.toggle('open');
    if (sub) sub.classList.toggle('open');
  });
});

// Auto-open current section
const current = window.location.pathname;
document.querySelectorAll('.nav-sub a').forEach(a => {
  if (a.getAttribute('href') && current.endsWith(a.getAttribute('href'))) {
    a.classList.add('active');
    const sub = a.closest('.nav-sub');
    if (sub) {
      sub.classList.add('open');
      const toggle = sub.previousElementSibling;
      if (toggle) toggle.classList.add('open');
    }
  }
});
document.querySelectorAll('.nav-top-link').forEach(a => {
  if (a.getAttribute('href') && current.endsWith(a.getAttribute('href'))) {
    a.classList.add('active');
  }
});
