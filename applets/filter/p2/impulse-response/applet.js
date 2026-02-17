const $ = (id) => document.getElementById(id);

const canvas = $("canvas");
const ctx = canvas.getContext("2d");
const slider = $("coeff-slider");
const input = $("coeff-input");

const N = 128; // number of samples to display

function impulseResponse(a, n) {
  const out = new Float32Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const x = i === 0 ? 1 : 0; // single impulse at n=0
    y = x + a * y;
    out[i] = y;
  }
  return out;
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width;
  const h = Math.round(w * 0.4);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.scale(dpr, dpr);
}

function draw(a) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.clearRect(0, 0, w, h);

  const samples = impulseResponse(a, N);

  const padX = 32;
  const padY = 20;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;
  const baseline = padY + plotH / 2; // y=0 in the middle

  // Axis
  ctx.strokeStyle = "rgba(17,17,17,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, padY);
  ctx.lineTo(padX, baseline);
  ctx.lineTo(padX + plotW, baseline);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = "rgba(17,17,17,0.45)";
  ctx.font = "700 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("n", padX + plotW / 2, h - 2);
  ctx.save();
  ctx.translate(10, padY + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("y[n]", 0, 0);
  ctx.restore();

  // Stems
  const barW = Math.max(1, Math.floor(plotW / N) - 1);
  const xStep = plotW / N;

  for (let i = 0; i < N; i++) {
    const x = padX + i * xStep + xStep / 2;
    const val = Math.max(-1, Math.min(1, samples[i])); // clamp to [-1,1]
    const stemH = val * plotH / 2;
    const y = baseline - stemH;

    // Stem
    ctx.strokeStyle = "rgba(45,92,140,0.7)";
    ctx.lineWidth = Math.max(1, barW);
    ctx.beginPath();
    ctx.moveTo(x, baseline);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Dot
    ctx.fillStyle = "rgba(45,92,140,1)";
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function getCoeff() {
  return parseFloat(slider.value);
}

function update(a) {
  draw(a);
}

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
  resizeCanvas();
  update(getCoeff());
});

resizeCanvas();
update(getCoeff());
