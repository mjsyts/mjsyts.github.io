// applets/lfsr/p2/main.js
const $ = (s) => document.querySelector(s);

const startBtn = $("#start");
const stopBtn  = $("#stop");
const statusEl = $("#status");
const srEl     = $("#sr");

const amp = $("#amp");
const freq = $("#freq");
const ampVal = $("#ampVal");
const freqVal = $("#freqVal");

let ctx = null;
let node = null;

function setStatus(t) { statusEl.textContent = t; }

function setRunningUI(running) {
  startBtn.disabled = running;
  stopBtn.disabled = !running;
}

function updateReadouts() {
  ampVal.textContent = Number(amp.value).toFixed(2);
  freqVal.textContent = String(Math.round(Number(freq.value)));
}

function clampFreqMax() {
  // UI max = min(44100, sampleRate)
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

  srEl.textContent = String(ctx.sampleRate);

  // load processor.js from this same directory
  await ctx.audioWorklet.addModule(new URL("./processor.js", window.location.href));

  node = new AudioWorkletNode(ctx, "lfsr-noise", {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });

  node.connect(ctx.destination);

  clampFreqMax();

  node.parameters.get("amplitude").value = Number(amp.value);
  node.parameters.get("frequency").value = Number(freq.value);

  setStatus("ready");
}

async function start() {
  await ensureAudioGraph();

  node.parameters.get("amplitude").value = Number(amp.value);
  node.parameters.get("frequency").value = Number(freq.value);

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

startBtn.addEventListener("click", () => { start().catch(console.error); });
stopBtn.addEventListener("click",  () => { stop().catch(console.error); });

amp.addEventListener("input", () => {
  updateReadouts();
  if (node) node.parameters.get("amplitude").value = Number(amp.value);
});

freq.addEventListener("input", () => {
  updateReadouts();
  if (node) node.parameters.get("frequency").value = Number(freq.value);
});

updateReadouts();
setRunningUI(false);
setStatus("idle");
