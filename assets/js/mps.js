(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.manual'));
  if (!tabs.length) return;

  function select(slug, push) {
    tabs.forEach(function (t) {
      var on = t.dataset.module === slug;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(function (p) { p.hidden = p.id !== 'manual-' + slug; });
    if (push) { try { history.replaceState(null, '', '#' + slug); } catch (e) {} }
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { select(t.dataset.module, true); });
  });

  // Sign: gentle 3D tilt that follows the pointer, with a slow idle sway.
  var sign = document.querySelector('.hero img');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (sign && !still) {
    var tx = 0, ty = 0, cx = 0, cy = 0, pointer = false, t0 = performance.now();
    function aim(x, y) {
      pointer = true;
      tx = (x / window.innerWidth - 0.5) * 2;   // -1..1
      ty = (y / window.innerHeight - 0.5) * 2;
    }
    window.addEventListener('pointermove', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
    document.addEventListener('pointerleave', function () { pointer = false; });
    function frame(now) {
      if (!pointer) {
        var t = (now - t0) / 1000;
        tx = Math.sin(t * 0.5) * 0.35;
        ty = Math.cos(t * 0.37) * 0.25;
      }
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      sign.style.transform =
        'perspective(1400px) rotateY(' + (cx * 7).toFixed(2) + 'deg) rotateX(' + (-cy * 5).toFixed(2) + 'deg)' +
        ' translate3d(' + (cx * -8).toFixed(1) + 'px,' + (cy * -6).toFixed(1) + 'px,0)';
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var start = location.hash.slice(1);
  select(tabs.some(function (t) { return t.dataset.module === start; }) ? start : tabs[0].dataset.module, false);
})();
