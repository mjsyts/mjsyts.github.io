import * as Synths from './synths.js';

// Attach all exported synths to window
Object.assign(window, Synths);

// Now the rest of your discovery code works
let audioContext;
let synthInstances = {};
let availableSynths = [];

function discoverSynths() {
    availableSynths = Object.keys(Synths);
    
    const select = document.getElementById('synth-select');
    availableSynths.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
    
    if (availableSynths.length > 0) {
        select.value = availableSynths[0];
    }
}

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function getCurrentSynth() {
    const ctx = initAudio();
    const selectedName = document.getElementById('synth-select').value;

    if (!selectedName) {
        alert('Please select a synth first');
        return null;
    }

    // Create instance if it doesn't exist
    if (!synthInstances[selectedName]) {
        synthInstances[selectedName] = new window[selectedName](ctx);
    }

    return synthInstances[selectedName];
}

function getParams() {
    return {
        freq: parseFloat(document.getElementById('freq').value),
        atk: parseFloat(document.getElementById('atk').value),
        dec: parseFloat(document.getElementById('dec').value),
        hold: parseFloat(document.getElementById('hold').value),
        rel: parseFloat(document.getElementById('rel').value),
        susLvl: parseFloat(document.getElementById('sus').value),
        amp: parseFloat(document.getElementById('amp').value)
    };
}

function playWithParams() {
    const synth = getCurrentSynth();
    if (!synth) return;

    const p = getParams();
    synth.play(p.freq, p.atk, p.dec, p.hold, p.rel, p.susLvl, p.amp);
}

function playNote(freq) {
    const synth = getCurrentSynth();
    if (!synth) return;

    const p = getParams();
    synth.play(freq, p.atk, p.dec, p.hold, p.rel, p.susLvl, p.amp);
}

function updateValue(id, value, unit = '') {
    document.getElementById(id + '-val').textContent = parseFloat(value).toFixed(2) + ' ' + unit;
}

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    discoverSynths();

    ['freq', 'atk', 'dec', 'hold', 'rel', 'sus', 'amp'].forEach(param => {
        const slider = document.getElementById(param);
        const unit = param === 'freq' ? 'Hz' : (param === 'sus' || param === 'amp' ? '' : 's');

        slider.addEventListener('input', (e) => {
            updateValue(param, e.target.value, unit);
        });
    });
});

window.playWithParams = playWithParams;
window.playNote = playNote;