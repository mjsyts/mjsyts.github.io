// applets/filter/p3/biquad/applet.js

const $ = id => document.getElementById(id);

// ─── Filter data ─────────────────────────────────────────────────────────────

const FILTERS = {
  lowpass: {
    name: 'Lowpass',
    desc: 'Passes frequencies below the cutoff, attenuates above. Higher Q produces a resonant peak just before the cutoff.',
    useGain: false,
    coeffs: (cos, sin, alpha, A) => {
      const b0 = (1 - cos) / 2, b1 = 1 - cos, b2 = (1 - cos) / 2;
      const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
      return norm(b0, b1, b2, a0, a1, a2);
    },
    code: {
      cpp: `b0 = (1.0f - cosw0) / 2.0f;
b1 =  1.0f - cosw0;
b2 = (1.0f - cosw0) / 2.0f;
a0 =  1.0f + alpha;
a1 = -2.0f * cosw0;
a2 =  1.0f - alpha;`,
      js: `b0 = (1 - cosw0) / 2;
b1 =  1 - cosw0;
b2 = (1 - cosw0) / 2;
a0 =  1 + alpha;
a1 = -2 * cosw0;
a2 =  1 - alpha;`,
      mojo: `b0 = (1.0 - cosw0) / 2.0
b1 =  1.0 - cosw0
b2 = (1.0 - cosw0) / 2.0
a0 =  1.0 + alpha
a1 = -2.0 * cosw0
a2 =  1.0 - alpha`,
    },
  },

  highpass: {
    name: 'Highpass',
    desc: 'Passes frequencies above the cutoff, attenuates below. Higher Q produces a resonant peak just above the cutoff.',
    useGain: false,
    coeffs: (cos, sin, alpha, A) => {
      const b0 = (1 + cos) / 2, b1 = -(1 + cos), b2 = (1 + cos) / 2;
      const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
      return norm(b0, b1, b2, a0, a1, a2);
    },
    code: {
      cpp: `b0 =  (1.0f + cosw0) / 2.0f;
b1 = -(1.0f + cosw0);
b2 =  (1.0f + cosw0) / 2.0f;
a0 =   1.0f + alpha;
a1 =  -2.0f * cosw0;
a2 =   1.0f - alpha;`,
      js: `b0 =  (1 + cosw0) / 2;
b1 = -(1 + cosw0);
b2 =  (1 + cosw0) / 2;
a0 =   1 + alpha;
a1 =  -2 * cosw0;
a2 =   1 - alpha;`,
      mojo: `b0 =  (1.0 + cosw0) / 2.0
b1 = -(1.0 + cosw0)
b2 =  (1.0 + cosw0) / 2.0
a0 =   1.0 + alpha
a1 =  -2.0 * cosw0
a2 =   1.0 - alpha`,
    },
  },

  bandpass: {
    name: 'Bandpass (constant skirt gain)',
    desc: 'Passes a band of frequencies around the cutoff. Peak amplitude scales with Q — higher Q means a taller, narrower peak.',
    useGain: false,
    coeffs: (cos, sin, alpha, A) => {
      const b0 = sin / 2, b1 = 0, b2 = -sin / 2;
      const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
      return norm(b0, b1, b2, a0, a1, a2);
    },
    code: {
      cpp: `b0 =  sinw0 / 2.0f;
b1 =  0.0f;
b2 = -sinw0 / 2.0f;
a0 =  1.0f + alpha;
a1 = -2.0f * cosw0;
a2 =  1.0f - alpha;`,
      js: `b0 =  sinw0 / 2;
b1 =  0;
b2 = -sinw0 / 2;
a0 =  1 + alpha;
a1 = -2 * cosw0;
a2 =  1 - alpha;`,
      mojo: `b0 =  sinw0 / 2.0
b1 =  0.0
b2 = -sinw0 / 2.0
a0 =  1.0 + alpha
a1 = -2.0 * cosw0
a2 =  1.0 - alpha`,
    },
  },

  bandpass_peak: {
    name: 'Bandpass (constant 0 dB peak)',
    desc: 'Passes a band of frequencies around the cutoff. Peak amplitude is always 0 dB regardless of Q — higher Q narrows the band without changing the peak height.',
    useGain: false,
    coeffs: (cos, sin, alpha, A) => {
      const b0 = alpha, b1 = 0, b2 = -alpha;
      const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
      return norm(b0, b1, b2, a0, a1, a2);
    },
    code: {
      cpp: `b0 =  alpha;
b1 =  0.0f;
b2 = -alpha;
a0 =  1.0f + alpha;
a1 = -2.0f * cosw0;
a2 =  1.0f - alpha;`,
      js: `b0 =  alpha;
b1 =  0;
b2 = -alpha;
a0 =  1 + alpha;
a1 = -2 * cosw0;
a2 =  1 - alpha;`,
      mojo: `b0 =  alpha
b1 =  0.0
b2 = -alpha
a0 =  1.0 + alpha
a1 = -2.0 * cosw0
a2 =  1.0 - alpha`,
    },
  },

  notch: {
    name: 'Notch',
    desc: 'Attenuates a narrow band of frequencies around the cutoff, passing everything else. Higher Q narrows the notch.',
    useGain: false,
    coeffs: (cos, sin, alpha, A) => {
      const b0 = 1, b1 = -2 * cos, b2 = 1;
      const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
      return norm(b0, b1, b2, a0, a1, a2);
    },
    code: {
      cpp: `b0 =  1.0f;
b1 = -2.0f * cosw0;
b2 =  1.0f;
a0 =  1.0f + alpha;
a1 = -2.0f * cosw0;
a2 =  1.0f - alpha;`,
      js: `b0 =  1;
b1 = -2 * cosw0;
b2 =  1;
a0 =  1 + alpha;
a1 = -2 * cosw0;
a2 =  1 - alpha;`,
      mojo: `b0 =  1.0
b1 = -2.0 * cosw0
b2 =  1.0
a0 =  1.0 + alpha
a1 = -2.0 * cosw0
a2 =  1.0 - alpha`,
    },
  },

  allpass: {
    name: 'Allpass',
    desc: 'Passes all frequencies at equal amplitude. Only the phase is affected. Cutoff is where phase shift is exactly 180°. Q controls the steepness of the phase transition.',
    useGain: false,
    coeffs: (cos, sin, alpha, A) => {
      const b0 = 1 - alpha, b1 = -2 * cos, b2 = 1 + alpha;
      const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
      return norm(b0, b1, b2, a0, a1, a2);
    },
    code: {
      cpp: `b0 =  1.0f - alpha;
b1 = -2.0f * cosw0;
b2 =  1.0f + alpha;
a0 =  1.0f + alpha;
a1 = -2.0f * cosw0;
a2 =  1.0f - alpha;`,
      js: `b0 =  1 - alpha;
b1 = -2 * cosw0;
b2 =  1 + alpha;
a0 =  1 + alpha;
a1 = -2 * cosw0;
a2 =  1 - alpha;`,
      mojo: `b0 =  1.0 - alpha
b1 = -2.0 * cosw0
b2 =  1.0 + alpha
a0 =  1.0 + alpha
a1 = -2.0 * cosw0
a2 =  1.0 - alpha`,
    },
  },

  peak: {
    name: 'Peak (Peaking EQ)',
    desc: 'Boosts or cuts a band of frequencies centered at the cutoff. Q controls the width of the peak or notch. Gain sets the amount of boost or cut in dB.',
    useGain: true,
    coeffs: (cos, sin, alpha, A) => {
      const b0 = 1 + alpha * A, b1 = -2 * cos, b2 = 1 - alpha * A;
      const a0 = 1 + alpha / A, a1 = -2 * cos, a2 = 1 - alpha / A;
      return norm(b0, b1, b2, a0, a1, a2);
    },
    code: {
      cpp: `b0 =  1.0f + alpha * A;
b1 = -2.0f * cosw0;
b2 =  1.0f - alpha * A;
a0 =  1.0f + alpha / A;
a1 = -2.0f * cosw0;
a2 =  1.0f - alpha / A;`,
      js: `b0 =  1 + alpha * A;
b1 = -2 * cosw0;
b2 =  1 - alpha * A;
a0 =  1 + alpha / A;
a1 = -2 * cosw0;
a2 =  1 - alpha / A;`,
      mojo: `b0 =  1.0 + alpha * A
b1 = -2.0 * cosw0
b2 =  1.0 - alpha * A
a0 =  1.0 + alpha / A
a1 = -2.0 * cosw0
a2 =  1.0 - alpha / A`,
    },
  },

  lowshelf: {
    name: 'Low Shelf',
    desc: 'Boosts or cuts all frequencies below the cutoff by a fixed amount. The transition region is centered at the cutoff frequency.',
    useGain: true,
    coeffs: (cos, sin, alpha, A) => {
      const Ap1 = A + 1, Am1 = A - 1, tsa = 2 * Math.sqrt(A) * alpha;
      return norm(
        A * (Ap1 - Am1 * cos + tsa),
        2 * A * (Am1 - Ap1 * cos),
        A * (Ap1 - Am1 * cos - tsa),
        (Ap1 + Am1 * cos + tsa),
        -2 * (Am1 + Ap1 * cos),
        (Ap1 + Am1 * cos - tsa)
      );
    },
    code: {
      cpp: `const float Ap1 = A + 1.0f, Am1 = A - 1.0f;
const float tsa = 2.0f * std::sqrt(A) * alpha;

b0 =       A * (Ap1 - Am1 * cosw0 + tsa);
b1 =  2.0f * A * (Am1 - Ap1 * cosw0);
b2 =       A * (Ap1 - Am1 * cosw0 - tsa);
a0 =           (Ap1 + Am1 * cosw0 + tsa);
a1 = -2.0f   * (Am1 + Ap1 * cosw0);
a2 =           (Ap1 + Am1 * cosw0 - tsa);`,
      js: `const Ap1 = A + 1, Am1 = A - 1;
const tsa = 2 * Math.sqrt(A) * alpha;

b0 =      A * (Ap1 - Am1 * cosw0 + tsa);
b1 =  2 * A * (Am1 - Ap1 * cosw0);
b2 =      A * (Ap1 - Am1 * cosw0 - tsa);
a0 =          (Ap1 + Am1 * cosw0 + tsa);
a1 =     -2 * (Am1 + Ap1 * cosw0);
a2 =          (Ap1 + Am1 * cosw0 - tsa);`,
      mojo: `var Ap1 = A + 1.0; var Am1 = A - 1.0
var tsa = 2.0 * sqrt(A) * alpha

b0 =        A * (Ap1 - Am1 * cosw0 + tsa)
b1 =  2.0 * A * (Am1 - Ap1 * cosw0)
b2 =        A * (Ap1 - Am1 * cosw0 - tsa)
a0 =            (Ap1 + Am1 * cosw0 + tsa)
a1 = -2.0     * (Am1 + Ap1 * cosw0)
a2 =            (Ap1 + Am1 * cosw0 - tsa)`,
    },
  },

  highshelf: {
    name: 'High Shelf',
    desc: 'Boosts or cuts all frequencies above the cutoff by a fixed amount. The transition region is centered at the cutoff frequency.',
    useGain: true,
    coeffs: (cos, sin, alpha, A) => {
      const Ap1 = A + 1, Am1 = A - 1, tsa = 2 * Math.sqrt(A) * alpha;
      return norm(
        A * (Ap1 + Am1 * cos + tsa),
        -2 * A * (Am1 + Ap1 * cos),
        A * (Ap1 + Am1 * cos - tsa),
        (Ap1 - Am1 * cos + tsa),
        2 * (Am1 - Ap1 * cos),
        (Ap1 - Am1 * cos - tsa)
      );
    },
    code: {
      cpp: `const float Ap1 = A + 1.0f, Am1 = A - 1.0f;
const float tsa = 2.0f * std::sqrt(A) * alpha;

b0 =        A * (Ap1 + Am1 * cosw0 + tsa);
b1 = -2.0f * A * (Am1 + Ap1 * cosw0);
b2 =        A * (Ap1 + Am1 * cosw0 - tsa);
a0 =            (Ap1 - Am1 * cosw0 + tsa);
a1 =  2.0f    * (Am1 - Ap1 * cosw0);
a2 =            (Ap1 - Am1 * cosw0 - tsa);`,
      js: `const Ap1 = A + 1, Am1 = A - 1;
const tsa = 2 * Math.sqrt(A) * alpha;

b0 =       A * (Ap1 + Am1 * cosw0 + tsa);
b1 =  -2 * A * (Am1 + Ap1 * cosw0);
b2 =       A * (Ap1 + Am1 * cosw0 - tsa);
a0 =           (Ap1 - Am1 * cosw0 + tsa);
a1 =       2 * (Am1 - Ap1 * cosw0);
a2 =           (Ap1 - Am1 * cosw0 - tsa);`,
      mojo: `var Ap1 = A + 1.0; var Am1 = A - 1.0
var tsa = 2.0 * sqrt(A) * alpha

b0 =        A * (Ap1 + Am1 * cosw0 + tsa)
b1 = -2.0 * A * (Am1 + Ap1 * cosw0)
b2 =        A * (Ap1 + Am1 * cosw0 - tsa)
a0 =            (Ap1 - Am1 * cosw0 + tsa)
a1 =  2.0     * (Am1 - Ap1 * cosw0)
a2 =            (Ap1 - Am1 * cosw0 - tsa)`,
    },
  },
};

