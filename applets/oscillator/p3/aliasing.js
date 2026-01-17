import { AudioEngine } from "/applets/_host/audio.js";
import { Spectrogram } from "./spectrogram.js";

const $ = (id) => document.getElementById(id);

const engine = new AudioEngine();

const F0 = 20, F1 = 20000;
const uToHz = (u) => F0 * Math.pow(F1 / F0, u);
const niceHz = (hz) => hz >= 1000 ? `${(hz / 1000).toFixed(2)} kHz` : `${hz | 0} Hz`;

let osc, analyser, spec;
let running = false;
let hold = false;

async function setup() {
  await engine.loadWorklet("./naive-osc.worklet.js");

  osc = new AudioWorkletNode(engine.ctx, "naive-osc", {
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });

  analyser = engine.ctx.createAnalyser();
  analyser.fftSize = 2048;

  osc.connect(analyser);
  engine.setNode(osc);

  spec = new Spectrogram($("spec"), analyser);

  $("sr").textContent = `sr: ${engine.sampleRate}`;
}

function setWave() {
  const map = { sine: 0, square: 1, saw: 2, triangle: 3 };
  engine.setParam("wave", map[$("wave").value]);
}

function setGain() {
  engine.setParam("gain", Math.pow(10, $("gain").value / 20));
}

function sweep(seconds) {
  const p = osc.parameters.get("freq");
  const t = engine.ctx.currentTime;

  const curve = new Float32Array(256);
  for (let i = 0; i < curve.length; i++) {
    curve[i] = uToHz(i / (curve.length - 1));
  }

  p.cancelScheduledValues(t);
  p.setValueCurveAtTime(curve, t, seconds);
}

$("toggle").onclick = async () => {
  if (!osc) await setup();

  if (!running) {
    await engine.start();
    setWave();
    setGain();
    spec.start();

    if (hold) {
      engine.setParam("freq", uToHz($("freq").value));
      $("status").textContent = "playing";
    } else {
      sweep($("dur").value);
      $("status").textContent = "sweeping";
    }

    running = true;
    $("toggle").textContent = "stop";
  } else {
    await engine.stop();
    running = false;
    $("status").textContent = "idle";
    $("toggle").textContent = hold ? "play" : "play sweep";
  }
};

$("hold").onclick = () => {
  if (running) $("toggle").onclick();
  hold = !hold;

  $("mode").textContent = hold ? "hold" : "sweep";
  $("hold").textContent = hold ? "hold: on" : "hold: off";

  ["freq", "freqVal", "freqLabel"].forEach(id => $(id).hidden = !hold);
};

$("freq").oninput = (e) => {
  const hz = uToHz(+e.target.value);
  $("freqVal").textContent = niceHz(hz);
  $("freqReadout").textContent = niceHz(hz);
  if (running && hold) engine.setParam("freq", hz);
};

$("clear").onclick = () => spec.clear();
