// assets/js/tools/fft-analyzer.js
import { AudioEngine } from '../../../applets/host/audio.js';
import FFT from 'https://cdn.skypack.dev/fft.js';

class FFTAnalyzer {
    constructor() {
        this.audio = new AudioEngine();
        this.canvas = null;
        this.ctx = null;

        // FFT settings
        this.fftSize = 2048;
        this.windowType = 'blackman';
        this.frequencyScale = 'log'; // 'log' or 'linear'
        this.smoothing = 0.8;

        // FFT
        this.fft = new FFT(this.fftSize);

        // Smoothed magnitudes from previous frame
        this.prevMagnitudes = null;

        // Captured spectra
        this.captures = [];
        this.maxCaptures = 5;

        // Animation
        this.animationId = null;
        this.running = false;
    }

    setupCanvas() {
        this.canvas = document.getElementById('fft-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            if (!this.running) this.drawBackground();
        });
        this.drawBackground();
    }

    async init() {
        await this.audio.initWithMic(this.fftSize);
        console.log('FFT Analyzer initialized');
    }

    drawBackground() {
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const style = getComputedStyle(document.documentElement);
        const bgColor = style.getPropertyValue('--bg-primary').trim() || '#1a1a1a';
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, width, height);

        const range = document.getElementById('freq-range').value;
        let minFreq, maxFreq;
        switch (range) {
            case 'full': minFreq = 20; maxFreq = 20000; break;
            case 'musical': minFreq = 50; maxFreq = 5000; break;
            case 'sub': minFreq = 20; maxFreq = 200; break;
            default: minFreq = 20; maxFreq = 20000;
        }

        this.drawGrid(width, height, minFreq, maxFreq, -60, 20);
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    applyWindow(timeData) {
        const N = timeData.length;
        const windowed = new Float32Array(N);
        const windowFunc = WindowFunctions[this.windowType];

        for (let n = 0; n < N; n++) {
            // Convert from Uint8 [0,255] to centered float [-1,1]
            const sample = (timeData[n] - 128) / 128.0;
            windowed[n] = sample * windowFunc(n, N);
        }

        return windowed;
    }

    draw() {
        // Get time domain data
        const timeData = this.audio.getTimeData();
        if (!timeData) return;

        // Apply window function
        const windowed = this.applyWindow(timeData);

        // Perform FFT
        const out = this.fft.createComplexArray();
        this.fft.realTransform(out, windowed);

        // Calculate magnitudes
        const magnitudes = new Float32Array(this.fftSize / 2);
        for (let i = 0; i < magnitudes.length; i++) {
            const real = out[2 * i];
            const imaginary = out[2 * i + 1];
            magnitudes[i] = Math.sqrt(real * real + imaginary * imaginary);
        }

        // Apply smoothing (exponential moving average)
        if (this.prevMagnitudes) {
            const s = this.smoothing;
            for (let i = 0; i < magnitudes.length; i++) {
                magnitudes[i] = s * this.prevMagnitudes[i] + (1 - s) * magnitudes[i];
            }
        }
        this.prevMagnitudes = new Float32Array(magnitudes);

        // Draw spectrum
        this.drawSpectrum(magnitudes);

        if (this.running) {
            requestAnimationFrame(() => this.draw());
        }
    }

    drawSpectrum(magnitudes, color = null, alpha = 0.8) {
        // Use CSS dimensions
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Get frequency range
        const range = document.getElementById('freq-range').value;
        let minFreq, maxFreq;
        switch (range) {
            case 'full': minFreq = 20; maxFreq = 20000; break;
            case 'musical': minFreq = 50; maxFreq = 5000; break;
            case 'sub': minFreq = 20; maxFreq = 200; break;
            default: minFreq = 20; maxFreq = 20000;
        }

        const sampleRate = this.audio.sampleRate || 48000;

        // Clear canvas
        const style = getComputedStyle(document.documentElement);
        const bgColor = style.getPropertyValue('--bg-primary').trim() || '#1a1a1a';
        const lineColor = color || style.getPropertyValue('--spectrum-live').trim() || '#00ff88';

        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, width, height);

        // Convert to dB
        const minDb = -60;
        const maxDb = 20;

        // Draw grid behind spectrum
        this.drawGrid(width, height, minFreq, maxFreq, minDb, maxDb);

        const drawParams = { sampleRate, minFreq, maxFreq, minDb, maxDb, width, height };

        // Draw captured spectra behind live
        for (const capture of this.captures) {
            if (capture.visible) {
                this._drawLine(capture.data, capture.color, 0.6, drawParams);
            }
        }

        // Draw live spectrum on top
        this._drawLine(magnitudes, lineColor, alpha, drawParams);
    }

    _drawLine(magnitudes, color, alpha, { sampleRate, minFreq, maxFreq, minDb, maxDb, width, height }) {
        this.ctx.strokeStyle = color;
        this.ctx.globalAlpha = alpha;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        let firstPoint = true;

        for (let i = 1; i < magnitudes.length; i++) {
            const binFreq = (i * sampleRate) / (2 * magnitudes.length);

            let x;
            if (this.frequencyScale === 'log') {
                const logMin = Math.log10(minFreq);
                const logMax = Math.log10(maxFreq);
                const logFreq = Math.log10(binFreq);
                x = ((logFreq - logMin) / (logMax - logMin)) * width;
            } else {
                x = ((binFreq - minFreq) / (maxFreq - minFreq)) * width;
            }

            const db = 20 * Math.log10(magnitudes[i] + 1e-10);
            const normalized = (db - minDb) / (maxDb - minDb);
            const y = height - (Math.max(0, Math.min(1, normalized)) * height);

            if (firstPoint) {
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(x, y);
                firstPoint = false;
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
    }

    drawGrid(width, height, minFreq, maxFreq, minDb, maxDb) {
        const style = getComputedStyle(document.documentElement);
        const gridColor = style.getPropertyValue('--border').trim() || '#404040';
        const labelColor = style.getPropertyValue('--text-tool-secondary').trim() || '#a0a0a0';

        this.ctx.lineWidth = 1;

        // --- dB horizontal lines ---
        this.ctx.strokeStyle = gridColor;
        this.ctx.fillStyle = labelColor;
        this.ctx.font = '11px sans-serif';
        this.ctx.textBaseline = 'middle';

        const dbStep = 20;
        for (let db = minDb; db <= maxDb; db += dbStep) {
            const normalized = (db - minDb) / (maxDb - minDb);
            const y = height - (normalized * height);

            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();

            this.ctx.globalAlpha = 0.6;
            if (y < 14) {
                this.ctx.textBaseline = 'top';
                this.ctx.fillText(`${db} dB`, 4, y + 3);
            } else {
                this.ctx.textBaseline = 'bottom';
                this.ctx.fillText(`${db} dB`, 4, y - 3);
            }
        }

        // --- Frequency vertical lines ---
        const freqTicks = this.frequencyScale === 'log'
            ? [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
            : this.linearTicks(minFreq, maxFreq);

        this.ctx.textBaseline = 'bottom';

        for (const freq of freqTicks) {
            if (freq < minFreq || freq > maxFreq) continue;

            let x;
            if (this.frequencyScale === 'log') {
                const logMin = Math.log10(minFreq);
                const logMax = Math.log10(maxFreq);
                x = ((Math.log10(freq) - logMin) / (logMax - logMin)) * width;
            } else {
                x = ((freq - minFreq) / (maxFreq - minFreq)) * width;
            }

            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();

            const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
            this.ctx.globalAlpha = 0.6;
            const textW = this.ctx.measureText(label).width;
            if (x < 50) continue; // Skip labels that would be too close to the left edge
            if (x + 3 + textW > width) {
                this.ctx.textAlign = 'right';
                this.ctx.fillText(label, x - 3, height - 4);
                this.ctx.textAlign = 'left';
            } else {
                this.ctx.fillText(label, x + 3, height - 4);
            }
        }

        this.ctx.globalAlpha = 1.0;
    }

    linearTicks(minFreq, maxFreq) {
        const range = maxFreq - minFreq;
        const rawStep = range / 6;
        const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
        const step = Math.ceil(rawStep / mag) * mag;
        const ticks = [];
        const start = Math.ceil(minFreq / step) * step;
        for (let f = start; f <= maxFreq; f += step) {
            ticks.push(f);
        }
        return ticks;
    }

    captureSpectrum() {
        if (!this.prevMagnitudes || this.captures.length >= this.maxCaptures) return;

        const style = getComputedStyle(document.documentElement);
        const colorVar = `--spectrum-capture-${this.captures.length + 1}`;
        const color = style.getPropertyValue(colorVar).trim();

        this.captures.push({
            data: new Float32Array(this.prevMagnitudes),
            color,
            visible: true
        });

        this.updateCaptureList();
    }

    removeCapture(index) {
        this.captures.splice(index, 1);
        this.updateCaptureList();
    }

    updateCaptureList() {
        const list = document.getElementById('captured-list');
        list.innerHTML = '';

        this.captures.forEach((capture, i) => {
            const item = document.createElement('div');
            item.className = 'captured-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = capture.visible;
            checkbox.addEventListener('change', () => {
                capture.visible = checkbox.checked;
            });

            const swatch = document.createElement('span');
            swatch.className = 'color-indicator';
            swatch.style.backgroundColor = capture.color;

            const label = document.createElement('span');
            label.textContent = `Capture ${i + 1}`;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '\u00d7';
            removeBtn.addEventListener('click', () => this.removeCapture(i));

            item.append(checkbox, swatch, label, removeBtn);
            list.appendChild(item);
        });
    }

    start() {
        this.running = true;
        this.draw();
    }

    stop() {
        this.running = false;
    }
}

// Window function implementations
const WindowFunctions = {
    rectangular(n, N) {
        return 1.0;
    },

    hann(n, N) {
        return 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
    },

    hamming(n, N) {
        return 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
    },

    blackman(n, N) {
        const a0 = 0.42;
        const a1 = 0.5;
        const a2 = 0.08;
        return a0
            - a1 * Math.cos(2 * Math.PI * n / (N - 1))
            + a2 * Math.cos(4 * Math.PI * n / (N - 1));
    }
};

// Initialize on page load
const analyzer = new FFTAnalyzer();
analyzer.setupCanvas();

// Bind init button
document.getElementById('init-button').addEventListener('click', async () => {
    try {
        await analyzer.init();
        analyzer.start();
    } catch (err) {
        console.error('Init failed:', err);
        alert('Microphone access denied or unavailable');
    }
});

document.getElementById('smoothing').addEventListener('input', (e) => {
    analyzer.smoothing = parseFloat(e.target.value) * 0.01;
    document.getElementById('smoothing-display').textContent = analyzer.smoothing.toFixed(2);
});

// Window function select
document.getElementById('window-select').addEventListener('change', (e) => {
    analyzer.windowType = e.target.value;
});

// Frequency range select
document.getElementById('freq-range').addEventListener('change', () => {
    if (!analyzer.running) analyzer.drawBackground();
});

// Capture button
document.getElementById('capture-button').addEventListener('click', () => {
    analyzer.captureSpectrum();
});

// Frequency scale toggle buttons
document.querySelectorAll('[data-scale]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-scale]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        analyzer.frequencyScale = btn.dataset.scale;
        if (!analyzer.running) analyzer.drawBackground();
    });
});