let ctx = null;
let node = null;

const startBtn = document.getElementById('startBtn');
const stopBtn  = document.getElementById('stopBtn');
const ampSlider = document.getElementById('amp');
const ampVal = document.getElementById('ampVal');
const srLabel = document.getElementById('sr');

function setAmpUI(v) {
  ampVal.textContent = v.toFixed(2);
}

async function ensureContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    srLabel.textContent = `Sample rate: ${ctx.sampleRate.toFixed(0)} Hz`;
  }
  if (ctx.state !== 'running') {
    await ctx.resume(); // must be inside user gesture (Start button)
  }
}

function setAmp(v) {
  setAmpUI(v);
  if (!node || !node.parameters) return;
  const p = node.parameters.get('amplitude');
  if (p) p.setValueAtTime(v, ctx.currentTime);
}

ampSlider.addEventListener('input', () => setAmp(parseFloat(ampSlider.value)));

startBtn.addEventListener('click', async () => {
  try {
    await ensureContext();

    if (!node) {
      // Path from: /applets/demos/lfsr/p1/  to: /applets/dsp/lfsr/processor.js
      const workletPath = '../../../dsp/lfsr/processor.js';
      await ctx.audioWorklet.addModule(workletPath);

      node = new AudioWorkletNode(ctx, 'lfsr-noise', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      // set initial amp from UI
      setAmp(parseFloat(ampSlider.value));
    }

    node.connect(ctx.destination);
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } catch (err) {
    console.error(err);
    alert(`Audio start failed: ${err?.message || err}`);
  }
});

stopBtn.addEventListener('click', async () => {
  try {
    if (node) node.disconnect();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  } catch (err) {
    console.error(err);
  }
});