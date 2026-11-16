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
    function replaceCanvas(old) { var n = old.cloneNode(false); return n; }
    function useSweep() {
      var c = document.createElement('canvas');
      c.width = imgs[0].naturalWidth; c.height = imgs[0].naturalHeight;
      c.className = sign.className; c.setAttribute('role', 'img'); c.setAttribute('aria-label', sign.alt);
      var W = c.width, H = c.height;
      function clampPos(x, y) {
        var u = (Math.max(-1, Math.min(1, x)) + 1) / 2 * (cols - 1);
        var v = rows > 1 ? (Math.max(-1, Math.min(1, y)) + 1) / 2 * (rows - 1) : 0;
        var col = Math.min(Math.floor(u), cols - 2), fu = u - col;
        var row = rows > 1 ? Math.min(Math.floor(v), rows - 2) : 0, fv = rows > 1 ? v - row : 0;
        return { col: col, row: row, fu: fu, fv: fv };
      }

      // Preferred: WebGL. All frames live on the GPU as textures; each redraw bilinearly mixes the four nearest.
      function glRenderer() {
        var gl = c.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
        if (!gl) return null;
        function sh(type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
        var vs = sh(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,p.y*.5+.5);gl_Position=vec4(p,0.,1.);}');
        var fs = sh(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec2 v;uniform sampler2D a,b,c2,d;uniform vec2 f;void main(){gl_FragColor=mix(mix(texture2D(a,v),texture2D(b,v),f.x),mix(texture2D(c2,v),texture2D(d,v),f.x),f.y);}');
        if (!vs || !fs) return null;
        var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
        if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
        gl.useProgram(pr);
        var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        var tex = imgs.map(function (im) {
          var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          return t;
        });
        ['a', 'b', 'c2', 'd'].forEach(function (n, i) { gl.uniform1i(gl.getUniformLocation(pr, n), i); });
        var uf = gl.getUniformLocation(pr, 'f');
        gl.viewport(0, 0, W, H);
        gl.clearColor(0, 0, 0, 0);
        return function (x, y) {
          var q = clampPos(x, y), i = q.row * cols + q.col, j = rows > 1 ? i + cols : i;
          [i, i + 1, j, j + 1].forEach(function (k, n) { gl.activeTexture(gl.TEXTURE0 + n); gl.bindTexture(gl.TEXTURE_2D, tex[k]); });
          gl.uniform2f(uf, q.fu, q.fv);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };
      }

      // Fallback: 2D canvas blending (slower).
      function canvasRenderer() {
        var g = c.getContext('2d');
        function layer() { var o = document.createElement('canvas'); o.width = W; o.height = H; return o; }
        var r0 = layer(), r1 = layer(), c0 = r0.getContext('2d'), c1 = r1.getContext('2d');
        function blendRow(ctx, row, col, f) {
          var i = row * cols + col;
          ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H); ctx.drawImage(imgs[i], 0, 0);
          if (f > 0.004 && col + 1 < cols) { ctx.globalAlpha = f; ctx.drawImage(imgs[i + 1], 0, 0); }
          ctx.globalAlpha = 1;
        }
        return function (x, y) {
          var q = clampPos(x, y);
          blendRow(c0, q.row, q.col, q.fu);
          g.globalAlpha = 1; g.clearRect(0, 0, W, H); g.drawImage(r0, 0, 0);
          if (rows > 1 && q.fv > 0.004) { blendRow(c1, q.row + 1, q.col, q.fu); g.globalAlpha = q.fv; g.drawImage(r1, 0, 0); g.globalAlpha = 1; }
        };
      }

      var render = null;
      try { render = glRenderer(); } catch (e) { render = null; }
      if (!render) { c = replaceCanvas(c); render = canvasRenderer(); }
      var lastKey = '';
      function draw(x, y) {
        var key = x.toFixed(4) + ',' + y.toFixed(4);
        if (key === lastKey) return;
        lastKey = key;
        render(x, y);
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
      var prev = performance.now();
      (function frame(now) {
        var dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000)); prev = now;
        var k = 1 - Math.pow(1 - 0.05, dt * 60);
        if (!pointer) {
          var t = (now - t0) / 1000;
          tx = Math.sin(t * 0.4) * 0.35;
          ty = Math.cos(t * 0.29) * 0.35;
        }
        cx += (tx - cx) * k;
        cy += (ty - cy) * k;
        draw(cx, cy);
        requestAnimationFrame(frame);
      })(performance.now());
    }
  }

  var start = location.hash.slice(1);
  select(tabs.some(function (t) { return t.dataset.module === start; }) ? start : tabs[0].dataset.module, false);
})();
