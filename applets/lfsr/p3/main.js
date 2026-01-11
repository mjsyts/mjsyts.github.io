// applets/lfsr/p3/main.js
(() => {
  const $ = (id) => document.getElementById(id);

  const startBtn = $("start");
  const stopBtn  = $("stop");
  const resetBtn = $("reset");

  const srEl     = $("sr");
  const statusEl = $("status");

  const amp      = $("amp");
  const freq     = $("freq");
  const width    = $("width");
  const ampVal   = $("ampVal");
  const freqVal  = $("freqVal");
  const widthVal = $("widthVal");

  if (!startBtn || !stopBtn || !resetBtn || !srEl || !amp || !freq || !width || !ampVal || !freqVal || !widthVal) {
    console.warn("[P3] Missing required elements. Check your HTML ids.");
    return;
  }

  let ctx = null;
  let node = null;

  const WORKLET_URL  = new URL("./processor.js", window.location.href);
  const WORKLET_NAME = "lfsr-noise";
  const PARAM_AMP    = "amplitude";
  const PARAM_FREQ   = "frequency";
  const PARAM_WIDTH  = "width";

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
    widthVal.textContent = String(Math.round(Number(width.value)));
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
    const pWidth = node.parameters.get(PARAM_WIDTH);
    if (pAmp)   pAmp.value   = Number(amp.value);
    if (pFreq)  pFreq.value  = Number(freq.value);
    if (pWidth) pWidth.value = Number(width.value);

    setStatus("ready");
  }

  async function start() {
    await ensureAudioGraph();

    // refresh params at start
    node.parameters.get(PARAM_AMP).value   = Number(amp.value);
    node.parameters.get(PARAM_FREQ).value  = Number(freq.value);
    node.parameters.get(PARAM_WIDTH).value = Number(width.value);

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

  function reset() {
    if (!node || !node.port) return;
    node.port.postMessage({ type: "reset" });
    setStatus("reset");
  }

  startBtn.addEventListener("click", () => start().catch(console.error));
  stopBtn.addEventListener("click", () => stop().catch(console.error));
  resetBtn.addEventListener("click", () => reset());

  amp.addEventListener("input", () => {
    updateReadouts();
    const p = node?.parameters.get(PARAM_AMP);
    if (p) p.value = Number(amp.value);
  });

  freq.addEventListener("input", () => {
    updateReadouts();
    const p = node?.parameters.get(PARAM_FREQ);
    if (p) p.value = Number(freq.value);
  });

  width.addEventListener("input", () => {
    updateReadouts();
    const p = node?.parameters.get(PARAM_WIDTH);
    if (p) p.value = Number(width.value);
  });

  // Initial UI state
  updateReadouts();
  setRunningUI(false);
  setStatus("idle");
})();
