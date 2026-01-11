// applets/lfsr/p3/processor.js
class LfsrNoiseProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "amplitude",
        defaultValue: 0.10,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: "a-rate",
      },
      {
        name: "frequency",
        defaultValue: 440,
        minValue: 0,
        maxValue: 48000,
        automationRate: "a-rate",
      },
      {
        name: "width",
        defaultValue: 15,
        minValue: 3,
        maxValue: 32,
        automationRate: "k-rate",
      },
    ];
  }

  constructor() {
    super();

    // core LFSR state
    this.seed = 1;
    this.state = this.seed;
    this.phase = 0.0;

    // width-derived values
    this.width = 15;
    this.fbIndex = null;
    this.mask = null;

    this.setWidth(this.width);

    // Listen for reset messages
    this.port.onmessage = (e) => {
      if (e.data.type === "reset") {
        this.reset();
      }
    };
  }

  isTerminalState() {
    return this.state === 0;
  }

  reset() {
    this.state = this.seed;
  }

  setWidth(w) {
    // clamp width
    const clamped = Math.min(Math.max(w | 0, 3), 32);

    // if unchanged, bail out
    if (clamped === this.width && this.mask !== null) {
      return;
    }

    this.width = clamped;

    this.fbIndex = this.width - 1;

    this.mask = (this.width === 32)
      ? 0xFFFFFFFF
      : (1 << this.width) - 1;

    this.state &= this.mask;

    // update seed to match the new masked state (or default to 1 if zero)
    this.seed = this.state || 1;
  }

  step() {
    if (this.isTerminalState()) {
      this.reset();
    }

    const lsb0 = this.state & 1;
    const lsb1 = (this.state >>> 1) & 1;
    const fb = lsb0 ^ lsb1;

    this.state = (this.state >>> 1) | (fb << this.fbIndex);
    this.state &= this.mask;
  }

  nextSample(freq) {
    // guard against weird freq inputs
    const f = Math.max(0, Math.min(freq, sampleRate));

    this.phase += f / sampleRate;

    while (this.phase >= 1.0) {
      this.phase -= 1.0;
      this.step();
    }

    const bit = this.state & 1;
    return bit ? 1.0 : -1.0;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const ampParam = parameters.amplitude;
    const freqParam = parameters.frequency;
    const widthParam = parameters.width;

    const isFreqARate = freqParam.length > 1;
    const isWidthKRate = widthParam.length === 1;

    // k-rate width: update once per block
    if (isWidthKRate) {
      this.setWidth(widthParam[0]);
    }

    for (let ch = 0; ch < output.length; ch++) {
      const channel = output[ch];

      for (let i = 0; i < channel.length; i++) {
        const amp = ampParam.length > 1 ? ampParam[i] : ampParam[0];

        // if width is accidentally a-rate, handle it gracefully
        if (!isWidthKRate) {
          this.setWidth(widthParam[i]);
        }

        const freq = isFreqARate ? freqParam[i] : freqParam[0];
        channel[i] = this.nextSample(freq) * amp;
      }
    }

    return true;
  }
}

registerProcessor("lfsr-noise", LfsrNoiseProcessor);
