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

  // Sign: pointer-driven motion with a slow idle sway.
  // Mode A (default): CSS 3D tilt of the still image.
  // Mode B: if sweep_frames > 0, play a pre-rendered Blender yaw sweep on a canvas (true lighting change).
  var hero = document.querySelector('.hero');
  var sign = document.querySelector('.hero img');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nFrames = hero ? parseInt(hero.dataset.sweepFrames, 10) || 0 : 0;

  function pad(n) { return ('0000' + n).slice(-4); }

  function startMotion(drawYaw) {
    // drawYaw(null) => use CSS tilt; drawYaw(fn) => fn(-1..1) draws the yaw frame
    var tx = 0, ty = 0, cx = 0, cy = 0, pointer = false, t0 = performance.now();
    window.addEventListener('pointermove', function (e) {
      pointer = true;
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    document.addEventListener('pointerleave', function () { pointer = false; });
    function frame(now) {
      if (!pointer) {
        var t = (now - t0) / 1000;
        tx = Math.sin(t * 0.5) * 0.35;
        ty = Math.cos(t * 0.37) * 0.25;
      }
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      var el = drawYaw ? drawYaw.el : sign;
      if (drawYaw) {
        drawYaw.draw(cx);
        el.style.transform = 'perspective(1400px) rotateX(' + (-cy * 3).toFixed(2) + 'deg) translate3d(0,' + (cy * -6).toFixed(1) + 'px,0)';
      } else {
        el.style.transform = 'perspective(1400px) rotateY(' + (cx * 7).toFixed(2) + 'deg) rotateX(' + (-cy * 5).toFixed(2) + 'deg) translate3d(' + (cx * -8).toFixed(1) + 'px,' + (cy * -6).toFixed(1) + 'px,0)';
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (sign && !still) {
    if (nFrames > 1) {
      var base = hero.dataset.sweepPath, imgs = [], loaded = 0, failed = false;
      for (var i = 0; i < nFrames; i++) {
        (function (i) {
          var im = new Image();
          im.onload = function () { loaded++; if (loaded === nFrames && !failed) useSweep(); };
          im.onerror = function () { if (!failed) { failed = true; startMotion(null); } };
          im.src = base + 'f_' + pad(i) + '.webp';
          imgs.push(im);
        })(i);
      }
      function useSweep() {
        var c = document.createElement('canvas');
        c.width = imgs[0].naturalWidth; c.height = imgs[0].naturalHeight;
        c.className = sign.className; c.setAttribute('role', 'img'); c.setAttribute('aria-label', sign.alt);
        var g = c.getContext('2d');
        var RANGE = 0.7;                       // fraction of the rendered sweep the pointer can reach
        function draw(x) {
          var u = (Math.max(-1, Math.min(1, x * RANGE)) + 1) / 2 * (nFrames - 1);
          var k = Math.min(nFrames - 2, Math.floor(u)), f = u - k;
          g.globalAlpha = 1; g.drawImage(imgs[k], 0, 0);
          if (f > 0.001) { g.globalAlpha = f; g.drawImage(imgs[k + 1], 0, 0); g.globalAlpha = 1; }
        }
        draw(0);
        sign.replaceWith(c);
        startMotion({ el: c, draw: draw });
      }
    } else {
      startMotion(null);
    }
  }

  var start = location.hash.slice(1);
  select(tabs.some(function (t) { return t.dataset.module === start; }) ? start : tabs[0].dataset.module, false);
})();
