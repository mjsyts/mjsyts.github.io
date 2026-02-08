import { AudioEngine } from '../../../host/audio.js';

const engine = new AudioEngine();
const $ = (id) => document.getElementById(id);

function setStatus(t) {
  $("status").textContent = t;
}

async function setup() {
  try {
    setStatus("requesting microphone...");
    await engine.initWithMic(4096);
    setStatus('listening');
    
    console.log('Sample rate:', engine.sampleRate);
    console.log('Frequency bins:', engine.analyser.frequencyBinCount);
    
    // TODO: Start animation loop
    
  } catch (err) {
    setStatus("error: " + err.message);
  }
}

setup();