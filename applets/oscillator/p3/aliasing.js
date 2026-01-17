import { AudioEngine } from "/applets/host/audio.js";
import { Spectrogram } from "./spectrogram.js";

const $ = (id) => document.getElementById(id);

const engine = new AudioEngine();

const F0 = 20, F1 = 20000;
const uToHz = (u) => F0 * Math.pow(F1 / F0, Math.max(0, Math.min(1, u)));
const niceHz = (hz) => (hz >= 1000 ? `${(hz / 1000).toFixed(2)} kHz` : `${Math.round(hz)} Hz`);

let osc = null;
let analyser = null;
let spec = null;

let running = false;
let hold = false;

function setStatus(t) { $("status").textContent = t; }

function clearCanvasFallback() {
  const c = $("spec");
  const g = c.getContext("2d", { alpha: false });
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
}

async function setupOnce() {
  if (osc) return;

  // 1) ensure context + master exist
  await engine.init();

  // 2) load worklet
  await engine.loadWorklet("./naive-osc.worklet.js");

  // 3) create node with a live context
  osc = new AudioWorkletNode(engine.ctx, "naive-osc", {
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });

  // 4) analyser tap
  analyser = engine.ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.0;

  osc.connect(analyser);

  // 5) tell engine about the node *after* master exists
  engine.setNode(osc);

  spec = new Spectrogram($("spec"), analyser);

  $("sr").textContent = `sr: ${engine.sampleRate}`;
}


function setWave() {
  const map = { sine: 0, square: 1, saw: 2, triangle: 3 };
  engine.setParam("wave", map[$("wave").value] ?? 0);
}

function setGainFromUI() {
  const db = Number($("gain").value);
  $("gainVal").textContent = `${db} dB`;
  engine.setParam("gain", Math.pow(10, db / 20));
}

function setDurFromUI() {
  $("durVal").textContent = `${$("dur").value}s`;
}

function setHoldUI() {
  $("mode").textContent = hold ? "hold" : "sweep";
  $("hold").textContent = hold ? "hold: on" : "hold: off";

  const show = hold;
  $("freqLabel").hidden = !show;
  $("freq").hidden = !show;
  $("freqVal").hidden = !show;

  // duration irrelevant in hold mode
  $("dur").disabled = hold;
  $("dur").style.opacity = hold ? "0.55" : "1";
  $("durVal").style.opacity = hold ? "0.55" : "1";

  $("toggle").textContent = running ? "stop" : (hold ? "play" : "play sweep");
}

function updateFreqUI(hz) {
  $("freqReadout").textContent = niceHz(hz);
  if (hold) $("freqVal").textContent = niceHz(hz);
}

function runSweep(seconds) {
  const p = osc.parameters.get("freq");
  const t = engine.ctx.currentTime;

  const curve = new Float32Array(256);
  for (let i = 0; i < curve.length; i++) {
    curve[i] = uToHz(i / (curve.length - 1));
  }

  p.cancelScheduledValues(t);
  p.setValueCurveAtTime(curve, t, Number(seconds));

  // approximate readout during sweep
  const t0 = engine.ctx.currentTime;
  const secs = Number(seconds);
  if (engine._sweepTimer) clearInterval(engine._sweepTimer);
  engine._sweepTimer = setInterval(() => {
    if (!running || hold) return;
    const u = Math.max(0, Math.min(1, (engine.ctx.currentTime - t0) / secs));
    updateFreqUI(uToHz(u));
  }, 60);
}

function setHoldFreqFromUI() {
  const hz = uToHz(Number($("freq").value));
  engine.setParam("freq", hz);
  $("freqVal").textContent = niceHz(hz);
  updateFreqUI(hz);
}

async function start() {
  await setupOnce();

  setStatus("init…");
  await engine.start();

  setWave();
  setGainFromUI();

  // start viz only when running
  spec.start();

  if (hold) {
    setHoldFreqFromUI();
    setStatus("playing");
  } else {
    runSweep($("dur").value);
    setStatus("sweeping");
  }

  running = true;
  $("toggle").classList.remove("primary");
  setHoldUI();
}

async function stop() {
  setStatus("stop…");
  running = false;

  if (engine._sweepTimer) {
    clearInterval(engine._sweepTimer);
    engine._sweepTimer = null;
  }

  // stop viz loop to save CPU
  if (spec) spec.stop();

  await engine.stop();
  setStatus("idle");

  $("toggle").classList.add("primary");
  setHoldUI();
}

// ---- UI wiring ----

$("dur").addEventListener("input", setDurFromUI);
$("gain").addEventListener("input", () => {
  $("gainVal").textContent = `${$("gain").value} dB`;
  if (osc && engine.ctx) setGainFromUI();
});

$("freq").addEventListener("input", () => {
  const hz = uToHz(Number($("freq").value));
  $("freqVal").textContent = niceHz(hz);
  updateFreqUI(hz);
  if (running && hold) engine.setParam("freq", hz);
});

$("wave").addEventListener("change", () => {
  if (osc) setWave();
});

$("clear").addEventListener("click", () => {
  if (spec) spec.clear();
  else clearCanvasFallback();
});

$("hold").addEventListener("click", async () => {
  // switch modes safely
  if (running) await stop();
  hold = !hold;

  // sensible default when turning hold on
  if (hold) {
    $("freq").value = "0.5";
    const hz = uToHz(0.5);
    $("freqVal").textContent = niceHz(hz);
    updateFreqUI(hz);
  } else {
    $("freqReadout").textContent = "—";
  }

  setHoldUI();
});

$("toggle").addEventListener("click", async () => {
  try {
    if (!running) await start();
    else await stop();
  } catch (e) {
    console.error(e);
    setStatus("error");
    running = false;
    $("toggle").classList.add("primary");
    setHoldUI();
  }
});

// ---- initial paint ----
setDurFromUI();
$("gainVal").textContent = `${$("gain").value} dB`;
setStatus("idle");
setHoldUI();
clearCanvasFallback();
