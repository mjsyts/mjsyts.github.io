class LfsrNoiseProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [{
            name: 'amplitude',
            defaultValue: 0.10,
            minValue: 0.0,
            maxValue: 1.0,
            automationRate: 'a-rate'
        }];
    }

    constructor() {
        super();
        this.state = 0x7fff;
    }

    process(inputs, outputs, parameters) {
        const out = outputs[0];
        const ampParam = parameters.amplitude;

        for (let ch = 0; ch < out.length; ch++) {
            for (let i = 0; i < channel.length; i++) {
                const lsb0 = this.state & 1;
                const lsb1 = (this.state >> 1) & 1;
                const fb = lsb0 ^ lsb1;
                this.state = (this.state >> 1) | (fb << 14);

                const sample = lsb0 ? 1.0 : -1.0;
                const amp = ampParam.length === 1 ? ampParam[0] : ampParam[i];
                channel[i] = sample * amp;
            }
        }
        return true;
    }
}
