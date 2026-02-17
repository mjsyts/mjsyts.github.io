// Parameter definition
export class Parameter {
    constructor(name, min, max, defaultValue, step = 0.01, unit = '', curve = 'lin', visible = true) {
        this.name = name;
        this.min = min;
        this.max = max;
        this.default = defaultValue;
        this.step = step;
        this.unit = unit;
        this.curve = curve; // 'lin' or 'exp'
        this.visible = visible;
    }
    
    // Common parameter presets
    static freq(defaultValue = 440) {
        return new Parameter('freq', 20, 2000, defaultValue, 1, 'Hz', 'exp');
    }
    
    static atk(defaultValue = 0.01) {
        return new Parameter('atk', 0, 2, defaultValue, 0.01, 's', 'exp');
    }
    
    static dec(defaultValue = 0.1) {
        return new Parameter('dec', 0, 2, defaultValue, 0.01, 's', 'exp');
    }
    
    static hold(defaultValue = 0.5) {
        return new Parameter('hold', 0, 3, defaultValue, 0.01, 's', 'lin');
    }
    
    static rel(defaultValue = 0.3) {
        return new Parameter('rel', 0, 3, defaultValue, 0.01, 's', 'exp');
    }
    
    static sus(defaultValue = 0.7) {
        return new Parameter('sus', 0, 1, defaultValue, 0.01, '', 'lin');
    }
    
    static amp(defaultValue = 1.0) {
        return new Parameter('amp', 0, 1, defaultValue, 0.01, '', 'exp');
    }
}

// Base synth class
class Synth {
    constructor(audioContext) {
        this.ctx = audioContext;
    }
    
    // Override this to define custom parameters
    static getParameters() {
        return [
            new Parameter('freq', 20, 2000, 440, 1, 'Hz'),
            new Parameter('atk', 0, 2, 0.01, 0.01, 's'),
            new Parameter('dec', 0, 2, 0.1, 0.01, 's'),
            new Parameter('hold', 0, 3, 0.5, 0.01, 's'),
            new Parameter('rel', 0, 3, 0.3, 0.01, 's'),
            new Parameter('sus', 0, 1, 0.7, 0.01, ''),
            new Parameter('amp', 0, 1, 1.0, 0.01, '')
        ];
    }
    
    // Override this - receives params object
    play(params) {
        throw new Error('Subclasses must implement play()');
    }
}

export class SineOsc extends Synth {
    play(params) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = params.freq;
        gain.gain.value = 0;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(params.amp, now + params.atk);
        gain.gain.linearRampToValueAtTime(params.amp * params.sus, now + params.atk + params.dec);
        gain.gain.setValueAtTime(params.amp * params.sus, now + params.atk + params.dec + params.hold);
        gain.gain.linearRampToValueAtTime(0, now + params.atk + params.dec + params.hold + params.rel);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + params.atk + params.dec + params.hold + params.rel);
    }
}

export class SawOsc extends Synth {
    play(params) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = params.freq;
        gain.gain.value = 0;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(params.amp, now + params.atk);
        gain.gain.linearRampToValueAtTime(params.amp * params.sus, now + params.atk + params.dec);
        gain.gain.setValueAtTime(params.amp * params.sus, now + params.atk + params.dec + params.hold);
        gain.gain.linearRampToValueAtTime(0, now + params.atk + params.dec + params.hold + params.rel);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + params.atk + params.dec + params.hold + params.rel);
    }
}

export class SquareOsc extends Synth {
    play(params) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = params.freq;
        gain.gain.value = 0;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(params.amp, now + params.atk);
        gain.gain.linearRampToValueAtTime(params.amp * params.sus, now + params.atk + params.dec);
        gain.gain.setValueAtTime(params.amp * params.sus, now + params.atk + params.dec + params.hold);
        gain.gain.linearRampToValueAtTime(0, now + params.atk + params.dec + params.hold + params.rel);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + params.atk + params.dec + params.hold + params.rel);
    }
}

// Example: FM synth with custom parameters
export class FMOsc extends Synth {
    static getParameters() {
        return [
            new Parameter('freq', 20, 2000, 440, 1, 'Hz'),
            new Parameter('modFreq', 0, 2000, 100, 1, 'Hz'),
            new Parameter('modIndex', 0, 100, 10, 0.1, ''),
            new Parameter('atk', 0, 2, 0.01, 0.01, 's'),
            new Parameter('dec', 0, 2, 0.1, 0.01, 's'),
            new Parameter('hold', 0, 3, 0.5, 0.01, 's'),
            new Parameter('rel', 0, 3, 0.3, 0.01, 's'),
            new Parameter('sus', 0, 1, 0.7, 0.01, ''),
            new Parameter('amp', 0, 1, 1.0, 0.01, '')
        ];
    }
    
    play(params) {
        const now = this.ctx.currentTime;
        const carrier = this.ctx.createOscillator();
        const modulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const gain = this.ctx.createGain();

        carrier.frequency.value = params.freq;
        modulator.frequency.value = params.modFreq;
        modGain.gain.value = params.modIndex;
        gain.gain.value = 0;

        // FM routing
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(gain);
        gain.connect(this.ctx.destination);

        // Envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(params.amp, now + params.atk);
        gain.gain.linearRampToValueAtTime(params.amp * params.sus, now + params.atk + params.dec);
        gain.gain.setValueAtTime(params.amp * params.sus, now + params.atk + params.dec + params.hold);
        gain.gain.linearRampToValueAtTime(0, now + params.atk + params.dec + params.hold + params.rel);

        carrier.start(now);
        modulator.start(now);
        const stopTime = now + params.atk + params.dec + params.hold + params.rel;
        carrier.stop(stopTime);
        modulator.stop(stopTime);
    }
}

export class Hat808 extends Synth {
    static getParameters() {
        return [
            new Parameter('freq', 20, 20000, 8000, 1, 'Hz'),
            new Parameter('atk', 0, 2, 0.01, 0.01, 's'),
            new Parameter('rel', 0, 3, 0.3, 0.01, 's'),
            new Parameter('amp', 0, 1, 1.0, 0.01, '')
        ];
    }
    
    play(params) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = params.freq;
        gain.gain.value = 0;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(params.amp, now + params.atk);
        gain.gain.linearRampToValueAtTime(params.amp * params.sus, now + params.atk + params.dec);
        gain.gain.setValueAtTime(params.amp * params.sus, now + params.atk + params.dec + params.hold);
        gain.gain.linearRampToValueAtTime(0, now + params.atk + params.dec + params.hold + params.rel);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + params.atk + params.dec + params.hold + params.rel);
    }
}