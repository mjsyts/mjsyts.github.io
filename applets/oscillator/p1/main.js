// Discrete Time Oscillator Visualization
// Displays a continuous sine wave with discrete samples

const canvas = document.getElementById('oscillatorCanvas');
const ctx = canvas.getContext('2d');

const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const sampleRateSlider = document.getElementById('sampleRateSlider');
const sampleRateValue = document.getElementById('sampleRateValue');
const sampleIndexSlider = document.getElementById('sampleIndexSlider');
const sampleIndexValue = document.getElementById('sampleIndexValue');
const scrubberRow = document.getElementById('scrubberRow');

// State
let isPlaying = false;
let sampleRate = 8; // Hz
let currentSampleIndex = 0;
let animationFrameId = null;
let lastTimestamp = 0;

// Constants
const FREQUENCY = 1; // Hz (fixed at 1 Hz)
const WINDOW_DURATION = 2; // seconds (two cycles at 1 Hz)
const ADVANCE_RATE = 2; // samples per second when playing

// Colors
const CONTINUOUS_COLOR = 'rgba(45, 92, 140, 1)'; // --accent
const SAMPLE_COLOR = 'rgba(220, 38, 38, 1)'; // red
const HIGHLIGHT_COLOR = 'rgba(220, 38, 38, 1)'; // red highlight
const GRID_COLOR = 'rgba(17, 17, 17, 0.1)'; // light grid

// Initialize canvas size
function resizeCanvas() {
  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  
  // Set display size
  const displayWidth = container.clientWidth - 32; // account for padding
  const displayHeight = 280;
  
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  
  // Set actual size in memory (scaled by device pixel ratio)
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  
  // Scale context to match
  ctx.scale(dpr, dpr);
  
  draw();
}

// Draw the visualization
function draw() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Calculate margins
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  
  // Draw grid
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  
  // Horizontal center line
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top + plotHeight / 2);
  ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight / 2);
  ctx.stroke();
  
  // Vertical time markers (every 0.5 seconds)
  ctx.strokeStyle = GRID_COLOR;
  ctx.fillStyle = 'rgba(17, 17, 17, 0.62)';
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  
  for (let t = 0; t <= WINDOW_DURATION; t += 0.5) {
    const x = margin.left + (t / WINDOW_DURATION) * plotWidth;
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + plotHeight);
    ctx.stroke();
    
    // Time labels
    ctx.fillText(t.toFixed(1) + 's', x, height - 10);
  }
  
  // Y-axis labels
  ctx.textAlign = 'right';
  ctx.fillText('1', margin.left - 8, margin.top + 5);
  ctx.fillText('0', margin.left - 8, margin.top + plotHeight / 2 + 5);
  ctx.fillText('-1', margin.left - 8, margin.top + plotHeight - 5);
  
  // Draw continuous sine wave
  ctx.strokeStyle = CONTINUOUS_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  for (let i = 0; i <= plotWidth; i++) {
    const t = (i / plotWidth) * WINDOW_DURATION;
    const y = Math.sin(2 * Math.PI * FREQUENCY * t);
    const x = margin.left + i;
    const yPixel = margin.top + plotHeight / 2 - (y * plotHeight / 2) * 0.85;
    
    if (i === 0) {
      ctx.moveTo(x, yPixel);
    } else {
      ctx.lineTo(x, yPixel);
    }
  }
  ctx.stroke();
  
  // Calculate sample positions
  const totalSamples = Math.floor(WINDOW_DURATION * sampleRate);
  sampleIndexSlider.max = totalSamples - 1;
  
  // Ensure currentSampleIndex is within bounds
  if (currentSampleIndex >= totalSamples) {
    currentSampleIndex = 0;
  }
  
  // Draw sample points
  for (let n = 0; n < totalSamples; n++) {
    const t = n / sampleRate;
    const y = Math.sin(2 * Math.PI * FREQUENCY * t);
    const x = margin.left + (t / WINDOW_DURATION) * plotWidth;
    const yPixel = margin.top + plotHeight / 2 - (y * plotHeight / 2) * 0.85;
    
    // Draw sample dot
    ctx.fillStyle = SAMPLE_COLOR;
    ctx.beginPath();
    ctx.arc(x, yPixel, n === currentSampleIndex ? 6 : 4, 0, 2 * Math.PI);
    ctx.fill();
    
    // Highlight current sample with a larger circle
    if (n === currentSampleIndex) {
      ctx.strokeStyle = HIGHLIGHT_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, yPixel, 10, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
}

// Update sample rate
function updateSampleRate() {
  sampleRate = parseInt(sampleRateSlider.value, 10);
  sampleRateValue.textContent = sampleRate + ' Hz';
  
  // Reset sample index if out of bounds
  const totalSamples = Math.floor(WINDOW_DURATION * sampleRate);
  if (currentSampleIndex >= totalSamples) {
    currentSampleIndex = 0;
  }
  
  currentSampleIndex = Math.floor(currentSampleIndex);
  sampleIndexSlider.value = currentSampleIndex;
  sampleIndexValue.textContent = currentSampleIndex;
  
  draw();
}

// Update sample index
function updateSampleIndex() {
  currentSampleIndex = parseInt(sampleIndexSlider.value, 10);
  sampleIndexValue.textContent = currentSampleIndex;
  draw();
}

// Play animation
function play() {
  if (isPlaying) return;
  
  isPlaying = true;
  playBtn.disabled = true;
  pauseBtn.disabled = false;
  scrubberRow.style.display = 'none';
  
  lastTimestamp = performance.now();
  animate();
}

// Pause animation
function pause() {
  if (!isPlaying) return;
  
  isPlaying = false;
  playBtn.disabled = false;
  pauseBtn.disabled = true;
  scrubberRow.style.display = 'flex';
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Update scrubber (floor the index since it's a float during animation)
  currentSampleIndex = Math.floor(currentSampleIndex);
  sampleIndexSlider.value = currentSampleIndex;
  sampleIndexValue.textContent = currentSampleIndex;
}

// Animation loop
function animate(timestamp) {
  if (!isPlaying) return;
  
  const deltaTime = (timestamp - lastTimestamp) / 1000; // in seconds
  lastTimestamp = timestamp;
  
  // Advance sample index at gentle visual pace
  const totalSamples = Math.floor(WINDOW_DURATION * sampleRate);
  const advancement = ADVANCE_RATE * deltaTime;
  
  currentSampleIndex += advancement;
  
  // Wrap around
  if (currentSampleIndex >= totalSamples) {
    currentSampleIndex = currentSampleIndex % totalSamples;
  }
  
  draw();
  
  animationFrameId = requestAnimationFrame(animate);
}

// Event listeners
playBtn.addEventListener('click', play);
pauseBtn.addEventListener('click', pause);
sampleRateSlider.addEventListener('input', updateSampleRate);
sampleIndexSlider.addEventListener('input', updateSampleIndex);

window.addEventListener('resize', resizeCanvas);

// Initialize
resizeCanvas();
pauseBtn.disabled = true; // Start paused
scrubberRow.style.display = 'flex'; // Show scrubber initially
