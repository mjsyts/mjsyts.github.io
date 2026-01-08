import { AudioEngine, bindAudioUI } from "/applets/_host/audio.js";

const engine = new AudioEngine();

async function buildNode() {
  await engine.loadWorklet(new URL("./processor.js", window.location.href));
  const node = new AudioWorkletNode(engine.ctx, "lfsr-noise", {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });
  engine.setNode(node);
  engine.connect();
  return node;
}

let node = null;

bindAudioUI({
  engine,
  params: [
    {
      id: "amp",
      format: (v) => v.toFixed(2),
      onInput: (v) => { if (node) engine.setParam("amplitude", v); }
    },
    {
      id: "freq",
      unit: " Hz",
      format: (v) => String(Math.round(v)),
      onInput: (v) => { if (node) engine.setParam("frequency", v); }
    }
  ]
});

// build graph lazily on first start
document.getElementById("start")?.addEventListener("click", async () => {
  if (node) return;
  node = await buildNode();

  // clamp UI max to min(44100, sampleRate)
  const freq = document.getElementById("freq");
  if (freq) {
    const maxHz = Math.min(44100, engine.sampleRate);
    freq.max = String(maxHz);
    if (Number(freq.value) > maxHz) freq.value = String(maxHz);
  }

  // push initial params
  engine.setParam("amplitude", Number(document.getElementById("amp")?.value ?? 0.1));
  engine.setParam("frequency", Number(document.getElementById("freq")?.value ?? 440));
}, { once: true });
