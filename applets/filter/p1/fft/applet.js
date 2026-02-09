import { AudioEngine } from '../../../host/audio.js';

const engine = new AudioEngine();
const $ = (id) => document.getElementById(id);

const waveformCanvas = $("waveform");
const spectrumCanvas = $("spectrum");
const waveformCtx = waveformCanvas.getContext("2d");
const spectrumCtx = spectrumCanvas.getContext("2d");

function draw() {
  // Read data from analyser
  const timeData = engine.getTimeData();
  const freqData = engine.getFreqData();

  if (!timeData || !freqData) return;

  // Draw waveform to canvas
  // Clear canvas
  waveformCtx.fillStyle = 'rgba(250, 249, 246, 1)';
  waveformCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);

  // Set line style
  waveformCtx.strokeStyle = 'rgba(67, 160, 189, 0.8)';
  waveformCtx.lineWidth = 2;

  // Begin path
  waveformCtx.beginPath();

  // Draw waveform
  for (let i = 0; i < timeData.length; i++) {
    const x = (i / timeData.length) * waveformCanvas.width;
    const y = (timeData[i] / 255) * waveformCanvas.height;

    if (i === 0) {
      waveformCtx.moveTo(x, y);
    } else {
      waveformCtx.lineTo(x, y);
    }
  }

  waveformCtx.stroke();

  // Draw spectrum to canvas
  // Clear canvas
  spectrumCtx.fillStyle = 'rgba(250, 249, 246, 1)';
  spectrumCtx.fillRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);

  const minFreq = 20;
  const maxFreq = 10000;
  const nyquist = engine.sampleRate / 2;

  for (let x = 0; x < spectrumCanvas.width; x++) {
    // Map x to frequency (log scale)
    const freq = minFreq * Math.pow(maxFreq / minFreq, x / spectrumCanvas.width);
    const index = Math.floor((freq / nyquist) * freqData.length);
    const magnitude = freqData[index] || 0;

    const barHeight = (magnitude / 255) * spectrumCanvas.height;
    const y = spectrumCanvas.height - barHeight;

    spectrumCtx.fillRect(x, y, 1, barHeight);
  }
  // Request next frame
  requestAnimationFrame(draw);
}

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
    
    // Start animation loop
    requestAnimationFrame(draw);
    
  } catch (err) {
    setStatus("error: " + err.message);
  }
}

setup();