// ─── DSP helpers ─────────────────────────────────────────────────────────────

function norm(b0, b1, b2, a0, a1, a2) {
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function getIntermediates(freq, q, gainDb, sampleRate) {
  const w0 = 2 * Math.PI * freq / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  return { cos, sin, alpha, A };
}

function frequencyResponse(b0, b1, b2, a1, a2, N = 512) {
  const half = N / 2;
  const mag = new Float32Array(half);
  for (let k = 0; k < half; k++) {
    const w = (Math.PI * k) / half;
    const cosw = Math.cos(w), sinw = Math.sin(w);
    const cos2 = Math.cos(2 * w), sin2 = Math.sin(2 * w);
    const bRe = b0 + b1 * cosw + b2 * cos2;
    const bIm = - b1 * sinw - b2 * sin2;
    const aRe = 1 + a1 * cosw + a2 * cos2;
    const aIm = - a1 * sinw - a2 * sin2;
    const denom = aRe * aRe + aIm * aIm;
    const rRe = (bRe * aRe + bIm * aIm) / denom;
    const rIm = (bIm * aRe - bRe * aIm) / denom;
    const linear = Math.sqrt(rRe * rRe + rIm * rIm);
    mag[k] = linear > 1e-10 ? 20 * Math.log10(linear) : -80;
  }
  return mag;
}

// ─── Canvas ──────────────────────────────────────────────────────────────────

const canvas = $('canvas-fr');
const ctx2d = canvas.getContext('2d');

function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width - 12;
  const h = Math.round(w * 0.55);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx2d.scale(dpr, dpr);
}

