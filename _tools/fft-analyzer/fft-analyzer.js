// assets/js/tools/fft-analyzer.js
import { AudioEngine } from '../../applets/host/audio.js';

class FFTAnalyzer {
    constructor() {
        this.audio = new AudioEngine();
        this.canvas = null;
        this.ctx = null;

        // FFT settings
        this.fftSize = 2048;
        this.windowType = 'hann';
        this.frequencyScale = 'log'; // 'log' or 'linear'
        this.smoothing = 0.8;

        // Captured spectra
        this.captures = [];
        this.maxCaptures = 5;

        // Animation
        this.animationId = null;
        this.running = false;
    }

    async init() {
        // Get canvas
        this.canvas = document.getElementById('fft-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Initialize audio with mic input
        await this.audio.initWithMic(this.fftSize);

        console.log('FFT Analyzer initialized');
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

    start() {
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