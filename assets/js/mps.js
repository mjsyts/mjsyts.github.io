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

  // Sign: pointer-driven motion. The sign is rendered with a transparent background in Blender,
  // so only the sign turns (yaw + pitch); the page behind it never moves.
  // Frames live in assets/images/mps/sweep/ as f_0000.webp ... laid out row-major (cols = yaw, rows = pitch).
  // With no frames (sweep_cols = 0) the sign is simply static.
  var hero = document.querySelector('.hero');
  var sign = document.querySelector('.hero img');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cols = hero ? parseInt(hero.dataset.sweepCols, 10) || 0 : 0;
  var rows = hero ? parseInt(hero.dataset.sweepRows, 10) || 1 : 1;
  var nFrames = cols * rows;

  function pad(n) { return ('0000' + n).slice(-4); }

  if (sign && !still && cols > 1) {
    var base = hero.dataset.sweepPath, imgs = [], loaded = 0, failed = false;
    for (var i = 0; i < nFrames; i++) {
      (function (i) {
        var im = new Image();
        im.onload = function () { loaded++; if (loaded === nFrames && !failed) useSweep(); };
        im.onerror = function () { failed = true; };
        im.src = base + 'f_' + pad(i) + '.webp';
        imgs.push(im);
      })(i);
    }
    function useSweep() {
      var c = document.createElement('canvas');
      c.width = imgs[0].naturalWidth; c.height = imgs[0].naturalHeight;
      c.className = sign.className; c.setAttribute('role', 'img'); c.setAttribute('aria-label', sign.alt);
      var g = c.getContext('2d');
      // Continuous position: blend the four nearest frames bilinearly so motion is smooth, not stepped.
      var W = c.width, H = c.height;
      function layer() { var o = document.createElement('canvas'); o.width = W; o.height = H; return o; }
      var r0 = layer(), r1 = layer(), c0 = r0.getContext('2d'), c1 = r1.getContext('2d');
      function blendRow(ctx, row, col, f) {
        var i = row * cols + col;
        ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H); ctx.drawImage(imgs[i], 0, 0);
        if (f > 0.004 && col + 1 < cols) { ctx.globalAlpha = f; ctx.drawImage(imgs[i + 1], 0, 0); }
        ctx.globalAlpha = 1;
      }
      var lastKey = '';
      function draw(x, y) {
        var u = (Math.max(-1, Math.min(1, x)) + 1) / 2 * (cols - 1);
        var v = rows > 1 ? (Math.max(-1, Math.min(1, y)) + 1) / 2 * (rows - 1) : 0;
        var col = Math.min(Math.floor(u), cols - 2), fu = u - col;
        var row = rows > 1 ? Math.min(Math.floor(v), rows - 2) : 0, fv = rows > 1 ? v - row : 0;
        var key = col + ',' + row + ',' + fu.toFixed(3) + ',' + fv.toFixed(3);
        if (key === lastKey) return;
        lastKey = key;
        blendRow(c0, row, col, fu);
        g.globalAlpha = 1; g.clearRect(0, 0, W, H); g.drawImage(r0, 0, 0);
        if (rows > 1 && fv > 0.004) { blendRow(c1, row + 1, col, fu); g.globalAlpha = fv; g.drawImage(r1, 0, 0); g.globalAlpha = 1; }
      }
      draw(0, 0);
      sign.replaceWith(c);
      var tx = 0, ty = 0, cx = 0, cy = 0, pointer = false, t0 = performance.now();
      window.addEventListener('pointermove', function (e) {
        pointer = true;
        tx = (e.clientX / window.innerWidth - 0.5) * 2;
        ty = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
      document.addEventListener('pointerleave', function () { pointer = false; });
      (function frame(now) {
        if (!pointer) {
          var t = (now - t0) / 1000;
          tx = Math.sin(t * 0.4) * 0.35;
          ty = Math.cos(t * 0.29) * 0.35;
        }
        cx += (tx - cx) * 0.05;
        cy += (ty - cy) * 0.05;
        draw(cx, cy);
        requestAnimationFrame(frame);
      })(performance.now());
    }
  }

  var start = location.hash.slice(1);
  select(tabs.some(function (t) { return t.dataset.module === start; }) ? start : tabs[0].dataset.module, false);
})();