const waveCanvas = $('canvas-waveform');
const waveCtx = waveCanvas.getContext('2d');

function setupWaveformCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = waveCanvas.parentElement.getBoundingClientRect();
  const w = rect.width - 12;
  const h = Math.round(w * 0.2);
  waveCanvas.width = w * dpr;
  waveCanvas.height = h * dpr;
  waveCanvas.style.width = w + 'px';
  waveCanvas.style.height = h + 'px';
  waveCtx.scale(dpr, dpr);
}

function drawWaveform() {
  if (!analyserNode || !timeData) return;
  analyserNode.getByteTimeDomainData(timeData);

  const dpr = window.devicePixelRatio || 1;
  const w = waveCanvas.width / dpr;
  const h = waveCanvas.height / dpr;

  waveCtx.clearRect(0, 0, w, h);

  waveCtx.strokeStyle = 'rgba(222,141,116,0.8)';
  waveCtx.lineWidth = 1.5;
  waveCtx.beginPath();
  for (let i = 0; i < timeData.length; i++) {
    const x = (i / timeData.length) * w;
    const y = (timeData[i] / 255) * h;
    i === 0 ? waveCtx.moveTo(x, y) : waveCtx.lineTo(x, y);
  }
  waveCtx.stroke();
}

function drawLoop() {
  if (!isPlaying) return;
  drawWaveform();
  requestAnimationFrame(drawLoop);
}

