(() => {
    // ---------- helpers ----------
    const $ = (id) => document.getElementById(id);
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

    function fmtHz(f) {
        if (!Number.isFinite(f)) return "—";
        if (f >= 1000) return (f / 1000).toFixed(3) + " kHz";
        if (f >= 10) return f.toFixed(3) + " Hz";
        return f.toFixed(6) + " Hz";
    }

    // Clamp to a reasonable range for the visual sim.
    // (You can widen this later if you want.)
    function clampFreqHz(f) {
        if (!Number.isFinite(f)) return 1.0;
        return clamp(f, 0.0001, 20000);
    }

    function fmtTimeSec(s) {
        if (s < 60) return s.toFixed(2) + " s";
        const m = Math.floor(s / 60);
        const r = s - m * 60;
        if (m < 60) return `${m}m ${r.toFixed(1)}s`;
        const h = Math.floor(m / 60);
        const mm = m - h * 60;
        return `${h}h ${mm}m`;
    }

    // Wrap to nearest distance on a unit circle in cycles: [-0.5, 0.5)
    function wrapCycleError(e) { return e - Math.round(e); }

    // ---------- simulation (WRAPPED ERROR ONLY) ----------
    function simulateWrappedError({
        sr,
        freq,
        durationSec,
        wrapMode,        // "conditional" | "fract"
        targetPoints = 2400
    }) {
        const N = Math.max(1, Math.floor(durationSec * sr));
        const stride = Math.max(1, Math.floor(N / targetPoints));

        const incRef = freq / sr;              // double
        const incF32 = Math.fround(freq / sr); // float32 emulated

        let pRef = 0.0;
        let pF32 = 0.0;

        const xs = [];
        const ys = [];
        let maxAbs = 0;

        // wrapping functions
        function wrapConditionalDouble(p) {
            if (p >= 1.0) p -= 1.0;
            if (p < 0.0) p += 1.0;
            return p;
        }
        function wrapFractDouble(p) {
            return p - Math.floor(p);
        }

        function wrapConditionalF32(p) {
            if (p >= 1.0) p = Math.fround(p - 1.0);
            if (p < 0.0) p = Math.fround(p + 1.0);
            return p;
        }
        function wrapFractF32(p) {
            const f = Math.floor(p);
            return Math.fround(p - f);
        }

        const wrapRef = (wrapMode === "fract") ? wrapFractDouble : wrapConditionalDouble;
        const wrapF32 = (wrapMode === "fract") ? wrapFractF32 : wrapConditionalF32;

        for (let n = 0; n <= N; n++) {
            // advance reference (double)
            pRef += incRef;
            pRef = wrapRef(pRef);

            // advance float32-emulated
            pF32 = Math.fround(pF32 + incF32);
            pF32 = wrapF32(pF32);

            if (n % stride === 0 || n === N) {
                const t = n / sr;

                // compare wrapped phases and wrap error to [-0.5, 0.5) cycles, then degrees
                let e = (pF32 - pRef);
                e = wrapCycleError(e);
                const deg = e * 360.0;

                xs.push(t);
                ys.push(deg);

                const a = Math.abs(deg);
                if (a > maxAbs) maxAbs = a;
            }
        }

        const final = ys.length ? ys[ys.length - 1] : 0;
        return { xs, ys, N, stride, maxAbs, final };
    }

    // ---------- plotting ----------
    const canvas = $("canvas");
    const tooltip = $("tooltip");
    const plotWrap = $("plotWrap");
    const ctx = canvas.getContext("2d");

    let dpr = 1;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
    }

    function drawPlot(series) {
        const { xs, ys } = series;
        const w = canvas.width, h = canvas.height;

        const padL = 56 * dpr, padR = 16 * dpr, padT = 18 * dpr, padB = 40 * dpr;
        const plotW = Math.max(1, w - padL - padR);
        const plotH = Math.max(1, h - padT - padB);

        const xMin = xs.length ? xs[0] : 0;
        const xMax = xs.length ? xs[xs.length - 1] : 1;

        // fixed scale for wrapped error
        const yMin = -180, yMax = 180;

        const xToPx = (x) => padL + ((x - xMin) / (xMax - xMin || 1)) * plotW;
        const yToPx = (y) => padT + (1 - ((y - yMin) / (yMax - yMin))) * plotH;

        ctx.clearRect(0, 0, w, h);

        // subtle background wash
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        // grid
        ctx.save();
        ctx.lineWidth = 1 * dpr;
        ctx.strokeStyle = "rgba(17,17,17,0.10)";

        const gridYCount = 5;
        for (let i = 0; i <= gridYCount; i++) {
            const yy = padT + (i / gridYCount) * plotH;
            ctx.beginPath();
            ctx.moveTo(padL, yy);
            ctx.lineTo(padL + plotW, yy);
            ctx.stroke();
        }

        const gridXCount = 6;
        for (let i = 0; i <= gridXCount; i++) {
            const xx = padL + (i / gridXCount) * plotW;
            ctx.beginPath();
            ctx.moveTo(xx, padT);
            ctx.lineTo(xx, padT + plotH);
            ctx.stroke();
        }
        ctx.restore();

        // labels
        ctx.save();
        ctx.fillStyle = "rgba(17,17,17,0.62)";
        ctx.font = `${12 * dpr}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

        for (const val of [-180, -90, 0, 90, 180]) {
            const yy = yToPx(val);
            ctx.fillText(`${val.toFixed(0)}°`, 8 * dpr, yy + 4 * dpr);
        }

        ctx.fillText(`0`, padL, padT + plotH + 28 * dpr);
        ctx.fillText(`${xMax.toFixed(xMax < 10 ? 2 : 1)} s`, padL + plotW - 42 * dpr, padT + plotH + 28 * dpr);

        ctx.fillStyle = "rgba(17,17,17,0.75)";
        ctx.font = `${13 * dpr}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
        ctx.fillText("wrapped phase error (deg)", padL, padT - 4 * dpr);
        ctx.restore();

        // zero line
        ctx.save();
        ctx.strokeStyle = "rgba(45,92,140,0.25)";
        ctx.lineWidth = 1.25 * dpr;
        const y0 = yToPx(0);
        ctx.beginPath();
        ctx.moveTo(padL, y0);
        ctx.lineTo(padL + plotW, y0);
        ctx.stroke();
        ctx.restore();

        // series polyline
        ctx.save();
        ctx.strokeStyle = "rgba(45,92,140,0.92)";
        ctx.lineWidth = 2 * dpr;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        if (xs.length) {
            ctx.beginPath();
            ctx.moveTo(xToPx(xs[0]), yToPx(ys[0]));
            for (let i = 1; i < xs.length; i++) ctx.lineTo(xToPx(xs[i]), yToPx(ys[i]));
            ctx.stroke();
        }
        ctx.restore();

        return { padL, padT, plotW, plotH, xMin, xMax, xToPx, yToPx };
    }

    function nearestIndexForX(series, map, xPx) {
        const { xs } = series;
        const { padL, plotW, xMin, xMax } = map;
        const t = xMin + clamp((xPx - padL) / (plotW || 1), 0, 1) * (xMax - xMin);

        let lo = 0, hi = xs.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (xs[mid] < t) lo = mid + 1;
            else hi = mid;
        }
        const i = clamp(lo, 0, xs.length - 1);
        if (i > 0 && Math.abs(xs[i - 1] - t) < Math.abs(xs[i] - t)) return i - 1;
        return i;
    }

    // ---------- UI ----------
    const freqEl = $("freq");
    const freqValEl = $("freqVal");
    const srEl = $("sr");
    const durationEl = $("duration");
    const wrapModeEl = $("wrapMode");
    const runBtn = $("runBtn");
    const resetBtn = $("resetBtn");

    const pointsOut = $("pointsOut");
    const timeOut = $("timeOut");
    const finalOut = $("finalOut");
    const maxOut = $("maxOut");

    let series = null;
    let map = null;

    function updateFreqLabel() {
        const f = clampFreqHz(parseFloat(freqEl.value));
        // If user typed something out of range, normalize on blur (see handlers below).
        freqValEl.textContent = fmtHz(f);
    }

    function render() {
        if (!series) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            map = null;
            return;
        }
        map = drawPlot(series);
    }

    function updateReadout() {
        if (!series) {
            pointsOut.textContent = "—";
            timeOut.textContent = "—";
            finalOut.textContent = "—";
            maxOut.textContent = "—";
            return;
        }

        pointsOut.textContent = String(series.xs.length);
        timeOut.textContent = fmtTimeSec(series.xs[series.xs.length - 1] || 0);
        finalOut.textContent = `${series.final.toFixed(6)}°`;
        maxOut.textContent = `${series.maxAbs.toFixed(6)}°`;
    }

    function runSim() {
        requestAnimationFrame(() => {
            const sr = parseInt(srEl.value, 10);
            const freq = clampFreqHz(parseFloat(freqEl.value));
            const durationSec = parseFloat(durationEl.value);

            series = simulateWrappedError({
                sr,
                freq,
                durationSec,
                wrapMode: wrapModeEl.value,
                targetPoints: 2400
            });

            render();
            updateReadout();
        });
    }

    function resetAll() {
        series = null;
        render();
        updateReadout();
        tooltip.style.display = "none";
    }

    // hover tooltip + crosshair
    function showTooltipAt(i, clientX, clientY) {
        const t = series.xs[i];
        const deg = series.ys[i];

        tooltip.innerHTML = `
      <div><span class="k">t</span><span class="mono">${t.toFixed(6)} s</span></div>
      <div><span class="k">err</span><span class="mono">${deg.toFixed(6)}°</span></div>
      <div><span class="k">idx</span><span class="mono">${i}</span></div>
    `;
        tooltip.style.display = "block";

        const rect = plotWrap.getBoundingClientRect();
        const pad = 10;
        const tw = tooltip.offsetWidth || 220;
        const th = tooltip.offsetHeight || 60;

        let left = clientX - rect.left + 14;
        let top = clientY - rect.top + 14;

        left = Math.min(left, rect.width - tw - pad);
        top = Math.min(top, rect.height - th - pad);

        tooltip.style.left = `${Math.max(pad, left)}px`;
        tooltip.style.top = `${Math.max(pad, top)}px`;
    }

    function drawCrosshair(i) {
        if (!series || !map) return;

        // redraw base plot
        render();

        const px = map.xToPx(series.xs[i]);
        const py = map.yToPx(series.ys[i]);

        ctx.save();
        ctx.lineWidth = 1 * dpr;
        ctx.strokeStyle = "rgba(222,141,116,0.85)";
        ctx.fillStyle = "rgba(222,141,116,0.95)";

        ctx.beginPath();
        ctx.moveTo(px, map.padT);
        ctx.lineTo(px, map.padT + map.plotH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(map.padL, py);
        ctx.lineTo(map.padL + map.plotW, py);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, 3.5 * dpr, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    canvas.addEventListener("mousemove", (e) => {
        if (!series || !map) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * dpr;
        const y = (e.clientY - rect.top) * dpr;

        const inX = x >= map.padL && x <= map.padL + map.plotW;
        const inY = y >= map.padT && y <= map.padT + map.plotH;
        if (!inX || !inY) {
            tooltip.style.display = "none";
            render();
            return;
        }

        const i = nearestIndexForX(series, map, x);
        drawCrosshair(i);
        showTooltipAt(i, e.clientX, e.clientY);
    });

    canvas.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
        render();
    });

    // init / wiring
    function init() {
        resizeCanvas();
        updateFreqLabel();
        resetAll();
        render();
    }

    window.addEventListener("resize", () => {
        resizeCanvas();
        render();
    });

    freqEl.addEventListener("input", () => {
        // live label update while typing
        updateFreqLabel();
    });

    freqEl.addEventListener("blur", () => {
        // normalize the field to a valid number when leaving the input
        const f = clampFreqHz(parseFloat(freqEl.value));
        freqEl.value = String(f);
        updateFreqLabel();
        if (series) runSim();
    });

    freqEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            freqEl.blur(); // triggers normalize + optional rerun
        }
    });

    for (const el of [srEl, durationEl, wrapModeEl]) {
        el.addEventListener("change", () => { if (series) runSim(); });
    }

    runBtn.addEventListener("click", runSim);
    resetBtn.addEventListener("click", resetAll);

    init();
})();
