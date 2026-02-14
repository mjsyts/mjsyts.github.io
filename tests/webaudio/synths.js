// Base synth class
class Synth {
    constructor(audioContext) {
        this.ctx = audioContext;
    }
    
    // Override this in subclasses
    play(freq, atk, dec, hold, rel, susLvl, amp) {
        throw new Error('Subclasses must implement play()');
    }
}

// Example synths - replace/add your own
export class SineOsc extends Synth {
    play(freq, atk, dec, hold, rel, susLvl, amp) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(amp, now + atk);
        gain.gain.linearRampToValueAtTime(amp * susLvl, now + atk + dec);
        gain.gain.setValueAtTime(amp * susLvl, now + atk + dec + hold);
        gain.gain.linearRampToValueAtTime(0, now + atk + dec + hold + rel);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + atk + dec + hold + rel);
    }
}

export class SawOsc extends Synth {
    play(freq, atk, dec, hold, rel, susLvl, amp) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.value = 0;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(amp, now + atk);
        gain.gain.linearRampToValueAtTime(amp * susLvl, now + atk + dec);
        gain.gain.setValueAtTime(amp * susLvl, now + atk + dec + hold);
        gain.gain.linearRampToValueAtTime(0, now + atk + dec + hold + rel);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + atk + dec + hold + rel);
    }
}