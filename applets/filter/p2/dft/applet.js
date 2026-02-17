const $ = (id) => document.getElementById(id);

const canvasIR = $("canvas-ir");
const ctxIR = canvasIR.getContext("2d");
const canvasFR = $("canvas-fr");
const ctxFR = canvasFR.getContext("2d");
const slider = $("coeff-slider");
const input = $("coeff-input");

const N_IR = 128;  // impulse response length
const N_DFT = 512; // DFT size — more points = smoother frequency response curve

// --- DSP ---

function impulseResponse(a, n) {
  const out = new Float32Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const x = i === 0 ? 1 : 0;
    y = x + a * y;
    out[i] = y;
  }
  return out;
}

// Generate grid line values (in dB) for frequency response plot, given min/max and step size.
function gridLines(min, max, step) {
  const lines = [];
  for (let db = max; db >= min; db -= step) {
    lines.push(Math.round(db));
  }
  return lines;
}

// Compute magnitude spectrum (in dB) from impulse response via DFT.
// Returns N_DFT/2 bins covering 0..Nyquist.
function frequencyResponse(ir) {
  const half = N_DFT / 2;
  const mag = new Float32Array(half);

  for (let k = 0; k < half; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < ir.length; n++) {
      const angle = (2 * Math.PI * k * n) / N_DFT;
      re += ir[n] * Math.cos(angle);
      im -= ir[n] * Math.sin(angle);
    }
    const linear = Math.sqrt(re * re + im * im);
    // Convert to dB, floor at -60
    mag[k] = linear > 0 ? Math.max(20 * Math.log10(linear), -12) : -12;
  }

  return mag;
}

// --- Canvas helpers ---

function setupCanvas(canvas, aspectRatio) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width;
  const h = Math.round(w * aspectRatio);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const c = canvas.getContext("2d");
  c.scale(dpr, dpr);
}

function resizeCanvases() {
  setupCanvas(canvasIR, 0.4);
  setupCanvas(canvasFR, 0.25); // shorter than IR
}

// --- Draw impulse response (stem plot) ---

function drawIR(a) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvasIR.width / dpr;
  const h = canvasIR.height / dpr;

  ctxIR.clearRect(0, 0, w, h);

  const samples = impulseResponse(a, N_IR);

  const padX = 32;
  const padY = 20;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;
  const baseline = padY + plotH / 2;

  // Axes
  ctxIR.strokeStyle = "rgba(17,17,17,0.12)";
  ctxIR.lineWidth = 1;
  ctxIR.beginPath();
  ctxIR.moveTo(padX, padY);
  ctxIR.lineTo(padX, baseline);
  ctxIR.lineTo(padX + plotW, baseline);
  ctxIR.stroke();

  // Labels
  ctxIR.fillStyle = "rgba(17,17,17,0.45)";
  ctxIR.font = "700 11px system-ui";
  ctxIR.textAlign = "center";
  ctxIR.fillText("n", padX + plotW / 2, h - 2);
  ctxIR.save();
  ctxIR.translate(10, padY + plotH / 2);
  ctxIR.rotate(-Math.PI / 2);
  ctxIR.fillText("y[n]", 0, 0);
  ctxIR.restore();

  // Stems
  const xStep = plotW / N_IR;
  const barW = Math.max(1, Math.floor(xStep) - 1);

  for (let i = 0; i < N_IR; i++) {
    const x = padX + i * xStep + xStep / 2;
    const val = Math.max(-1, Math.min(1, samples[i]));
    const y = baseline - val * (plotH / 2);

    ctxIR.strokeStyle = "rgba(45,92,140,0.7)";
    ctxIR.lineWidth = Math.max(1, barW);
    ctxIR.beginPath();
    ctxIR.moveTo(x, baseline);
    ctxIR.lineTo(x, y);
    ctxIR.stroke();

    ctxIR.fillStyle = "rgba(45,92,140,1)";
    ctxIR.beginPath();
    ctxIR.arc(x, y, 2.5, 0, Math.PI * 2);
    ctxIR.fill();
  }
}

// --- Draw frequency response (line plot, dB) ---

function drawFR(a) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvasFR.width / dpr;
  const h = canvasFR.height / dpr;

  ctxFR.clearRect(0, 0, w, h);

  const ir = impulseResponse(a, N_IR);
  const mag = frequencyResponse(ir);

  const padX = 40;
  const padY = 16;
  const padBottom = 24;
  const plotW = w - padX - 16;
  const plotH = h - padY - padBottom;

  const DB_MAX = 24;
  const DB_MIN = -6;
  const DB_RANGE = DB_MAX - DB_MIN;

  function dbToY(db) {
    const clamped = Math.max(DB_MIN, Math.min(DB_MAX, db));
    return padY + (1 - (clamped - DB_MIN) / DB_RANGE) * plotH;
  }

  function binToX(k) {
    return padX + (k / (mag.length - 1)) * plotW;
  }

  // dB grid lines
  const gridDBs = gridLines(DB_MIN, DB_MAX, 6);
  ctxFR.font = "700 10px system-ui";
  ctxFR.textAlign = "right";

  for (const db of gridDBs) {
    const y = dbToY(db);
    const isZero = db === 0;

    ctxFR.strokeStyle = isZero ? "rgba(17,17,17,0.18)" : "rgba(17,17,17,0.07)";
    ctxFR.lineWidth = 1;
    ctxFR.beginPath();
    ctxFR.moveTo(padX, y);
    ctxFR.lineTo(padX + plotW, y);
    ctxFR.stroke();

    ctxFR.fillStyle = "rgba(17,17,17,0.45)";
    ctxFR.fillText(db + " dB", padX - 4, y + 4);
  }

  // Axes
  ctxFR.strokeStyle = "rgba(17,17,17,0.12)";
  ctxFR.lineWidth = 1;
  ctxFR.beginPath();
  ctxFR.moveTo(padX, padY);
  ctxFR.lineTo(padX, padY + plotH);
  ctxFR.lineTo(padX + plotW, padY + plotH);
  ctxFR.stroke();

  // X axis label
  ctxFR.fillStyle = "rgba(17,17,17,0.45)";
  ctxFR.font = "700 11px system-ui";
  ctxFR.textAlign = "center";
  ctxFR.fillText("frequency (0 → Nyquist)", padX + plotW / 2, h - 4);

  // Frequency response curve
  ctxFR.strokeStyle = "rgba(45,92,140,1)";
  ctxFR.lineWidth = 2;
  ctxFR.beginPath();

  for (let k = 0; k < mag.length; k++) {
    const x = binToX(k);
    const y = dbToY(mag[k]);
    k === 0 ? ctxFR.moveTo(x, y) : ctxFR.lineTo(x, y);
  }

  ctxFR.stroke();
}

// --- Update both plots ---

function update(a) {
  drawIR(a);
  drawFR(a);
}

function getCoeff() {
  return parseFloat(slider.value);
}

// --- Events ---

slider.addEventListener("input", () => {
  const a = getCoeff();
  input.value = a.toFixed(2);
  update(a);
});

input.addEventListener("change", () => {
  let a = parseFloat(input.value);
  a = Math.max(-1.0, Math.min(1.0, a));
  input.value = a.toFixed(2);
  slider.value = a;
  update(a);
});

window.addEventListener("resize", () => {
  resizeCanvases();
  update(getCoeff());
});

resizeCanvases();
update(getCoeff());
