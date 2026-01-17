import { AudioEngine } from "../../host/audio.js";
import { Spectrogram } from "./spectrogram.js";

const $ = (id) => document.getElementById(id);

const engine = new AudioEngine();

let osc = null;
let analyser = null;
let spec = null;

let running = false;

// range
const F0 = 20;
let F1 = 20000; // set after init

const uToHz = (u) => F0 * Math.pow(F1 / F0, Math.max(0, Math.min(1, u)));
const niceHz = (hz) =>
  hz >= 1000 ? `${(hz / 1000).toFixed(2)} kHz` : `${Math.round(hz)} Hz`;

function setStatus(t) {
  $("status").textContent = t;
}

function updateGainUI() {
  const db = Number($("gain").value);
  $("gainVal").textContent = `${db} dB`;
  if (osc) engine.setParam("gain", Math.pow(10, db / 20));
}

function updateDurUI() {
  $("durVal").textContent = `${$("dur").value}s`;
}

function setWave() {
  const map = { sine: 0, square: 1, saw: 2, triangle: 3 };
  if (osc) engine.setParam("wave", map[$("wave").value] ?? 0);
}

function updateFreqReadout(hz) {
  const t = isFinite(hz) ? (hz >= 1000 ? `${(hz/1000).toFixed(2)} kHz` : `${Math.round(hz)} Hz`) : "—";
  $("freqTop").textContent = `freq: ${t}`;
}

async function setupOnce() {
  if (osc) return;

  await engine.init();
  await engine.loadWorklet("./naive-osc.worklet.js");

  updateFreqReadout(NaN);

  osc = new AudioWorkletNode(engine.ctx, "naive-osc", {
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });

  analyser = engine.ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0;

  // tap for viz
  osc.connect(analyser);

  // output through engine master
  engine.setNode(osc);

  spec = new Spectrogram($("spec"), analyser);

  F1 = engine.sampleRate * 0.95;

  $("sr").textContent = `sr: ${engine.sampleRate}`;
}

function startSweep(seconds) {
  const p = osc.parameters.get("freq");
  const t0 = engine.ctx.currentTime;
  const dur = Number(seconds);

  const curve = new Float32Array(256);
  for (let i = 0; i < curve.length; i++) curve[i] = uToHz(i / (curve.length - 1));

  p.cancelScheduledValues(t0);
  p.setValueCurveAtTime(curve, t0, dur);

  // readout timer
  if (engine._sweepTimer) clearInterval(engine._sweepTimer);
  engine._sweepTimer = setInterval(() => {
    if (!running) return;
    const u = Math.max(0, Math.min(1, (engine.ctx.currentTime - t0) / dur));
    updateFreqReadout(uToHz(u));
  }, 60);
}

async function start() {
  await setupOnce();

  setStatus("init…");
  await engine.start();

  setWave();
  updateGainUI();

  spec.start();
  startSweep($("dur").value);

  running = true;
  $("toggle").textContent = "stop";
  $("toggle").classList.remove("primary");
  setStatus("sweeping");
}

async function stop() {
  running = false;

  if (engine._sweepTimer) {
    clearInterval(engine._sweepTimer);
    engine._sweepTimer = null;
  }

  if (spec) spec.stop();
  await engine.stop();

  $("toggle").textContent = "play sweep";
  $("toggle").classList.add("primary");
  setStatus("idle");
}

// ---- UI wiring ----
$("toggle").addEventListener("click", async () => {
  try {
    if (!running) await start();
    else await stop();
  } catch (e) {
    console.error(e);
    setStatus("error");
    running = false;
    $("toggle").textContent = "play sweep";
    $("toggle").classList.add("primary");
  }
});

$("dur").addEventListener("input", () => {
  updateDurUI();
});

$("gain").addEventListener("input", () => {
  updateGainUI();
});

$("wave").addEventListener("change", () => {
  setWave();
});

$("clear").addEventListener("click", () => {
  if (spec) spec.clear();
});

// ---- initial ----
updateDurUI();
$("gainVal").textContent = `${$("gain").value} dB`;
setStatus("idle");
updateFreqReadout(NaN);