function drawFR(mag) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx2d.clearRect(0, 0, w, h);

  const padX = 42, padY = 12, padB = 22;
  const plotW = w - padX - 10;
  const plotH = h - padY - padB;

  const DB_MAX = 30, DB_MIN = -60, DB_RANGE = DB_MAX - DB_MIN;
  const dbToY = db => padY + (1 - (Math.max(DB_MIN, Math.min(DB_MAX, db)) - DB_MIN) / DB_RANGE) * plotH;
  const binToX = k => padX + (k / (mag.length - 1)) * plotW;

  const gridDBs = [-60, -48, -36, -24, -12, 0, 12, 24];
  ctx2d.font = '700 10px system-ui';
  ctx2d.textAlign = 'right';

  for (const db of gridDBs) {
    const y = dbToY(db);
    ctx2d.strokeStyle = db === 0 ? 'rgba(17,17,17,0.18)' : 'rgba(17,17,17,0.07)';
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    ctx2d.moveTo(padX, y);
    ctx2d.lineTo(padX + plotW, y);
    ctx2d.stroke();
    ctx2d.fillStyle = 'rgba(17,17,17,0.45)';
    ctx2d.fillText(db + ' dB', padX - 4, y + 4);
  }

  ctx2d.strokeStyle = 'rgba(17,17,17,0.12)';
  ctx2d.lineWidth = 1;
  ctx2d.beginPath();
  ctx2d.moveTo(padX, padY);
  ctx2d.lineTo(padX, padY + plotH);
  ctx2d.lineTo(padX + plotW, padY + plotH);
  ctx2d.stroke();

  ctx2d.fillStyle = 'rgba(17,17,17,0.45)';
  ctx2d.font = '700 10px system-ui';
  ctx2d.textAlign = 'center';
  ctx2d.fillText('0 → Nyquist', padX + plotW / 2, h - 4);

  ctx2d.strokeStyle = 'rgba(45,92,140,1)';
  ctx2d.lineWidth = 2;
  ctx2d.beginPath();
  for (let k = 0; k < mag.length; k++) {
    const x = binToX(k);
    const y = dbToY(mag[k]);
    k === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
  }
  ctx2d.stroke();
}

