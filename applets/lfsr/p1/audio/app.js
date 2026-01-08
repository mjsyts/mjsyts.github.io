// applets/lfsr/p1/app.js

(() => {
  const $ = (id) => document.getElementById(id);

  // Match your current HTML ids, but fall back to shorter ids if you later normalize
  const startBtn = $("startBtn") || $("start");
  const stopBtn  = $("stopBtn")  || $("stop");
  const srEl     = $("sr");
  const statusEl = $("status"); // optional

  const amp    = $("amp");
  const ampVal = $("ampVal");

  if (!startBtn || !stopBtn || !srEl || !amp || !ampVal) {
    console.warn("[P1] Missing required elements. Check your HTML ids.");
    return;
  }

  let ctx = null;
  let node = null;

  const WORKLET_URL  = new URL("./processor.js", window.location.href);
  const WORKLET_NAME = "lfsr-noise";     // must match registerProcessor() name in processor.js
  const PARAM_AMP    = "amplitude";      // must match the AudioParam name in processor.js

  function setStatus(t) {
    if (statusEl) statusEl.textContent = t;
  }

  function setRunningUI(running) {
    startBtn.disabled = running;
    stopBtn.disabled = !running;
  }

  function updateReadouts() {
    ampVal.textContent = Number(amp.value).toFixed(2);
  }

  async function ensureAudioGraph() {
    if (ctx) return;

    setStatus("init…");

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();

    // Keep the label in the UI
    srEl.textContent = `sample rate: ${ctx.sampleRate}`;

    await ctx.audioWorklet.addModule(WORKLET_URL);

    node = new AudioWorkletNode(ctx, WORKLET_NAME, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });

    node.connect(ctx.destination);

    // Push initial param
    const p = node.parameters.get(PARAM_AMP);
    if (p) p.value = Number(amp.value);

    setStatus("ready");
  }

  async function start() {
    await ensureAudioGraph();

    // Ensure params are up to date
    const p = node?.parameters.get(PARAM_AMP);
    if (p) p.value = Number(amp.value);

    if (ctx && ctx.state !== "running") {
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
  stopBtn.addEventListener("click", () => stop().catch(console.error));

  amp.addEventListener("input", () => {
    updateReadouts();
    const p = node?.parameters.get(PARAM_AMP);
    if (p) p.value = Number(amp.value);
  });

  // Initial UI state
  updateReadouts();
  setRunningUI(false);
  setStatus("idle");
})();
