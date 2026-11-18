(function () {
  // ---- Module carousel: swipe / drag / arrows / dots / keys; the centered module's manual shows below ----
  var track = document.querySelector('.track');
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.manual'));
  var prevBtn = document.querySelector('.car-btn.prev'), nextBtn = document.querySelector('.car-btn.next');
  var dotsEl = document.querySelector('.dots');
  var active = -1;

  function slug(i) { return slides[i].dataset.module; }
  function centerOf(i) { var s = slides[i]; return s.offsetLeft + s.offsetWidth / 2 - track.clientWidth / 2; }
  function goTo(i, instant) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    track.style.scrollBehavior = instant ? 'auto' : '';
    track.scrollTo({ left: centerOf(i) });
    if (instant) { track.style.scrollBehavior = ''; }
    setActive(i, !instant);
  }
  function setActive(i, push) {
    if (i === active) return;
    active = i;
    slides.forEach(function (s, n) { s.classList.toggle('is-active', n === i); });
    panels.forEach(function (p) { p.hidden = p.id !== 'manual-' + slug(i); });
    Array.prototype.forEach.call(dotsEl.children, function (d, n) {
      d.classList.toggle('is-active', n === i); d.setAttribute('aria-selected', n === i ? 'true' : 'false');
    });
    if (prevBtn) prevBtn.disabled = i === 0;
    if (nextBtn) nextBtn.disabled = i === slides.length - 1;
    if (push) { try { history.replaceState(null, '', '#' + slug(i)); } catch (e) {} }
  }
  function nearest() {
    var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
    slides.forEach(function (s, n) { var d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = n; } });
    return best;
  }

  if (track && slides.length) {
    var multi = slides.length > 1;
    var car = document.querySelector('.carousel');
    if (!multi) car.classList.add('single');
    requestAnimationFrame(function () { requestAnimationFrame(function () { car.classList.add('is-ready'); }); });
    slides.forEach(function (s, n) {
      var d = document.createElement('button');
      d.className = 'dot'; d.setAttribute('role', 'tab'); d.setAttribute('aria-label', s.getAttribute('aria-label'));
      d.addEventListener('click', function () { goTo(n); });
      dotsEl.appendChild(d);
      s.addEventListener('click', function () { if (n !== active) goTo(n); });
    });
    if (multi) { prevBtn.hidden = false; nextBtn.hidden = false; } else { dotsEl.hidden = true; }
    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(active - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(active + 1); });

    var ticking = false;
    track.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { ticking = false; setActive(nearest(), true); });
    }, { passive: true });
    track.tabIndex = 0;
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
    });

    // Mouse drag (touch already swipes natively).
    var drag = null;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || !multi) return;
      drag = { x: e.clientX, left: track.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4 && !drag.moved) { drag.moved = true; track.style.scrollSnapType = 'none'; track.style.scrollBehavior = 'auto'; track.style.cursor = 'grabbing'; }
      if (drag.moved) track.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!drag) return;
      var moved = drag.moved; drag = null;
      if (moved) { track.style.scrollSnapType = ''; track.style.cursor = ''; goTo(nearest()); setTimeout(function () { track.style.scrollBehavior = ''; }, 0); }
    });
    track.addEventListener('click', function (e) { if (drag && drag.moved) e.stopPropagation(); }, true);

    var hash = location.hash.slice(1);
    var start = Math.max(0, slides.findIndex(function (s) { return s.dataset.module === hash; }));
    window.addEventListener('load', function () { goTo(start, true); });
    goTo(start, true);
  }

  // ---- Panel theme: Day / Night, remembered per browser ----
  var sw = document.querySelector('.theme-switch');
  var themed = Array.prototype.slice.call(document.querySelectorAll('.panel[data-dark]'));
  if (sw && themed.length) {
    var mode = 'light';
    try { var saved = localStorage.getItem('mps-panel-theme'); if (saved === 'light' || saved === 'dark') mode = saved; } catch (e) {}
    var applyTheme = function () {
      var dark = mode === 'dark';
      themed.forEach(function (img) { var u = dark ? img.dataset.dark : img.dataset.light; if (img.getAttribute('src') !== u) img.src = u; });
      Array.prototype.forEach.call(sw.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.dataset.theme === mode ? 'true' : 'false'); });
    };
    Array.prototype.forEach.call(sw.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        mode = b.dataset.theme;
        try { localStorage.setItem('mps-panel-theme', mode); } catch (e) {}
        applyTheme();
      });
    });
    sw.hidden = false;
    applyTheme();
  }

  // Sign: one transparent render of the sign, tilted in real 3D (perspective) on the GPU by the pointer.
  // The sign is a flat board turning a few degrees, so a perspective warp of a single crisp frame is smooth
  // (no cross-fading between renders, no ghosting). The world behind it is a separate static image.
  var hero = document.querySelector('.hero');
  var sign = document.querySelector('.hero img');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var YAW = 3.2, PITCH = 1.8;   // max tilt in degrees: the only two numbers to tune

  function pointerState() {
    var st = { tx: 0, ty: 0, cx: 0, cy: 0, pointer: false, t0: performance.now(), prev: performance.now() };
    window.addEventListener('pointermove', function (e) {
      st.pointer = true;
      st.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      st.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    document.addEventListener('pointerleave', function () { st.pointer = false; });
    st.step = function (now) {
      var dt = Math.min(0.05, Math.max(0.001, (now - st.prev) / 1000)); st.prev = now;
      var k = 1 - Math.pow(1 - 0.05, dt * 60);
      if (!st.pointer) {
        var t = (now - st.t0) / 1000;
        st.tx = Math.sin(t * 0.4) * 0.45;
        st.ty = Math.cos(t * 0.29) * 0.45;
      }
      st.cx += (st.tx - st.cx) * k;
      st.cy += (st.ty - st.cy) * k;
    };
    return st;
  }

  function glTilt(img) {
    var c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.className = img.className; c.setAttribute('role', 'img'); c.setAttribute('aria-label', img.alt);
    var gl = c.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false });
    if (!gl) return null;
    function sh(type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
    var asp = c.width / c.height;
    var vs = sh(gl.VERTEX_SHADER,
      'attribute vec2 p;uniform vec2 a;uniform float asp;varying vec2 v;varying float lit;' +
      'void main(){v=p*.5+.5;' +
      'vec3 q=vec3(p.x*asp,p.y,0.);' +
      'float cy=cos(a.x),sy=sin(a.x),cx=cos(a.y),sx=sin(a.y);' +
      'q=vec3(q.x*cy+q.z*sy,q.y,-q.x*sy+q.z*cy);' +        // yaw about Y
      'q=vec3(q.x,q.y*cx-q.z*sx,q.y*sx+q.z*cx);' +          // pitch about X
      'float w=(7.-q.z)/7.;' +                                // perspective, camera 7 half-heights away; GPU divides by w
      'lit=1.+a.x*p.x*.35;' +                                 // faint light shift across the board
      'gl_Position=vec4(q.x/asp,q.y,0.,w);}');
    var fs = sh(gl.FRAGMENT_SHADER,
      'precision mediump float;varying vec2 v;varying float lit;uniform sampler2D t;' +
      'void main(){vec4 c=texture2D(t,v);gl_FragColor=vec4(c.rgb*lit,c.a);}');
    if (!vs || !fs) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(pr, 't'), 0);
    gl.uniform1f(gl.getUniformLocation(pr, 'asp'), asp);
    var ua = gl.getUniformLocation(pr, 'a');
    gl.viewport(0, 0, c.width, c.height);
    gl.clearColor(0, 0, 0, 0);
    var d2r = Math.PI / 180;
    return {
      el: c,
      draw: function (x, y) {
        gl.uniform2f(ua, x * YAW * d2r, y * PITCH * d2r);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
  }

  if (sign && hero && !still) {
    var big = new Image();
    big.onload = function () {
      var r = null;
      try { r = glTilt(big); } catch (e) { r = null; }
      var st = pointerState();
      if (r) {
        r.draw(0, 0);
        sign.replaceWith(r.el);
        (function frame(now) { st.step(now); r.draw(st.cx, st.cy); requestAnimationFrame(frame); })(performance.now());
      } else {
        // Fallback: plain CSS 3D tilt of the still image.
        (function frame(now) {
          st.step(now);
          sign.style.transform = 'perspective(1800px) rotateY(' + (st.cx * YAW).toFixed(2) + 'deg) rotateX(' + (-st.cy * PITCH).toFixed(2) + 'deg)';
          requestAnimationFrame(frame);
        })(performance.now());
      }
    };
    big.src = hero.dataset.signHi;
  }

})();