// ─── Preamble ────────────────────────────────────────────────────────────────

const PREAMBLE = {
  cpp:
    `// intermediates
const float w0    = 2.0f * M_PI * mFrequency / mSampleRate;
const float cosw0 = std::cos(w0);
const float sinw0 = std::sin(w0);
const float alpha = sinw0 / (2.0f * mQ);
const float A     = std::pow(10.0f, mGainDb / 40.0f);

// normalize and store
mB0 = b0/a0;  mB1 = b1/a0;  mB2 = b2/a0;
mA1 = a1/a0;  mA2 = a2/a0;

`,
  js:
    `// intermediates
const w0    = 2 * Math.PI * this.frequency / this.sampleRate;
const cosw0 = Math.cos(w0);
const sinw0 = Math.sin(w0);
const alpha = sinw0 / (2 * this.q);
const A     = Math.pow(10, this.gainDb / 40);

// normalize and store
this.b0 = b0/a0; this.b1 = b1/a0; this.b2 = b2/a0;
this.a1 = a1/a0; this.a2 = a2/a0;

`,
  mojo:
    `# intermediates
var w0    = 2.0 * pi * self.frequency / self.sampleRate
var cosw0 = cos(w0)
var sinw0 = sin(w0)
var alpha = sinw0 / (2.0 * self.q)
var A     = pow(10.0, self.gainDb / 40.0)

# normalize and store
self.b0 = b0/a0; self.b1 = b1/a0; self.b2 = b2/a0
self.a1 = a1/a0; self.a2 = a2/a0

`,
};

// ─── State ───────────────────────────────────────────────────────────────────

const SAMPLE_RATE = 48000;
let currentFilter = 'lowpass';
let currentLang = 'cpp';

// ─── UI refs ─────────────────────────────────────────────────────────────────

const playBtn = $('play-pause');
const srcEl = $('source');
const filterSel = $('filter-type');
const freqSlider = $('freq');
const qSlider = $('q');
const gainSlider = $('gain');
const freqVal = $('freq-val');
const qVal = $('q-val');
const gainVal = $('gain-val');
const gainRow = $('gain-row');
const descName = $('desc-name');
const descText = $('desc-text');
const allpassNote = $('allpass-note');
const copyBtn = $('copy-btn');

