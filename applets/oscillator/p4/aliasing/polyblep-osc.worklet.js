class PolyBlepOsc extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "freq", defaultValue: 440, minValue: 0, maxValue: 96000, automationRate: "a-rate" },
      { name: "gain", defaultValue: 0.2, minValue: 0, maxValue: 1, automationRate: "k-rate" },
      { name: "wave", defaultValue: 0, minValue: 0, maxValue: 3, automationRate: "k-rate" },
      { name: "polyblep", defaultValue: 0, minValue: 0, maxValue: 1, automationRate: "k-rate" },
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.prevPhase = 0;
    this.previousSample = 0;
  }

  polyBlepBefore(d) {
    return d * d / 2;
  }

  polyBlepAfter(d) {
    return d * d / 2 + d - 0.5;
  }

  detectWrap(phaseBefore, phaseAfter) {
    return phaseBefore > phaseAfter;
  }

  detectRisingEdge(phaseBefore, phaseAfter, threshold) {
    return phaseBefore < threshold && phaseAfter >= threshold;
  }

  process(_, outputs, params) {
    const out = outputs[0][0];
    const sr = sampleRate;

    const f = params.freq;
    const g = params.gain;
    const w = params.wave;
    const usePolyBlep = params.polyblep[0] > 0.5; // k-rate, single value

    for (let i = 0; i < out.length; i++) {
      const freq = f.length > 1 ? f[i] : f[0];
      const gain = g.length > 1 ? g[i] : g[0];
      const wave = w.length > 1 ? w[i] : w[0];

      const phaseInc = freq / sr;

      // Store previous phase
      this.prevPhase = this.phase;

      // Advance phase
      this.phase += phaseInc;
      this.phase -= Math.floor(this.phase);

      // Generate naïve sample
      let currentSample = 0;
      if (wave < 0.5) currentSample = Math.sin(2 * Math.PI * this.phase);
      else if (wave < 1.5) currentSample = this.phase < 0.5 ? 1 : -1;
      else if (wave < 2.5) currentSample = 2 * this.phase - 1;
      else currentSample = 1 - 2 * Math.abs(2 * this.phase - 1);

      if (usePolyBlep) {
        const isSaw = wave >= 1.5 && wave < 2.5;
        const isSquare = wave >= 0.5 && wave < 1.5;

        if (isSaw || isSquare) {
          // Detect and correct wrap (both have this)
          if (this.detectWrap(this.prevPhase, this.phase)) {
            const d = this.phase / phaseInc;
            this.previousSample += this.polyBlepBefore(d);
            currentSample += this.polyBlepAfter(d);
          }

          // Detect and correct 0.5 crossing (square only)
          if (isSquare) {
            if (this.detectRisingEdge(this.prevPhase, this.phase, 0.5)) {
              const d = (this.phase - 0.5) / phaseInc;
              this.previousSample -= this.polyBlepBefore(d);
              currentSample -= this.polyBlepAfter(d);
            }
          }
        }
      }

      // Output buffered sample
      out[i] = this.previousSample * gain;
      this.previousSample = currentSample;
    }
    return true;
  }
}

registerProcessor("polyblep-osc", PolyBlepOsc);