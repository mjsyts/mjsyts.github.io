const TAU = Math.PI * 2;

const state = {
  fsVis: 1000,
  f: 2,
  fEff: 2,
  forceExact: false,
  windowSize: 512,
  samplesPerFrame: 5,
  phase: 0,
  phaseIncrement: 0,
  n: 0,
  phaseHistory: [],
  yHistory: [],
  wrapHistory: [],
  isPlaying: false,
  rafId: null
};

const elements = {
  fsSelect: document.getElementById('fsSelect'),
  freqSlider: document.getElementById('freqSlider'),
  freqInput: document.getElementById('freqInput'),
  freqPreset: document.getElementById('freqPreset'),
  forceExact: document.getElementById('forceExact'),
  windowSelect: document.getElementById('windowSelect'),
  speedSlider: document.getElementById('speedSlider'),
  playBtn: document.getElementById('playBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  stepBtn: document.getElementById('stepBtn'),
  resetBtn: document.getElementById('resetBtn'),
  phaseIncrementReadout: document.getElementById('phaseIncrementReadout'),
  nReadout: document.getElementById('nReadout'),
  nIntReadout: document.getElementById('nIntReadout'),
  periodicReadout: document.getElementById('periodicReadout'),
  phaseReadout: document.getElementById('phaseReadout'),
  sampleReadout: document.getElementById('sampleReadout'),
  freqReadout: document.getElementById('freqReadout'),
  freqEffReadout: document.getElementById('freqEffReadout'),
  phaseCanvas: document.getElementById('phaseCanvas'),
  gridCanvas: document.getElementById('gridCanvas'),
  waveCanvas: document.getElementById('waveCanvas')
};

const colors = {
  accent: '#7aa2ff',
  wrap: '#f19f7a',
  grid: 'rgba(255, 255, 255, 0.2)',
  axis: 'rgba(255, 255, 255, 0.35)',
  text: 'rgba(255, 255, 255, 0.65)'
};

// The visual sample rate is intentionally low so individual sample updates are visible,
// while still using the same phase-accumulator math found in audio DSP.
function updateParams() {
  state.fsVis = Number(elements.fsSelect.value);
  state.forceExact = elements.forceExact.checked;
  state.windowSize = Number(elements.windowSelect.value);
  state.samplesPerFrame = Number(elements.speedSlider.value);

  const fInput = Number(elements.freqInput.value);
  const fSlider = Number(elements.freqSlider.value);
  let f = Number.isFinite(fInput) ? fInput : fSlider;
  const minF = 0.1;
  const maxF = Math.max(minF, state.fsVis * 0.49);
  f = Math.max(minF, Math.min(maxF, f));

  if (Math.abs(f - fInput) > 1e-6) {
    elements.freqInput.value = f.toFixed(1);
  }
  if (Math.abs(f - fSlider) > 1e-6) {
    elements.freqSlider.value = f.toFixed(1);
  }

  state.f = f;

  if (state.forceExact) {
    const nInt = Math.max(2, Math.round(state.fsVis / state.f));
    state.phaseIncrement = 1 / nInt;
    state.fEff = state.fsVis / nInt;
  } else {
    state.phaseIncrement = state.f / state.fsVis;
    state.fEff = state.f;
  }

  if (state.phaseHistory.length > state.windowSize) {
    state.phaseHistory = state.phaseHistory.slice(-state.windowSize);
    state.yHistory = state.yHistory.slice(-state.windowSize);
    state.wrapHistory = state.wrapHistory.slice(-state.windowSize);
  }

  updateReadouts();
}

function updateReadouts() {
  const nFloat = state.fsVis / state.f;
  const nInt = state.forceExact ? Math.max(2, Math.round(state.fsVis / state.f)) : null;

  elements.phaseIncrementReadout.textContent = state.phaseIncrement.toFixed(12);
  elements.nReadout.textContent = nFloat.toFixed(3);
  elements.nIntReadout.textContent = state.forceExact ? String(nInt) : '—';
  elements.periodicReadout.textContent = state.forceExact ? 'Yes' : 'No';
  elements.phaseReadout.textContent = state.phase.toFixed(6);
  elements.sampleReadout.textContent = String(state.n);
  elements.freqReadout.textContent = `${state.f.toFixed(3)} Hz`;
  elements.freqEffReadout.textContent = state.forceExact ? `${state.fEff.toFixed(3)} Hz` : '—';
}

function stepSample() {
  const currentIndex = state.n;
  state.phase += state.phaseIncrement;
  let wrapped = false;
  if (state.phase >= 1) {
    state.phase -= 1;
    wrapped = true;
  }

  const y = Math.sin(TAU * state.phase);

  state.phaseHistory.push(state.phase);
  state.yHistory.push(y);
  state.wrapHistory.push(wrapped);

  if (state.phaseHistory.length > state.windowSize) {
    state.phaseHistory.shift();
    state.yHistory.shift();
    state.wrapHistory.shift();
  }

  state.n = currentIndex + 1;
}

function stepMany(k) {
  for (let i = 0; i < k; i += 1) {
    stepSample();
  }
}

function resetState() {
  state.phase = 0;
  state.n = 0;
  state.phaseHistory = [];
  state.yHistory = [];
  state.wrapHistory = [];
  updateReadouts();
  renderAll();
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

function drawAxes(ctx, width, height, yMin, yMax, label) {
  const padding = 30;
  ctx.save();
  ctx.strokeStyle = colors.axis;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  ctx.fillStyle = colors.text;
  ctx.font = '12px var(--ui, sans-serif)';
  ctx.fillText(label, padding + 8, padding + 12);
  ctx.fillText(yMax.toFixed(1), 6, padding + 6);
  ctx.fillText(yMin.toFixed(1), 6, height - padding + 12);
  ctx.restore();

  return { padding };
}

function drawPhasePlot() {
  const ctx = resizeCanvas(elements.phaseCanvas);
  const { width, height } = elements.phaseCanvas.getBoundingClientRect();
  ctx.clearRect(0, 0, width, height);

  const { padding } = drawAxes(ctx, width, height, 0, 1, 'phase');
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const count = state.phaseHistory.length;

  if (count < 2) {
    return;
  }

  const offset = Math.max(0, state.windowSize - count);

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  state.phaseHistory.forEach((value, i) => {
    const x = padding + ((offset + i) / (state.windowSize - 1)) * plotWidth;
    const y = padding + (1 - value) * plotHeight;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = colors.wrap;
  state.wrapHistory.forEach((wrapped, i) => {
    if (!wrapped) return;
    const x = padding + ((offset + i) / (state.windowSize - 1)) * plotWidth;
    const y = padding + plotHeight;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, TAU);
    ctx.fill();
  });
}

function drawGridPlot() {
  const ctx = resizeCanvas(elements.gridCanvas);
  const { width, height } = elements.gridCanvas.getBoundingClientRect();
  ctx.clearRect(0, 0, width, height);

  const { padding } = drawAxes(ctx, width, height, 0, 1, 'wrap grid');
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const count = state.windowSize;
  const markerY = padding + plotHeight / 2;

  ctx.fillStyle = colors.grid;
  for (let i = 0; i < count; i += 1) {
    const x = padding + (i / (count - 1)) * plotWidth;
    ctx.beginPath();
    ctx.arc(x, markerY, 2, 0, TAU);
    ctx.fill();
  }

  const dataCount = state.wrapHistory.length;
  if (dataCount === 0) {
    return;
  }

  const offset = Math.max(0, state.windowSize - dataCount);
  ctx.fillStyle = colors.wrap;
  state.wrapHistory.forEach((wrapped, i) => {
    if (!wrapped) return;
    const x = padding + ((offset + i) / (state.windowSize - 1)) * plotWidth;
    ctx.beginPath();
    ctx.arc(x, markerY, 4, 0, TAU);
    ctx.fill();
  });
}

function drawWavePlot() {
  const ctx = resizeCanvas(elements.waveCanvas);
  const { width, height } = elements.waveCanvas.getBoundingClientRect();
  ctx.clearRect(0, 0, width, height);

  const { padding } = drawAxes(ctx, width, height, -1, 1, 'waveform');
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const count = state.yHistory.length;

  if (count < 2) {
    return;
  }

  const offset = Math.max(0, state.windowSize - count);

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  state.yHistory.forEach((value, i) => {
    const x = padding + ((offset + i) / (state.windowSize - 1)) * plotWidth;
    const y = padding + (1 - (value + 1) / 2) * plotHeight;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function renderAll() {
  drawPhasePlot();
  drawGridPlot();
  drawWavePlot();
}

function tick() {
  if (!state.isPlaying) return;
  stepMany(state.samplesPerFrame);
  updateReadouts();
  renderAll();
  state.rafId = requestAnimationFrame(tick);
}

function start() {
  if (state.isPlaying) return;
  state.isPlaying = true;
  tick();
}

function stop() {
  state.isPlaying = false;
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

function bindEvents() {
  elements.fsSelect.addEventListener('change', () => {
    updateParams();
    renderAll();
  });

  elements.freqSlider.addEventListener('input', () => {
    elements.freqInput.value = elements.freqSlider.value;
    updateParams();
    renderAll();
  });

  elements.freqInput.addEventListener('input', () => {
    elements.freqSlider.value = elements.freqInput.value;
    updateParams();
    renderAll();
  });

  elements.freqPreset.addEventListener('change', () => {
    if (elements.freqPreset.value) {
      elements.freqInput.value = elements.freqPreset.value;
      elements.freqSlider.value = elements.freqPreset.value;
      updateParams();
      renderAll();
    }
    elements.freqPreset.value = '';
  });

  elements.forceExact.addEventListener('change', () => {
    updateParams();
    renderAll();
  });

  elements.windowSelect.addEventListener('change', () => {
    updateParams();
    renderAll();
  });

  elements.speedSlider.addEventListener('input', () => {
    updateParams();
  });

  elements.playBtn.addEventListener('click', start);
  elements.pauseBtn.addEventListener('click', stop);
  elements.stepBtn.addEventListener('click', () => {
    stop();
    stepSample();
    updateReadouts();
    renderAll();
  });
  elements.resetBtn.addEventListener('click', () => {
    stop();
    resetState();
  });

  window.addEventListener('resize', () => {
    renderAll();
  });
}

updateParams();
bindEvents();
resetState();