const langTabs = document.querySelectorAll('.codegroup__tab');
const panels = document.querySelectorAll('.codegroup__panel');
const codeEls = { cpp: $('code-cpp'), js: $('code-js'), mojo: $('code-mojo') };

// ─── Audio ───────────────────────────────────────────────────────────────────

let audioCtx = null;
let biquadNode = null;
let analyserNode = null;
let sourceNode = null;
let gainNode = null;
let timeData = null;
let isPlaying = false;
let cleanBuffer = null;
let humBuffer = null;

async function initAudio() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  biquadNode = audioCtx.createBiquadFilter();
  gainNode = audioCtx.createGain();
  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 2048;
  timeData = new Uint8Array(analyserNode.fftSize);

  // source → biquad → gain → analyser → destination
  biquadNode.connect(gainNode);
  gainNode.connect(analyserNode);
  analyserNode.connect(audioCtx.destination);

  const [c, h] = await Promise.all([
    fetch('/assets/audio/filter/guitar_clean.mp3').then(r => r.arrayBuffer()).then(b => audioCtx.decodeAudioData(b)),
    fetch('/assets/audio/filter/guitar_hum.mp3').then(r => r.arrayBuffer()).then(b => audioCtx.decodeAudioData(b)),
  ]);
  cleanBuffer = c;
  humBuffer = h;
}

function startPlayback() {
  const buffer = srcEl.value === 'hum' ? humBuffer : cleanBuffer;
  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.loop = true;
  sourceNode.connect(biquadNode);
  sourceNode.start();
  isPlaying = true;
  playBtn.textContent = 'pause';
  requestAnimationFrame(drawLoop);
}

function stopPlayback() {
  if (sourceNode) {
    sourceNode.stop();
    sourceNode.disconnect();
    sourceNode = null;
  }
  isPlaying = false;
  playBtn.textContent = 'play';
}

playBtn.addEventListener('click', async () => {
  await initAudio();
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  if (isPlaying) {
    await audioCtx.suspend();
    isPlaying = false;
    playBtn.textContent = 'play';
  } else {
    if (!sourceNode) startPlayback();
    else {
      await audioCtx.resume();
      isPlaying = true;
      playBtn.textContent = 'pause';
      requestAnimationFrame(drawLoop);
    }
  }
});

srcEl.addEventListener('change', () => {
  if (isPlaying) {
    stopPlayback();
    startPlayback();
  }
});

function pushAudioFilter() {
  if (!biquadNode) return;
  const freq = parseFloat(freqSlider.value);
  const q = parseFloat(qSlider.value);
  const gainDb = parseFloat(gainSlider.value);
  const f = FILTERS[currentFilter];

  // Map your filter keys to BiquadFilterNode types
  const typeMap = {
    lowpass: 'lowpass', highpass: 'highpass',
    bandpass: 'bandpass', bandpass_peak: 'bandpass',
    notch: 'notch', allpass: 'allpass',
    peak: 'peaking', lowshelf: 'lowshelf', highshelf: 'highshelf',
  };

  biquadNode.type = typeMap[currentFilter];
  biquadNode.frequency.value = freq;
  biquadNode.Q.value = q;
  biquadNode.gain.value = f.useGain ? gainDb : 0;
}

// ─── Tab switching ───────────────────────────────────────────────────────────

function setLang(lang) {
  currentLang = lang;
  langTabs.forEach(tab => {
    const active = tab.dataset.lang === lang;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  panels.forEach(panel => {
    panel.hidden = panel.dataset.lang !== lang;
  });
}

langTabs.forEach(tab => {
  tab.addEventListener('click', () => setLang(tab.dataset.lang));
});

// Keyboard nav
document.querySelector('.codegroup__tabs').addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const tabs = [...langTabs];
  const idx = tabs.findIndex(t => t.dataset.lang === currentLang);
  const next = e.key === 'ArrowRight'
    ? (idx + 1) % tabs.length
    : (idx - 1 + tabs.length) % tabs.length;
  tabs[next].focus();
  setLang(tabs[next].dataset.lang);
  e.preventDefault();
});

