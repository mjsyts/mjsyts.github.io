// applets/oscillator/p2/phase-wrap/app.js
(() => {
  const TAU = Math.PI * 2;

  const el = {
    incSlider: document.getElementById("incSlider"),
    incLabel: document.getElementById("incLabel"),
    wrapMode: document.getElementById("wrapMode"),

    playBtn: document.getElementById("playBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    stepBtn: document.getElementById("stepBtn"),
    resetBtn: document.getElementById("resetBtn"),

    nOut: document.getElementById("nOut"),
    pOut: document.getElementById("pOut"),
    wOut: document.getElementById("wOut"),

    canvas: document.getElementById("plot"),
  };

  const ctx = el.canvas.getContext("2d", { alpha: true });

  const state = {
    n: 0,
    phase: 0,
    wraps: 0,

    inc: Number(el.incSlider.value),
    wrapMode: el.wrapMode.value, // none | sub1 | fract
    stepsPerFrame: 2,

    window: 420,
    history: new Float32Array(420),
    wrapMarks: new Uint8Array(420),

    playing: false,
    raf: null,
  };

  function resetHistory() {
    state.history.fill(0);
    state.wrapMarks.fill(0);
  }

  function updateUI() {
    el.incLabel.textContent = state.inc.toFixed(4);

    el.nOut.textContent = String(state.n);
    el.pOut.textContent = state.phase.toFixed(6);
    el.wOut.textContent = String(state.wraps);
  }

  function wrapPhase(p) {
    if (state.wrapMode === "none") return { p, wrapped: (p >= 1) };

    if (state.wrapMode === "sub1") {
      if (p >= 1) return { p: p - 1, wrapped: true };
      return { p, wrapped: false };
    }

    // fract: robust even if p jumps past 1 by more than one cycle
    const flo = Math.floor(p);
    const pf = p - flo;
    return { p: pf, wrapped: flo !== 0 || p >= 1 };
  }

  function pushSample(p, wrapped) {
    // shift left by one (small window, fine for clarity)
    for (let i = 0; i < state.window - 1; i++) {
      state.history[i] = state.history[i + 1];
      state.wrapMarks[i] = state.wrapMarks[i + 1];
    }
    state.history[state.window - 1] = p;
    state.wrapMarks[state.window - 1] = wrapped ? 1 : 0;
  }

  function stepOnce() {
    state.n += 1;

    let p = state.phase + state.inc;
    const res = wrapPhase(p);
    state.phase = res.p;

    if (res.wrapped && state.wrapMode !== "none") state.wraps += 1;

    pushSample(state.phase, res.wrapped);
  }

  function draw() {
    const rect = el.canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);

    if (el.canvas.width !== w || el.canvas.height !== h) {
      el.canvas.width = w;
      el.canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);

    const pad = Math.round(32 * dpr);
    const plotW = w - pad * 2;
    const plotH = h - pad * 2;

    // axes
    ctx.save();
    ctx.strokeStyle = "rgba(26,26,26,.22)";
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, pad + plotH);
    ctx.lineTo(pad + plotW, pad + plotH);
    ctx.stroke();

    // wrap boundary (phase = 1) at top
    ctx.setLineDash([6 * dpr, 5 * dpr]);
    ctx.strokeStyle = "rgba(26,26,26,.20)";
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad + plotW, pad);
    ctx.stroke();
    ctx.setLineDash([]);

    // label
    ctx.fillStyle = "rgba(26,26,26,.55)";
    ctx.font = `${12 * dpr}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.fillText("phase = 1 (wrap boundary)", pad + 8 * dpr, pad - 10 * dpr);

    // phase curve
    ctx.strokeStyle = "rgba(67,160,189,.95)"; // blue-ish
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();

    for (let i = 0; i < state.window; i++) {
      const x = pad + (i / (state.window - 1)) * plotW;
      const y = pad + (1 - state.history[i]) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // wrap dots (mark where phase crossed the boundary)
    ctx.fillStyle = "rgba(222,141,116,.95)"; // coral-ish
    for (let i = 0; i < state.window; i++) {
      if (!state.wrapMarks[i]) continue;
      const x = pad + (i / (state.window - 1)) * plotW;
      const y = pad; // boundary-aligned
      ctx.beginPath();
      ctx.arc(x, y, 3.25 * dpr, 0, TAU);
      ctx.fill();
    }

    // y labels (0 and 1)
    ctx.fillStyle = "rgba(26,26,26,.55)";
    ctx.fillText("1", pad - 10 * dpr, pad + 4 * dpr);
    ctx.fillText("0", pad - 10 * dpr, pad + plotH + 4 * dpr);

    ctx.restore();
  }

  function tick() {
    if (!state.playing) return;

    const steps = state.stepsPerFrame | 0;
    for (let i = 0; i < steps; i++) stepOnce();

    updateUI();
    draw();
    state.raf = requestAnimationFrame(tick);
  }

  function play() {
    if (state.playing) return;
    state.playing = true;
    state.raf = requestAnimationFrame(tick);
  }

  function pause() {
    state.playing = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = null;
  }

  function hardReset() {
    pause();
    state.n = 0;
    state.phase = 0;
    state.wraps = 0;
    resetHistory();
    updateUI();
    draw();
  }

  // events
  el.incSlider.addEventListener("input", () => {
    state.inc = Number(el.incSlider.value);
    updateUI();
  });

  el.wrapMode.addEventListener("change", () => {
    state.wrapMode = el.wrapMode.value;
    updateUI();
    draw();
  });

  el.playBtn.addEventListener("click", play);
  el.pauseBtn.addEventListener("click", pause);
  el.stepBtn.addEventListener("click", () => {
    pause();
    stepOnce();
    updateUI();
    draw();
  });
  el.resetBtn.addEventListener("click", hardReset);

  window.addEventListener("resize", draw);

  // init
  hardReset();
})();
