import { AudioEngine } from '../../../host/audio.js';

let cleanBuffer = null;
let humBuffer = null;
let currentSource = null; // 'clean', 'hum', or 'mic'
let bufferSourceNode = null; // for stopping/starting audio playback
let gainNode = null; // for fading audio
let isPlaying = false;

const engine = new AudioEngine();
const $ = (id) => document.getElementById(id);

const waveformCanvas = $("waveform");
const spectrumCanvas = $("spectrum");
const waveformCtx = waveformCanvas.getContext("2d");
const spectrumCtx = spectrumCanvas.getContext("2d");
function drawSpectrumGridAndLabels(ctx, canvas, minFreq, maxFreq) {
  const frequencies = [100, 1000, 10000];
  const dbLevels = [-60, -40, -20, 0];
  
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
  ctx.lineWidth = 1;
  
  // Draw vertical grid lines at frequency positions
  frequencies.forEach(freq => {
    if (freq >= minFreq && freq <= maxFreq) {
      const x = Math.log(freq / minFreq) / Math.log(maxFreq / minFreq) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
  });
  
  // Draw horizontal grid lines at dB positions
  dbLevels.forEach(db => {
    const normalizedDb = (db + 60) / 60;
    const y = canvas.height * (1 - normalizedDb);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  });
  
  // Draw frequency labels
  ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  frequencies.forEach(freq => {
    if (freq >= minFreq && freq <= maxFreq) {
      const x = Math.log(freq / minFreq) / Math.log(maxFreq / minFreq) * canvas.width;
      const label = freq >= 1000 ? `${freq / 1000}kHz` : `${freq}Hz`;
      ctx.fillText(label, x, canvas.height - 15);
    }
  });
  
  // Draw power labels with padding to avoid clipping
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  dbLevels.forEach(db => {
    const normalizedDb = (db + 60) / 60;
    let y = canvas.height * (1 - normalizedDb);
    // Add padding to prevent clipping
    y = Math.max(8, Math.min(canvas.height - 8, y));
    ctx.fillText(`${db}dB`, 5, y);
  });
}

function drawWaveformGridAndLabels(ctx, canvas) {
  const levels = [1.0, 0.5, 0.0, -0.5, -1.0];
  
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
  ctx.lineWidth = 1;
  
  // Draw horizontal grid lines at amplitude positions
  levels.forEach(level => {
    const y = canvas.height * (1 - (level + 1) / 2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  });
  
  // Draw amplitude labels with padding to avoid clipping
  ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  levels.forEach(level => {
    let y = canvas.height * (1 - (level + 1) / 2);
    // Add padding to prevent clipping
    y = Math.max(8, Math.min(canvas.height - 8, y));
    ctx.fillText(level.toFixed(1), 5, y);
  });
}

function draw() {
  // Request next frame at start so it's continuous while playing
  if (isPlaying) {
    requestAnimationFrame(draw);
  }

  // Read data from analyser - these might be null if not initialized
  let timeData = null;
  let freqData = null;
  
  try {
    timeData = engine.getTimeData();
    freqData = engine.getFreqData();
  } catch (e) {
    // Analyser not ready yet
  }

  // Draw waveform to canvas
  waveformCtx.fillStyle = 'rgba(250, 249, 246, 1)';
  waveformCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);
  drawWaveformGridAndLabels(waveformCtx, waveformCanvas);
  
  // Draw spectrum to canvas
  spectrumCtx.fillStyle = 'rgba(250, 249, 246, 1)';
  spectrumCtx.fillRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
  drawSpectrumGridAndLabels(spectrumCtx, spectrumCanvas, 20, 10000);

  // If we don't have data, just return with grids drawn
  if (!timeData || !freqData) {
    return;
  }

  // Set line style
  waveformCtx.strokeStyle = 'rgba(222, 141, 116, 0.8)';
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

  // Draw spectrum data
  const minFreq = 20;
  const maxFreq = 10000;
  const nyquist = engine.sampleRate / 2;

  // Set fill color for spectrum bars (theme coral)
  spectrumCtx.fillStyle = 'rgba(67, 160, 189, 0.8)';

  for (let x = 0; x < spectrumCanvas.width; x++) {
    // Map x to frequency (log scale)
    const freq = minFreq * Math.pow(maxFreq / minFreq, x / spectrumCanvas.width);
    const index = Math.floor((freq / nyquist) * freqData.length);
    const magnitude = freqData[index] || 0;

    const barHeight = (magnitude / 255) * spectrumCanvas.height;
    const y = spectrumCanvas.height - barHeight;

    spectrumCtx.fillRect(x, y, 1, barHeight);
  }
}

function setStatus(t) {
  $("status").textContent = t;
  const srElement = $("sr");
  if (engine.sampleRate) {
    srElement.textContent = `sample rate: ${engine.sampleRate} Hz`;
  }
}

async function loadAudioFiles() {
  const audioContext = engine.audioContext || new AudioContext();
  
  const [cleanResponse, humResponse] = await Promise.all([
    fetch('/assets/audio/filter/guitar_clean.mp3'),
    fetch('/assets/audio/filter/guitar_hum.mp3')
  ]);
  
  const [cleanArray, humArray] = await Promise.all([
    cleanResponse.arrayBuffer(),
    humResponse.arrayBuffer()
  ]);
  
  cleanBuffer = await audioContext.decodeAudioData(cleanArray);
  humBuffer = await audioContext.decodeAudioData(humArray);
}

async function switchToSource(source) {
  // Stop whatever is currently playing
  stopCurrentSource();
  
  currentSource = source;
  const playBtn = $("play-pause-btn");
  
  if (source === 'mic') {
    // Show overlay, disable play button
    $("overlay").style.display = 'flex';
    playBtn.disabled = true;
    setStatus("click to allow microphone");
  } else {
    // Hide overlay, enable play button
    $("overlay").style.display = 'none';
    playBtn.disabled = false;
    playBtn.textContent = 'play';
    setStatus(`ready: ${source}`);
  }
}

function playBuffer(buffer) {
  if (!engine.audioContext) {
    engine.audioContext = new AudioContext();
    engine.ctx = engine.audioContext; // Keep AudioEngine happy
  }
  
  // Resume context if suspended
  if (engine.audioContext.state === 'suspended') {
    engine.audioContext.resume();
  }
  
  // Create analyser if needed (for FFT visualization)
  if (!engine.analyser) {
    engine.analyser = engine.audioContext.createAnalyser();
    engine.analyser.fftSize = 4096;
  }
  
  // Create gain node for fading if needed
  if (!gainNode) {
    gainNode = engine.audioContext.createGain();
    gainNode.connect(engine.analyser);
    engine.analyser.connect(engine.audioContext.destination);
  }
  
  // Initialize data arrays for visualization
  if (!engine.timeData) {
    engine.timeData = new Uint8Array(engine.analyser.fftSize);
  }
  if (!engine.freqData) {
    engine.freqData = new Uint8Array(engine.analyser.frequencyBinCount);
  }
  
  // Fade in from 0 to 1 over 50ms
  const now = engine.audioContext.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(1, now + 0.05);
  
  // Create buffer source node
  bufferSourceNode = engine.audioContext.createBufferSource();
  bufferSourceNode.buffer = buffer;
  bufferSourceNode.loop = true; // Loop the guitar
  bufferSourceNode.connect(gainNode);
  bufferSourceNode.start();
  
  isPlaying = true;
  $("play-pause-btn").textContent = "pause";
  
  // Set sample rate and start drawing
  if (!engine.sampleRate) {
    engine.sampleRate = engine.audioContext.sampleRate;
  }
  requestAnimationFrame(draw);
}

function stopCurrentSource() {
  if (bufferSourceNode && gainNode && engine.audioContext) {
    // Fade out over 50ms before stopping
    const now = engine.audioContext.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
    
    // Stop after fade completes
    setTimeout(() => {
      if (bufferSourceNode) {
        bufferSourceNode.stop();
        bufferSourceNode.disconnect();
        bufferSourceNode = null;
      }
    }, 60);
  } else if (bufferSourceNode) {
    bufferSourceNode.stop();
    bufferSourceNode.disconnect();
    bufferSourceNode = null;
  }
  
  // Clean up mic resources
  if (currentSource === 'mic' && engine.stream) {
    engine.stream.getTracks().forEach(track => track.stop());
    engine.stream = null;
  }
  
  // Clean up AudioEngine context when switching from mic to buffer
  if (currentSource === 'mic' && engine.ctx) {
    if (engine.analyser) {
      engine.analyser.disconnect();
      engine.analyser = null;
    }
    engine.ctx = null;
    engine.timeData = null;
    engine.freqData = null;
  }
  
  // Clean up buffer context when switching from buffer to mic
  if (currentSource !== 'mic' && engine.audioContext) {
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
    if (engine.analyser) {
      engine.analyser.disconnect();
      engine.analyser = null;
    }
    engine.audioContext = null;
    engine.ctx = null;
    engine.timeData = null;
    engine.freqData = null;
  }
  
  isPlaying = false;
  $("play-pause-btn").textContent = "play";
}

async function setupMic() {
  try {
    setStatus("requesting microphone...");
    await engine.initWithMic(4096);
    setStatus('listening');
    isPlaying = true;
    $("play-pause-btn").textContent = "pause";
    $("overlay").style.display = 'none';
    
    // Start the draw loop
    requestAnimationFrame(draw);
  } catch (err) {
    setStatus("error: " + err.message);
  }
}

// Overlay click now triggers mic setup
$("overlay").addEventListener('click', () => {
  setupMic();
});

$("source-select").addEventListener('change', (e) => {
  switchToSource(e.target.value);
});

$("play-pause-btn").addEventListener('click', () => {
  if (currentSource === 'mic') {
    // Mic doesn't pause, it just stops
    if (isPlaying) {
      stopCurrentSource();
    } else {
      setupMic(); // restart mic
    }
  } else {
    // Toggle buffer playback
    if (isPlaying) {
      if (engine.audioContext) {
        engine.audioContext.suspend();
      }
      isPlaying = false;
      $("play-pause-btn").textContent = "play";
    } else {
      // Always create a fresh buffer source when playing
      if (!bufferSourceNode) {
        const buffer = currentSource === 'clean' ? cleanBuffer : humBuffer;
        playBuffer(buffer);
        setStatus(`playing: ${currentSource}`);
      } else {
        // Resume from pause
        if (engine.audioContext) {
          engine.audioContext.resume();
        }
        isPlaying = true;
        $("play-pause-btn").textContent = "pause";
        // Restart animation loop
        requestAnimationFrame(draw);
      }
    }
  }
});

// Load audio files and set initial source
loadAudioFiles().then(() => {
  currentSource = 'clean';
  setStatus("ready: clean");
  $("play-pause-btn").disabled = false;
  // Draw initial grids
  requestAnimationFrame(draw);
});