// ─── Copy button ─────────────────────────────────────────────────────────────

copyBtn.addEventListener('click', () => {
  const filter = FILTERS[currentFilter];
  const text = PREAMBLE[currentLang] + filter.code[currentLang];
  navigator.clipboard?.writeText(text).then(() => {
    const icon = copyBtn.querySelector('svg');
    // swap to check icon
    icon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    copyBtn.setAttribute('aria-label', 'Copied!');
    setTimeout(() => {
      icon.innerHTML = `<path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>
        <rect x="8" y="8" width="12" height="12" rx="2" ry="2"/>`;
      copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
    }, 1200);
  });
});

// ─── Code update ─────────────────────────────────────────────────────────────

function updateCode() {
  const filter = FILTERS[currentFilter];
  const langs = { cpp: 'cpp', js: 'javascript', mojo: 'python' };
  Object.entries(codeEls).forEach(([lang, el]) => {
    const raw = PREAMBLE[lang] + filter.code[lang];
    el.innerHTML = Prism.highlight(raw, Prism.languages[langs[lang]], langs[lang]);
  });
}

// ─── Readouts ────────────────────────────────────────────────────────────────

function updateReadouts() {
  freqVal.value = parseFloat(freqSlider.value);
  qVal.value = parseFloat(qSlider.value);
  gainVal.value = parseFloat(gainSlider.value);
}

// Sync number input → slider
freqVal.addEventListener('change', () => {
  const v = Math.max(20, Math.min(20000, parseFloat(freqVal.value) || 20));
  freqVal.value = v;
  freqSlider.value = v;
  updatePlot(); pushAudioFilter();
});

qVal.addEventListener('change', () => {
  const v = Math.max(0.1, Math.min(20, parseFloat(qVal.value) || 0.1));
  qVal.value = v;
  qSlider.value = v;
  updatePlot(); pushAudioFilter();
});

gainVal.addEventListener('change', () => {
  const v = Math.max(-24, Math.min(24, parseFloat(gainVal.value) || 0));
  gainVal.value = v;
  gainSlider.value = v;
  updatePlot(); pushAudioFilter();
});

// ─── Plot ────────────────────────────────────────────────────────────────────

function updatePlot() {
  if (currentFilter === 'allpass') {
    allpassNote.classList.add('visible');
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  allpassNote.classList.remove('visible');

  const filter = FILTERS[currentFilter];
  const freq = parseFloat(freqSlider.value);
  const q = parseFloat(qSlider.value);
  const gainDb = parseFloat(gainSlider.value);
  const sr = audioCtx?.sampleRate ?? SAMPLE_RATE;
  const { cos, sin, alpha, A } = getIntermediates(freq, q, gainDb, sr);
  const { b0, b1, b2, a1, a2 } = filter.coeffs(cos, sin, alpha, A);
  drawFR(frequencyResponse(b0, b1, b2, a1, a2));
}

// ─── Filter change ───────────────────────────────────────────────────────────

function applyFilter(key) {
  currentFilter = key;
  const filter = FILTERS[key];

  descName.textContent = filter.name;
  descText.textContent = filter.desc;

  if (filter.useGain) {
    gainRow.classList.remove('disabled');
    gainSlider.disabled = false;
    gainVal.disabled = false;
  } else {
    gainRow.classList.add('disabled');
    gainSlider.disabled = true;
    gainVal.disabled = true;
  }

  updateCode();
  updateReadouts();
  updatePlot();
  pushAudioFilter();
}

filterSel.addEventListener('change', () => applyFilter(filterSel.value));
freqSlider.addEventListener('input', () => { updateReadouts(); updatePlot(); pushAudioFilter(); });
qSlider.addEventListener('input', () => { updateReadouts(); updatePlot(); pushAudioFilter(); });
gainSlider.addEventListener('input', () => { updateReadouts(); updatePlot(); pushAudioFilter(); });

window.addEventListener('resize', () => { setupCanvas(); setupWaveformCanvas(); updatePlot(); });

// ─── Init ────────────────────────────────────────────────────────────────────

setupCanvas();
setupWaveformCanvas();
applyFilter('lowpass');
