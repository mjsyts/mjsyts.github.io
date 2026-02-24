const $ = (id) => document.getElementById(id);

// --- Canvases ---
const canvasZ  = $("canvas-zplane");
const canvasFR = $("canvas-fr");
const canvasIR = $("canvas-ir");
const ctxZ     = canvasZ.getContext("2d");
const ctxFR    = canvasFR.getContext("2d");
const ctxIR    = canvasIR.getContext("2d");

const badge    = $("unstable-badge");
const resetBtn = $("reset-btn");

// --- State ---
// Two "primary" draggable points: one pole, one zero.
// Their conjugate mirrors are computed automatically.
// This enforces real-coefficient biquad behavior.
let primary = defaultPrimary();

function defaultPrimary() {
  return {
    pole: { re: 0.7, im: 0.5 },
    zero: { re: -1.0, im: 0.0 },
  };
}

// Expand primary into four points for rendering/DSP
function getPoints() {
  const { pole, zero } = primary;
  return [
    { re: pole.re, im:  pole.im, type: "pole" },
    { re: pole.re, im: -pole.im, type: "pole" },
    { re: zero.re, im:  zero.im, type: "zero" },
    { re: zero.re, im: -zero.im, type: "zero" },
  ];
}

// --- DSP ---

const N_IR  = 128;
const N_DFT = 512;

// Compute biquad coefficients from two poles and two zeros (all real or complex-conjugate pairs).
// poles: [{re,im}, {re,im}], zeros: [{re,im}, {re,im}]
// H(z) = (z - z0)(z - z1) / (z - p0)(z - p1)
// b0 = 1, b1 = -(z0+z1).re, b2 = (z0*z1).re
// a0 = 1, a1 = -(p0+p1).re, a2 = (p0*p1).re  (direct form)
function computeCoeffs(poles, zeros) {
  const p0 = poles[0], p1 = poles[1];
  const z0 = zeros[0], z1 = zeros[1];

  // Sum and product of poles
  const pSum = { re: p0.re + p1.re, im: p0.im + p1.im };
  const pProd = {
    re: p0.re * p1.re - p0.im * p1.im,
    im: p0.re * p1.im + p0.im * p1.re,
  };

  // Sum and product of zeros
  const zSum = { re: z0.re + z1.re, im: z0.im + z1.im };
  const zProd = {
    re: z0.re * z1.re - z0.im * z1.im,
    im: z0.re * z1.im + z0.im * z1.re,
  };

  return {
    b0:  1,
    b1: -zSum.re,
    b2:  zProd.re,
    a1: -pSum.re,
    a2:  pProd.re,
  };
}

function getPoles() { return getPoints().filter(p => p.type === "pole"); }
function getZeros() { return getPoints().filter(p => p.type === "zero"); }

