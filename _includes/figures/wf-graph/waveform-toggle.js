// Minimal initializer for the wf-graph include
(() => {
  const initWf = (root) => {
    const btns = Array.from(root.querySelectorAll('.wf__btn'));
    const seriesMap = new Map();

    // map series name -> SVG group
    root.querySelectorAll('[data-wf-series]').forEach(g => {
      const name = g.getAttribute('data-wf-series');
      seriesMap.set(name, g);
    });

    const setSeriesVisible = (name, visible) => {
      const g = seriesMap.get(name);
      if (!g) return;
      g.style.display = visible ? '' : 'none';
    };

    btns.forEach(btn => {
      const target = btn.getAttribute('data-target');
      const initialOn = btn.classList.contains('is-on') || btn.getAttribute('aria-pressed') === 'true';

      // ensure initial state maps to SVG visibility
      setSeriesVisible(target, initialOn);
      btn.setAttribute('aria-pressed', initialOn ? 'true' : 'false');

      btn.addEventListener('click', () => {
        const on = btn.classList.toggle('is-on');
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        setSeriesVisible(target, on);
      });

      // keyboard: space/enter toggles
      btn.addEventListener('keydown', (ev) => {
        if (ev.key === ' ' || ev.key === 'Enter') {
          ev.preventDefault();
          btn.click();
        }
      });
    });
  };

  // Initialize all wf applets on DOMContentLoaded (defer-safe if script is deferred)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[data-wf]').forEach(initWf);
    });
  } else {
    document.querySelectorAll('[data-wf]').forEach(initWf);
  }
})();