// Discrete Time Oscillator Visualization
// Displays a continuous sine wave with discrete samples

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('oscillatorCanvas');
  const ctx = canvas?.getContext('2d');

  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const sampleRateSlider = document.getElementById('sampleRateSlider');
  const sampleRateValue = document.getElementById('sampleRateValue');
  const sampleIndexSlider = document.getElementById('sampleIndexSlider');
  const sampleIndexValue = document.getElementById('sampleIndexValue');
  const scrubberRow = document.getElementById('scrubberRow');

  if (
    !canvas || !ctx ||
    !playBtn || !pauseBtn ||
    !sampleRateSlider || !sampleRateValue ||
    !sampleIndexSlider || !sampleIndexValue ||
    !scrubberRow
  ) {
    console.error('Missing required DOM elements. Check your IDs.', {
      canvas, ctx, playBtn, pauseBtn, sampleRateSlider, sampleRateValue,
      sampleIndexSlider, sampleIndexValue, scrubberRow
    });
    return;
  }

  // State
  let isPlaying = false;
  let sampleRate = 8; // Hz
  let currentSampleIndex = 0; // can be float while playing
  let animationFrameId = null;
  let lastTimestamp = 0;

  // Constants
  const FREQUENCY = 1;        // Hz
  const WINDOW_DURATION = 2;  // seconds (two cycles at 1 Hz)
  const ADVANCE_RATE = 2;     // samples/sec (visual pace)

  // Colors from site palette (assets/css/base/tokens.css)
  const CONTINUOUS_COLOR = '#7191AF';        // --indigo
  const SAMPLE_COLOR = '#DE8D74';            // --coral
  const HIGHLIGHT_COLOR = '#DE8D74';         // --coral
  const GRID_COLOR = 'rgba(17, 17, 17, 0.1)';

  function totalSamples() {
    // Guard against 0 or weird values
    const sr = Math.max(1, sampleRate | 0);
    return Math.max(1, Math.floor(WINDOW_DURATION * sr));
  }

  function setPlayingUI(playing) {
    isPlaying = playing;
    playBtn.disabled = playing;
    pauseBtn.disabled = !playing;
    scrubberRow.style.display = playing ? 'none' : 'flex';
  }

  // Initialize / resize canvas (DPR-safe: avoid cumulative scaling)
  function resizeCanvas() {
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;

    const displayWidth = Math.max(0, (container?.clientWidth || canvas.clientWidth) - 32);
    const displayHeight = 280;

    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);

    // Reset transform each resize, then apply DPR
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    draw();
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Grid
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + plotHeight / 2);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight / 2);
    ctx.stroke();

    // Vertical time markers (every 0.5s)
    ctx.strokeStyle = GRID_COLOR;
    ctx.fillStyle = 'rgba(17, 17, 17, 0.62)';
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'center';

    for (let t = 0; t <= WINDOW_DURATION + 1e-9; t += 0.5) {
      const x = margin.left + (t / WINDOW_DURATION) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotHeight);
      ctx.stroke();

      ctx.fillText(t.toFixed(1) + 's', x, height - 10);
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    ctx.fillText('1', margin.left - 8, margin.top + 5);
    ctx.fillText('0', margin.left - 8, margin.top + plotHeight / 2 + 5);
    ctx.fillText('-1', margin.left - 8, margin.top + plotHeight - 5);

    // Continuous sine wave
    ctx.strokeStyle = CONTINUOUS_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i <= plotWidth; i++) {
      const t = (i / plotWidth) * WINDOW_DURATION;
      const y = Math.sin(2 * Math.PI * FREQUENCY * t);
      const x = margin.left + i;
      const yPixel = margin.top + plotHeight / 2 - (y * plotHeight / 2) * 0.85;

      if (i === 0) ctx.moveTo(x, yPixel);
      else ctx.lineTo(x, yPixel);
    }
    ctx.stroke();

    // Samples
    const N = totalSamples();

    // Keep slider in sync with sample count
    sampleIndexSlider.max = String(N - 1);

    // If currentSampleIndex went bad for any reason, clamp it
    if (!Number.isFinite(currentSampleIndex)) currentSampleIndex = 0;

    const displayIndex = ((Math.floor(currentSampleIndex) % N) + N) % N;

    for (let n = 0; n < N; n++) {
      const t = n / sampleRate;
      const y = Math.sin(2 * Math.PI * FREQUENCY * t);
      const x = margin.left + (t / WINDOW_DURATION) * plotWidth;
      const yPixel = margin.top + plotHeight / 2 - (y * plotHeight / 2) * 0.85;

      ctx.fillStyle = SAMPLE_COLOR;
      ctx.beginPath();
      ctx.arc(x, yPixel, n === displayIndex ? 6 : 4, 0, 2 * Math.PI);
      ctx.fill();

      if (n === displayIndex) {
        ctx.strokeStyle = HIGHLIGHT_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, yPixel, 10, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }

  function updateSampleRate() {
    sampleRate = Math.max(1, parseInt(sampleRateSlider.value, 10) || 1);
    sampleRateValue.textContent = sampleRate + ' Hz';

    const N = totalSamples();

    if (!Number.isFinite(currentSampleIndex)) currentSampleIndex = 0;
    if (currentSampleIndex >= N) currentSampleIndex = 0;

    // Keep scrubber coherent if paused
    if (!isPlaying) {
      currentSampleIndex = Math.floor(currentSampleIndex);
      sampleIndexSlider.value = String(currentSampleIndex);
      sampleIndexValue.textContent = String(currentSampleIndex);
    }

    draw();
  }

  function updateSampleIndex() {
    currentSampleIndex = parseInt(sampleIndexSlider.value, 10) || 0;
    sampleIndexValue.textContent = String(currentSampleIndex);
    draw();
  }

  function play() {
    if (isPlaying) return;

    setPlayingUI(true);

    // IMPORTANT: do not call animate() directly (timestamp would be undefined)
    lastTimestamp = 0;
    animationFrameId = requestAnimationFrame(animate);
  }

  function pause() {
    if (!isPlaying) return;

    setPlayingUI(false);

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    lastTimestamp = 0;

    if (!Number.isFinite(currentSampleIndex)) currentSampleIndex = 0;
    currentSampleIndex = Math.floor(currentSampleIndex);

    sampleIndexValue.textContent = String(currentSampleIndex);
    sampleIndexSlider.value = String(currentSampleIndex);

    draw();
  }

  function animate(timestamp) {
    if (!isPlaying) return;

    // First frame: initialize timestamp and draw without advancing
    if (!Number.isFinite(lastTimestamp) || lastTimestamp === 0) {
      lastTimestamp = timestamp;
      draw();
      animationFrameId = requestAnimationFrame(animate);
      return;
    }

    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const N = totalSamples();

    // Advance in samples/sec
    currentSampleIndex += ADVANCE_RATE * deltaTime;

    // Wrap (keep it finite and in a sane range)
    if (!Number.isFinite(currentSampleIndex)) currentSampleIndex = 0;
    if (currentSampleIndex >= N) currentSampleIndex = currentSampleIndex % N;

    draw();
    animationFrameId = requestAnimationFrame(animate);
  }

  // Events
  playBtn.addEventListener('click', play);
  pauseBtn.addEventListener('click', pause);
  sampleRateSlider.addEventListener('input', updateSampleRate);
  sampleIndexSlider.addEventListener('input', updateSampleIndex);
  window.addEventListener('resize', resizeCanvas);

  // Init (paused)
  setPlayingUI(false);
  updateSampleRate();     // sets label + clamps state + draw
  resizeCanvas();         // sizes canvas + draw (again, safe)
});
