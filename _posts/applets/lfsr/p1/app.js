let ctx = null;
let node = null;
let usingWorklet = false;
let connected = false;

const startBtn = document.getElementById('startBtn');
const stopBtn  = document.getElementById('stopBtn');
const ampSlider = document.getElementById('amp');
const ampVal = document.getElementById('ampVal');
const srLabel = document.getElementById('sr');

function setAmpUI(v) {
  ampVal.textContent = v.toFixed(2);
}

function setAmp(v) {
  setAmpUI(v);
  if (!node) return;

  if (usingWorklet && node.parameters) {
    node.parameters.get('amplitude').setValueAtTime(v, ctx.currentTime);
  } else {
    window.__lfsrAmplitude = v; // fallback path
  }
}

ampSlider.addEventListener('input', () => setAmp(parseFloat(ampSlider.value)));

async function ensureContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    srLabel.textContent = `Sample rate: ${ctx.sampleRate.toFixed(0)} Hz`;
  }
}

async function ensureNode() {
  if (node) return;

  if (ctx.audioWorklet) {
    usingWorklet = true;

    // Robust relative path (works under baseurl too)
    const workletURL = new URL('./lfsr-noise-processor.js', import.meta.url);
    await ctx.audioWorklet.addModule(workletURL);

    node = new AudioWorkletNode(ctx, 'lfsr-noise-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      parameterData: { amplitude: parseFloat(ampSlider.value) },
    });
  } else {
    usingWorklet = false;

    const bufferSize = 1024;
    const sp = ctx.createScriptProcessor(bufferSize, 0, 1);
    let state = 0x7fff;

    window.__lfsrAmplitude = parseFloat(ampSlider.value);

    sp.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0);
      const amp = window.__lfsrAmplitude;

      for (let i = 0; i < out.length; i++) {
        const lsb0 = state & 1;
        const lsb1 = (state >> 1) & 1;
        const feedback = lsb0 ^ lsb1;
        state = (state >> 1) | (feedback << 14);
        out[i] = (lsb0 ? 1.0 : -1.0) * amp;
      }
    };

    node = sp;
  }
}

startBtn.addEventListener('click', async () => {
  await ensureContext();
  await ensureNode();

  if (!connected) {
    node.connect(ctx.destination);
    connected = true;
  }

  await ctx.resume();
  startBtn.disabled = true;
  stopBtn.disabled = false;
});

stopBtn.addEventListener('click', async () => {
  if (node && connected) {
    node.disconnect();
    connected = false;
  }
  if (ctx && ctx.state !== 'closed') {
    await ctx.suspend();
  }
  startBtn.disabled = false;
  stopBtn.disabled = true;
});