// applets/filter/p2/audio/processor.js
class OnePoleFilterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "amplitude",
        defaultValue: 0.5,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: "a-rate",
      },
      {
        name: "cutoff",
        defaultValue: 1000,
        minValue: 1,
        maxValue: 20000,
        automationRate: "k-rate",
      },
      {
        name: "mode",
        defaultValue: 0, // 0 = lowpass, 1 = highpass
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
    ];
  }

  constructor() {
    super();
    this.y = 0.0; // filter state
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];

    const ampParam = parameters.amplitude;
    const cutoff = parameters.cutoff[0];
    const mode = parameters.mode[0];

    // derive coefficient from cutoff
    const rawA = 1.0 - (2.0 * Math.PI * cutoff / sampleRate);
    const a = mode >= 0.5 ? -Math.max(0, Math.min(1, rawA)) : Math.max(0, Math.min(1, rawA));

    for (let i = 0; i < channel.length; i++) {
      const amp = ampParam.length > 1 ? ampParam[i] : ampParam[0];
      const noise = Math.random() * 2.0 - 1.0;
      this.y = noise + a * this.y;
      channel[i] = this.y * amp;
    }

    return true;
  }
}

registerProcessor("one-pole-filter", OnePoleFilterProcessor);