function impulseResponse(coeffs, n) {
  const { b0, b1, b2, a1, a2 } = coeffs;
  const out = new Float32Array(n);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const x = i === 0 ? 1 : 0;
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x;
    y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

function frequencyResponse(coeffs) {
  const { b0, b1, b2, a1, a2 } = coeffs;
  const half = N_DFT / 2;
  const mag = new Float32Array(half);
  for (let k = 0; k < half; k++) {
    const w = (Math.PI * k) / half;
    // H(e^jw) evaluated numerically
    const cos1 = Math.cos(w), sin1 = Math.sin(w);
    const cos2 = Math.cos(2 * w), sin2 = Math.sin(2 * w);
    const numRe = b0 + b1 * cos1 + b2 * cos2;
    const numIm =    - b1 * sin1 - b2 * sin2;
    const denRe = 1  + a1 * cos1 + a2 * cos2;
    const denIm =    - a1 * sin1 - a2 * sin2;
    const denMag2 = denRe * denRe + denIm * denIm;
    const reMag = (numRe * denRe + numIm * denIm) / denMag2;
    const imMag = (numIm * denRe - numRe * denIm) / denMag2;
    const linear = Math.sqrt(reMag * reMag + imMag * imMag);
    mag[k] = linear > 0 ? Math.max(20 * Math.log10(linear), -48) : -48;
  }
  return mag;
}

function isUnstable() {
  const p = primary.pole;
  return Math.sqrt(p.re * p.re + p.im * p.im) >= 1.0;
}

// --- Canvas setup ---

function setupCanvas(canvas, aspectRatio) {
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w    = rect.width;
  const h    = Math.round(w * aspectRatio);
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + "px";
  canvas.style.height = h + "px";
  canvas.getContext("2d").scale(dpr, dpr);
}

function resizeCanvases() {
  setupCanvas(canvasZ,  0.85);  // slightly taller than wide for z-plane
  setupCanvas(canvasFR, 0.85);  // match z-plane height
  setupCanvas(canvasIR, 0.22);  // short strip
}

// --- Draw z-plane ---

function zToCanvas(re, im, cx, cy, r) {
  return { x: cx + re * r, y: cy - im * r };
}

function drawZPlane() {
  const dpr = window.devicePixelRatio || 1;
  const w   = canvasZ.width  / dpr;
  const h   = canvasZ.height / dpr;
  ctxZ.clearRect(0, 0, w, h);

  const pad  = 24;
  // Force a square plot area so the circle is always round
  const size = Math.min(w, h) - pad * 2;
  const cx   = w / 2;
  const cy   = h / 2;
  const r    = size / 2;

  // Axes
  ctxZ.strokeStyle = "rgba(17,17,17,0.12)";
  ctxZ.lineWidth = 1;
  ctxZ.beginPath();
  ctxZ.moveTo(cx - r - 4, cy); ctxZ.lineTo(cx + r + 4, cy);
  ctxZ.moveTo(cx, cy - r - 4); ctxZ.lineTo(cx, cy + r + 4);
  ctxZ.stroke();

  // Unit circle
  const unstable = isUnstable();
  ctxZ.beginPath();
  ctxZ.arc(cx, cy, r, 0, Math.PI * 2);
  ctxZ.strokeStyle = unstable
    ? "rgba(200,60,40,0.55)"
    : "rgba(45,92,140,0.35)";
  ctxZ.lineWidth = 1.5;
  ctxZ.stroke();

  // Unit circle label
  ctxZ.fillStyle = "rgba(17,17,17,0.3)";
  ctxZ.font = "600 10px system-ui";
  ctxZ.textAlign = "left";
  ctxZ.fillText("unit circle", cx + r * 0.72, cy - r * 0.72);

  // Axis labels
  ctxZ.fillStyle = "rgba(17,17,17,0.4)";
  ctxZ.font = "700 10px system-ui";
  ctxZ.textAlign = "center";
  ctxZ.fillText("Re", cx + r + 12, cy + 4);
  ctxZ.textAlign = "right";
  ctxZ.fillText("Im", cx - 4, cy - r - 8);

  // Draw dashed mirror line to show conjugate relationship
  ctxZ.setLineDash([3, 4]);
  ctxZ.strokeStyle = "rgba(17,17,17,0.1)";
  ctxZ.lineWidth = 1;
  ctxZ.beginPath();
  ctxZ.moveTo(cx - r, cy); ctxZ.lineTo(cx + r, cy);
  ctxZ.stroke();
  ctxZ.setLineDash([]);

  // Draw all four points
  for (const pt of getPoints()) {
    const { x, y } = zToCanvas(pt.re, pt.im, cx, cy, r);
    // Primary points (im >= 0) are fully opaque, mirrors are faded
    const isPrimary = pt.im >= 0;
    const alpha = isPrimary ? 0.9 : 0.35;

    if (pt.type === "pole") {
      const s = 7;
      ctxZ.strokeStyle = unstable
        ? `rgba(200,60,40,${alpha})`
        : `rgba(45,92,140,${alpha})`;
      ctxZ.lineWidth = 2;
      ctxZ.beginPath();
      ctxZ.moveTo(x - s, y - s); ctxZ.lineTo(x + s, y + s);
      ctxZ.moveTo(x + s, y - s); ctxZ.lineTo(x - s, y + s);
      ctxZ.stroke();
    } else {
      ctxZ.strokeStyle = `rgba(180,100,40,${alpha})`;
      ctxZ.lineWidth = 2;
      ctxZ.beginPath();
      ctxZ.arc(x, y, 7, 0, Math.PI * 2);
      ctxZ.stroke();
    }
  }

  // Legend
  ctxZ.font = "700 10px system-ui";
  ctxZ.textAlign = "left";
  const lx = pad, ly = h - pad + 4;

  ctxZ.strokeStyle = "rgba(45,92,140,0.9)";
  ctxZ.lineWidth = 2;
  const s = 5;
  ctxZ.beginPath();
  ctxZ.moveTo(lx - s, ly - s); ctxZ.lineTo(lx + s, ly + s);
  ctxZ.moveTo(lx + s, ly - s); ctxZ.lineTo(lx - s, ly + s);
  ctxZ.stroke();
  ctxZ.fillStyle = "rgba(17,17,17,0.5)";
  ctxZ.fillText("pole", lx + 10, ly + 4);

  ctxZ.strokeStyle = "rgba(180,100,40,0.9)";
  ctxZ.beginPath();
  ctxZ.arc(lx + 60, ly, 5, 0, Math.PI * 2);
  ctxZ.stroke();
  ctxZ.fillText("zero", lx + 70, ly + 4);
}

// --- Draw frequency response ---

function drawFR(mag) {
  const dpr = window.devicePixelRatio || 1;
  const w   = canvasFR.width  / dpr;
  const h   = canvasFR.height / dpr;
  ctxFR.clearRect(0, 0, w, h);

  const padX = 40, padY = 12, padBottom = 22;
  const plotW = w - padX - 12;
  const plotH = h - padY - padBottom;

  const DB_MAX = 36, DB_MIN = -48;
  const DB_RANGE = DB_MAX - DB_MIN;

  function dbToY(db) {
    return padY + (1 - (Math.max(DB_MIN, Math.min(DB_MAX, db)) - DB_MIN) / DB_RANGE) * plotH;
  }

  // Grid
  ctxFR.font = "700 10px system-ui";
  ctxFR.textAlign = "right";
  for (const db of [-48, -36, -24, -12, 0, 12, 24, 36]) {
    const y = dbToY(db);
    ctxFR.strokeStyle = db === 0 ? "rgba(17,17,17,0.18)" : "rgba(17,17,17,0.07)";
    ctxFR.lineWidth = 1;
    ctxFR.beginPath();
    ctxFR.moveTo(padX, y); ctxFR.lineTo(padX + plotW, y);
    ctxFR.stroke();
    ctxFR.fillStyle = "rgba(17,17,17,0.4)";
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

  // X label
  ctxFR.fillStyle = "rgba(17,17,17,0.4)";
  ctxFR.font = "700 10px system-ui";
  ctxFR.textAlign = "center";
  ctxFR.fillText("0 → Nyquist", padX + plotW / 2, h - 4);

  // Curve
  ctxFR.strokeStyle = "rgba(45,92,140,1)";
  ctxFR.lineWidth = 2;
  ctxFR.beginPath();
  for (let k = 0; k < mag.length; k++) {
    const x = padX + (k / (mag.length - 1)) * plotW;
    const y = dbToY(mag[k]);
    k === 0 ? ctxFR.moveTo(x, y) : ctxFR.lineTo(x, y);
  }
  ctxFR.stroke();
}

// --- Draw impulse response ---

function drawIR(ir) {
  const dpr = window.devicePixelRatio || 1;
  const w   = canvasIR.width  / dpr;
  const h   = canvasIR.height / dpr;
  ctxIR.clearRect(0, 0, w, h);

  const padX = 32, padY = 10;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;
  const baseline = padY + plotH / 2;

  // Axis
  ctxIR.strokeStyle = "rgba(17,17,17,0.12)";
  ctxIR.lineWidth = 1;
  ctxIR.beginPath();
  ctxIR.moveTo(padX, padY);
  ctxIR.lineTo(padX, padY + plotH);
  ctxIR.lineTo(padX + plotW, padY + plotH);
  ctxIR.stroke();

  // Find max for scaling
  let maxVal = 0;
  for (const v of ir) maxVal = Math.max(maxVal, Math.abs(v));
  const scale = maxVal > 0 ? Math.min(1, 1 / maxVal) : 1;
  const unstable = isUnstable();

  const xStep = plotW / ir.length;
  for (let i = 0; i < ir.length; i++) {
    const x   = padX + i * xStep + xStep / 2;
    const val = ir[i] * scale;
    const y   = baseline - val * (plotH / 2);

    ctxIR.strokeStyle = unstable
      ? "rgba(200,60,40,0.6)"
      : "rgba(45,92,140,0.6)";
    ctxIR.lineWidth = Math.max(1, Math.floor(xStep) - 1);
    ctxIR.beginPath();
    ctxIR.moveTo(x, baseline);
    ctxIR.lineTo(x, y);
    ctxIR.stroke();
  }

  // Label
  ctxIR.fillStyle = "rgba(17,17,17,0.35)";
  ctxIR.font = "700 10px system-ui";
  ctxIR.textAlign = "center";
  ctxIR.fillText("n", padX + plotW / 2, h - 1);
}

// --- Render all ---

function render() {
  const poles  = getPoles();
  const zeros  = getZeros();
  const coeffs = computeCoeffs(poles, zeros);
  const ir     = impulseResponse(coeffs, N_IR);
  const mag    = frequencyResponse(coeffs);

  drawZPlane();
  drawFR(mag);
  drawIR(ir);

  badge.classList.toggle("visible", isUnstable());
}

function canvasToZ(clientX, clientY) {
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvasZ.getBoundingClientRect();
  const w    = canvasZ.width  / dpr;
  const h    = canvasZ.height / dpr;
  const pad  = 24;
  const cx   = w / 2;
  const cy   = h / 2;
  const r    = (Math.min(w, h) - pad * 2) / 2;
  const scaleX = w / rect.width;
  const scaleY = h / rect.height;
  const lx = (clientX - rect.left) * scaleX;
  const ly = (clientY - rect.top)  * scaleY;
  return { re: (lx - cx) / r, im: -(ly - cy) / r };
}

// --- Drag interaction ---

let dragging = null; // 'pole' | 'zero' | null

function findNearest(re, im) {
  const dpr  = window.devicePixelRatio || 1;
  const w    = canvasZ.width  / dpr;
  const h    = canvasZ.height / dpr;
  const pad  = 24;
  const r    = (Math.min(w, h) - pad * 2) / 2;
  const threshold = 20 / r;

  let best = null, bestDist = Infinity;
  for (const key of ["pole", "zero"]) {
    const pt = primary[key];
    // Only match against the primary (im >= 0) copy
    const dx = pt.re - re;
    const dy = pt.im - im;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) { bestDist = dist; best = key; }

    // Also check mirror (im < 0) — clicking mirror drags the primary
    const dxm = pt.re - re;
    const dym = -pt.im - im;
    const distM = Math.sqrt(dxm * dxm + dym * dym);
    if (distM < bestDist) { bestDist = distM; best = key; }
  }
  return bestDist < threshold ? best : null;
}

function getPos(e) {
  if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

canvasZ.addEventListener("mousedown",  onDown);
canvasZ.addEventListener("touchstart", onDown, { passive: false });

function onDown(e) {
  e.preventDefault();
  const { x, y } = getPos(e);
  const { re, im } = canvasToZ(x, y);
  dragging = findNearest(re, im);
}

window.addEventListener("mousemove",  onMove);
window.addEventListener("touchmove",  onMove, { passive: false });

function onMove(e) {
  if (!dragging) return;
  e.preventDefault();
  const { x, y } = getPos(e);
  const { re, im } = canvasToZ(x, y);
  primary[dragging].re = re;
  primary[dragging].im = Math.abs(im); // keep im >= 0 for primary
  render();
}

window.addEventListener("mouseup",  onUp);
window.addEventListener("touchend", onUp);

function onUp() { dragging = null; }

// Cursor hint
canvasZ.addEventListener("mousemove", (e) => {
  const { re, im } = canvasToZ(e.clientX, e.clientY);
  canvasZ.style.cursor = findNearest(re, im) ? "grab" : "default";
});

// --- Reset ---
resetBtn.addEventListener("click", () => {
  primary = defaultPrimary();
  render();
});

// --- Resize ---
window.addEventListener("resize", () => {
  resizeCanvases();
  render();
});

resizeCanvases();
render();
