import { AudioEngine } from "../../host/audio.js";
import { Spectrogram } from "./spectrogram.js";

const $ = (id) => document.getElementById(id);

const engine = new AudioEngine();

let osc = null;
let analyser = null;
let spec = null;

let running = false;
let hold = false;

// frequency range (upper bound set after init)
let F0 = 20;
let F1 = 20000;

// sweep state
let sweepStart = 0;
let sweepSecs = 0;

let lastU = 0;        // current sweep position (0..1)
let heldHz = 440;     // last frozen frequency


// ---------- helpers ----------

const uToHz = (u) => F0 * Math.pow(F1 / F0, Math.max(0, Math.min(1, u)));
const hzToU = (hz) =>
  Math.log(Math.max(F0, Math.min(F1, hz)) / F0) / Math.log(F1 / F0);

const niceHz = (hz) =>
  hz >= 1000 ? `${(hz / 1000).toFixed(2)} kHz` : `${Math.round(hz)} Hz`;

function setStatus(t) {
  $("status").textContent = t;
}

function updateHoldUI() {
  $("mode").textContent = hold ? "hold" : "sweep";
  $("hold").textContent = hold ? "hold: on" : "hold: off";

  $("freqLabel").hidden = !hold;
  $("freq").hidden = !hold;
  $("freqVal").hidden = !hold;

  $("dur").disabled = hold;
  $("dur").style.opacity = hold ? "0.55" : "1";
  $("durVal").style.opacity = hold ? "0.55" : "1";

  $("toggle").textContent = running
    ? "stop"
    : hold
    ? "play"
    : "play sweep";
}

function updateFreqReadout(hz) {
  $("freqReadout").textContent = niceHz(hz);
  if (hold) $("freqVal").textContent = niceHz(hz);
}

// ---------- setup ----------

async function setupOnce() {
  if (osc) return;

  await engine.init();
  await engine.loadWorklet("./naive-osc.worklet.js");

  osc = new AudioWorkletNode(engine.ctx, "naive-osc", {
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });

  analyser = engine.ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0;

  osc.connect(analyser);
  engine.setNode(osc);

  spec = new Spectrogram($("spec"), analyser);

  // extend sweep beyond Nyquist
  F1 = engine.sampleRate * 0.95;

  $("sr").textContent = `sr: ${engine.sampleRate}`;
}

// ---------- audio control ----------

function setWave() {
  const map = { sine: 0, square: 1, saw: 2, triangle: 3 };
  engine.setParam("wave", map[$("wave").value] ?? 0);
}

function setGain() {
  const db = Number($("gain").value);
  $("gainVal").textContent = `${db} dB`;
  engine.setParam("gain", Math.pow(10, db / 20));
}

function startSweep(seconds, startU = 0) {
  const p = osc.parameters.get("freq");
  const t0 = engine.ctx.currentTime;

  const total = Number(seconds);
  const u0 = Math.max(0, Math.min(1, startU));
  const remainingU = Math.max(0, 1 - u0);

  // if we're already basically at the end, just pin freq
  if (remainingU <= 1e-4) {
    const hz = uToHz(1);
    p.cancelScheduledValues(t0);
    engine.setParam("freq", hz);
    updateFreqReadout(hz);
    lastU = 1;
    return;
  }

  // keep perceived sweep speed consistent:
  // remaining time scales with remaining u
  const dur = Math.max(0.05, total * remainingU);

  sweepStart = t0;
  sweepSecs = dur;

  const curve = new Float32Array(256);
  for (let i = 0; i < curve.length; i++) {
    const u = u0 + (i / (curve.length - 1)) * remainingU; // u0..1
    curve[i] = uToHz(u);
  }

  p.cancelScheduledValues(t0);
  p.setValueCurveAtTime(curve, t0, dur);

  if (engine._sweepTimer) clearInterval(engine._sweepTimer);
  engine._sweepTimer = setInterval(() => {
    if (!running || hold) return;
    const u = u0 + Math.max(0, Math.min(1, (engine.ctx.currentTime - sweepStart) / sweepSecs)) * remainingU;
    lastU = u;
    updateFreqReadout(uToHz(u));
  }, 60);
}


function freezeAtCurrentFreq() {
  const now = engine.ctx.currentTime;
  const u =
    sweepSecs > 0
      ? Math.max(0, Math.min(1, (now - sweepStart) / sweepSecs))
      : 0.5;

  const hz = uToHz(u);

  const p = osc.parameters.get("freq");
  p.cancelScheduledValues(now);
  engine.setParam("freq", hz);

  $("freq").value = hzToU(hz);
  updateFreqReadout(hz);
}

// ---------- start / stop ----------

async function start() {
  await setupOnce();

  await engine.start();
  setWave();
  setGain();

  spec.start();

  if (hold) {
    const hz = uToHz(Number($("freq").value));
    engine.setParam("freq", hz);
    updateFreqReadout(hz);
    setStatus("playing");
  } else {
    startSweep($("dur").value);
    setStatus("sweeping");
  }

  running = true;
  updateHoldUI();
}

async function stop() {
  running = false;

  if (engine._sweepTimer) {
    clearInterval(engine._sweepTimer);
    engine._sweepTimer = null;
  }

  spec.stop();
  await engine.stop();

  setStatus("idle");
  updateHoldUI();
}

// ---------- UI wiring ----------

$("toggle").addEventListener("click", async () => {
  try {
    if (!running) await start();
    else await stop();
  } catch (e) {
    console.error(e);
    setStatus("error");
  }
});

$("hold").addEventListener("click", () => {
  if (!osc) {
    hold = !hold;
    updateHoldUI();
    return;
  }

  if (running && !hold) {
    // sweep → hold
    hold = true;
    freezeAtCurrentFreq();
    setStatus("playing");
  } else if (running && hold) {
    // hold → sweep (resume from held freq / position)
    hold = false;
    const resumeU = hzToU(heldHz);   // or just lastU
    lastU = resumeU;

startSweep($("dur").value, resumeU);
setStatus("sweeping");

  } else {
    // stopped
    hold = !hold;
  }

  updateHoldUI();
});

$("dur").addEventListener("input", () => {
  $("durVal").textContent = `${$("dur").value}s`;
});

$("gain").addEventListener("input", setGain);

$("freq").addEventListener("input", () => {
  const hz = uToHz(Number($("freq").value));
  updateFreqReadout(hz);
  if (running && hold) engine.setParam("freq", hz);
});

$("wave").addEventListener("change", () => {
  if (osc) setWave();
});

$("clear").addEventListener("click", () => {
  if (spec) spec.clear();
});

// ---------- init ----------

$("durVal").textContent = `${$("dur").value}s`;
$("gainVal").textContent = `${$("gain").value} dB`;
setStatus("idle");
updateHoldUI();
