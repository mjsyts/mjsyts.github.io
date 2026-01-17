class NaiveOsc extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "freq", defaultValue: 440, minValue: 0, maxValue: 96000, automationRate: "a-rate" },
      { name: "gain", defaultValue: 0.2, minValue: 0, maxValue: 1, automationRate: "k-rate" },
      { name: "wave", defaultValue: 0, minValue: 0, maxValue: 3, automationRate: "k-rate" },
    ];
  }

  constructor() {
    super();
    this.phase = 0;
  }

  process(_, outputs, params) {
    const out = outputs[0][0];
    const sr = sampleRate;

    const f = params.freq;
    const g = params.gain;
    const w = params.wave;

    for (let i = 0; i < out.length; i++) {
      const freq = f.length > 1 ? f[i] : f[0];
      const gain = g.length > 1 ? g[i] : g[0];
      const wave = w.length > 1 ? w[i] : w[0];

      this.phase += freq / sr;
      this.phase -= Math.floor(this.phase);

      let x = 0;
      if (wave < 0.5) x = Math.sin(2 * Math.PI * this.phase);
      else if (wave < 1.5) x = this.phase < 0.5 ? 1 : -1;
      else if (wave < 2.5) x = 2 * this.phase - 1;
      else x = 1 - 2 * Math.abs(2 * this.phase - 1);

      out[i] = x * gain;
    }
    return true;
  }
}

registerProcessor("naive-osc", NaiveOsc);
