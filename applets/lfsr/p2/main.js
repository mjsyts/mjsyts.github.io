// applets/lfsr/p2/main.js
(() => {
  const $ = (id) => document.getElementById(id);

  // Support either id scheme
  const startBtn = $("start") || $("startBtn");
  const stopBtn  = $("stop")  || $("stopBtn");

  const srEl     = $("sr");
  const statusEl = $("status"); // optional

  const amp    = $("amp");
  const freq   = $("freq");
  const ampVal = $("ampVal");
  const freqVal= $("freqVal");

  if (!startBtn || !stopBtn || !srEl || !amp || !freq || !ampVal || !freqVal) {
    console.warn("[P2] Missing required elements. Check your HTML ids.");
    return;
  }

  let ctx = null;
  let node = null;

  const WORKLET_URL  = new URL("./processor.js", window.location.href);
  const WORKLET_NAME = "lfsr-noise";   // must match registerProcessor() name in processor.js
  const PARAM_AMP    = "amplitude";    // must match AudioParam name in processor.js
  const PARAM_FREQ   = "frequency";    // must match AudioParam name in processor.js

  function setStatus(t) {
    if (statusEl) statusEl.textContent = t;
  }

  function setRunningUI(running) {
    startBtn.disabled = running;
    stopBtn.disabled = !running;
  }

  function updateReadouts() {
    ampVal.textContent = Number(amp.value).toFixed(2);
    freqVal.textContent = `${Math.round(Number(freq.value))} Hz`;
  }

  function clampFreqMax() {
    if (!ctx) return;
    const maxHz = Math.min(44100, ctx.sampleRate);
    freq.max = String(maxHz);
    if (Number(freq.value) > maxHz) freq.value = String(maxHz);
    updateReadouts();
  }

  async function ensureAudioGraph() {
    if (ctx) return;

    setStatus("init…");

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();

    srEl.textContent = `sample rate: ${Math.round(ctx.sampleRate)}`;

    await ctx.audioWorklet.addModule(WORKLET_URL);

    node = new AudioWorkletNode(ctx, WORKLET_NAME, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });

    node.connect(ctx.destination);

    clampFreqMax();

    // push initial params
    const pAmp = node.parameters.get(PARAM_AMP);
    const pFreq = node.parameters.get(PARAM_FREQ);
    if (pAmp)  pAmp.value  = Number(amp.value);
    if (pFreq) pFreq.value = Number(freq.value);

    setStatus("ready");
  }

  async function start() {
    await ensureAudioGraph();

    // refresh params at start
    node.parameters.get(PARAM_AMP).value  = Number(amp.value);
    node.parameters.get(PARAM_FREQ).value = Number(freq.value);

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

  amp.addEventListener("input", () => {
    updateReadouts();
    if (node) node.parameters.get(PARAM_AMP).value = Number(amp.value);
  });

  freq.addEventListener("input", () => {
    updateReadouts();
    if (node) node.parameters.get(PARAM_FREQ).value = Number(freq.value);
  });

  // initial UI
  updateReadouts();
  setRunningUI(false);
  setStatus("idle");
})();
