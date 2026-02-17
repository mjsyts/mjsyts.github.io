// applets/filter/p2/audio/main.js
(() => {
  const $ = (id) => document.getElementById(id);

  const startBtn  = $("start");
  const stopBtn   = $("stop");
  const srEl      = $("sr");
  const statusEl  = $("status");
  const cutoffEl  = $("cutoff");
  const cutoffVal = $("cutoffVal");
  const coeffVal  = $("coeffVal");
  const ampEl     = $("amp");
  const ampVal    = $("ampVal");
  const modeEl    = $("mode");

  let ctx  = null;
  let node = null;

  const WORKLET_URL  = new URL("./processor.js", window.location.href);
  const WORKLET_NAME = "one-pole-filter";

  function setStatus(t) { if (statusEl) statusEl.textContent = t; }
  function setRunningUI(running) {
    startBtn.disabled = running;
    stopBtn.disabled  = !running;
  }

  function derivedCoeff(fc, mode) {
    const rawA = 1.0 - (2.0 * Math.PI * fc / (ctx?.sampleRate ?? 48000));
    const clamped = Math.max(0, Math.min(1, rawA));
    return mode === "highpass" ? -clamped : clamped;
  }

  function updateReadouts() {
    const fc   = Number(cutoffEl.value);
    const mode = modeEl.value;
    const a    = derivedCoeff(fc, mode);

    cutoffVal.textContent = fc >= 1000
      ? `${(fc / 1000).toFixed(2)} kHz`
      : `${Math.round(fc)} Hz`;

    coeffVal.textContent = String(a);
    ampVal.textContent   = Number(ampEl.value).toFixed(2);
  }

  function pushParams() {
    if (!node) return;
    const fc   = Number(cutoffEl.value);
    const mode = modeEl.value === "highpass" ? 1 : 0;
    node.parameters.get("cutoff").setValueAtTime(fc, ctx.currentTime);
    node.parameters.get("mode").setValueAtTime(mode, ctx.currentTime);
    node.parameters.get("amplitude").setValueAtTime(Number(ampEl.value), ctx.currentTime);
  }

  async function ensureAudioGraph() {
    if (ctx) return;

    setStatus("init…");

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();

    srEl.textContent = `sample rate: ${Math.round(ctx.sampleRate)}`;

    await ctx.audioWorklet.addModule(WORKLET_URL);

    node = new AudioWorkletNode(ctx, WORKLET_NAME, {
      numberOfInputs:  0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });

    node.connect(ctx.destination);

    // clamp cutoff max to Nyquist
    const nyquist = ctx.sampleRate / 2;
    cutoffEl.max = String(Math.min(20000, nyquist));

    pushParams();
    updateReadouts();
    setStatus("ready");
  }

  async function start() {
    await ensureAudioGraph();
    pushParams();
    if (ctx.state !== "running") {
      setStatus("resume…");
      await ctx.resume();
    }
    setRunningUI(true);
    setStatus("running");
  }

  async function stop() {
    if (!ctx) return;
    setStatus("stop…");
    await ctx.suspend();
    setRunningUI(false);
    setStatus("stopped");
  }

  startBtn.addEventListener("click", () => start().catch(console.error));
  stopBtn.addEventListener("click",  () => stop().catch(console.error));

  cutoffEl.addEventListener("input", () => { updateReadouts(); pushParams(); });
  ampEl.addEventListener("input",    () => { updateReadouts(); pushParams(); });
  modeEl.addEventListener("change",  () => { updateReadouts(); pushParams(); });

  // initial UI
  updateReadouts();
  setRunningUI(false);
  setStatus("idle");
})();
