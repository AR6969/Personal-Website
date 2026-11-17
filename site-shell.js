(() => {
  function markCurrentPage() {
    const path = window.location.pathname;
    const hash = window.location.hash.slice(1);
    const page = path.startsWith('/podcast') ? 'podcast' :
      /^\/(consulting|admissions|biglaw)/.test(path) ? 'consulting' :
      ['about', 'contact', 'podcast', 'consulting'].includes(hash) ? hash : 'about';
    document.querySelectorAll('.site-nav-links [data-page]').forEach(link => {
      if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  markCurrentPage();
  window.addEventListener('hashchange', markCurrentPage);
})();
