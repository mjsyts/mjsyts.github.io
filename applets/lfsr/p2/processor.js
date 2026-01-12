// applets/lfsr/p2/processor.js
class LfsrNoiseProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "amplitude",
        defaultValue: 0.10,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: "a-rate"
      },
      {
        name: "frequency",
        defaultValue: 440,
        minValue: 0,
        maxValue: 48000,
        automationRate: "k-rate"
      }
    ];
  }

  constructor() {
    super();
    this.state = 0x7fff;
    this.phase = 0.0;
  }

  step() {
    const b0 = this.state & 1;
    const b1 = (this.state >> 1) & 1;
    const fb = b0 ^ b1;
    this.state = (this.state >> 1) | (fb << 14);
  }

  nextSample(freq, sampleRate) {
    this.phase += freq / sampleRate;

    while (this.phase >= 1.0) {
      this.phase -= 1.0;
      this.step();
    }

    const bit = this.state & 1;
    return bit ? 1.0 : -1.0;
  }

  process(inputs, outputs, parameters) {
    const out = outputs[0];
    const ampParam = parameters.amplitude;
    const freqParam = parameters.frequency;

    const f0 = freqParam[0];
    const freq = Math.min(Math.max(f0, 0), sampleRate);

    for (let ch = 0; ch < out.length; ch++) {
      const channel = out[ch];
      for (let i = 0; i < channel.length; i++) {
        const amp = ampParam.length > 1 ? ampParam[i] : ampParam[0];
        channel[i] = this.nextSample(freq, sampleRate) * amp;
      }
    }
    return true;
  }
}

registerProcessor("lfsr-noise", LfsrNoiseProcessor);
