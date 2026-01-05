(() => {
  const setHeaderH = () => {
    const el = document.querySelector('.site-header');
    if (!el) return;
    const h = Math.ceil(el.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--header-h', `${h}px`);
  };

  window.addEventListener('load', setHeaderH, { passive: true });
  window.addEventListener('resize', setHeaderH, { passive: true });

  // In case fonts load late and shift layout
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(setHeaderH).catch(() => {});
  }
})();
