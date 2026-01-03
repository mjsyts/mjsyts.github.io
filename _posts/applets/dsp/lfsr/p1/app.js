let ctx = null;
let node = null;          // AudioWorkletNode or ScriptProcessorNode
let usingWorklet = false;
let connected = false;

const startBtn  = document.getElementById('startBtn');
const stopBtn   = document.getElementById('stopBtn');
const ampSlider = document.getElementById('amp');
const ampVal    = document.getElementById('ampVal');
const srLabel   = document.getElementById('sr');

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

