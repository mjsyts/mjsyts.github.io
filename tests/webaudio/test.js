import * as Synths from './synths.js';

let audioContext;
let synthInstances = {};
let currentParams = {};

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function getSynthClasses() {
    // Filter out Parameter class, only get synth classes
    return Object.keys(Synths).filter(name => 
        typeof Synths[name] === 'function' && 
        name !== 'Parameter'
    );
}

function populateSynthSelector() {
    const synthClasses = getSynthClasses();
    const select = document.getElementById('synth-select');
    
    synthClasses.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
    
    if (synthClasses.length > 0) {
        select.value = synthClasses[0];
        loadSynthParameters(synthClasses[0]);
    }
}

function loadSynthParameters(synthName) {
    const SynthClass = Synths[synthName];
    const params = SynthClass.getParameters();
    
    // Clear existing controls
    const container = document.getElementById('params-container');
    container.innerHTML = '';
    currentParams = {};
    
    // Build controls for each parameter
    params.forEach(param => {
        if (!param.visible) return;
        
        const group = document.createElement('div');
        group.className = 'control-group';
        
        const label = document.createElement('label');
        label.textContent = param.name.charAt(0).toUpperCase() + param.name.slice(1) + ':';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `${param.name}-slider`;
        slider.min = param.min;
        slider.max = param.max;
        slider.value = param.default;
        slider.step = param.step;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'value-input';
        input.id = `${param.name}-input`;
        input.value = param.default.toFixed(2);
        
        const unit = document.createElement('span');
        unit.className = 'unit-display';
        unit.textContent = param.unit;
        
        // Slider updates input and param
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            input.value = value.toFixed(2);
            currentParams[param.name] = value;
        });
        
        // Input updates slider and param (with clamping)
        input.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);
            
            if (isNaN(value)) return;
            
            // Clamp value
            value = Math.max(param.min, Math.min(param.max, value));
            
            slider.value = value;
            currentParams[param.name] = value;
        });
        
        // Format on blur
        input.addEventListener('blur', (e) => {
            let value = parseFloat(e.target.value);
            if (isNaN(value)) {
                value = param.default;
            }
            value = Math.max(param.min, Math.min(param.max, value));
            e.target.value = value.toFixed(2);
            slider.value = value;
            currentParams[param.name] = value;
        });
        
        // Initialize currentParams
        currentParams[param.name] = param.default;
        
        group.appendChild(label);
        group.appendChild(slider);
        group.appendChild(input);
        group.appendChild(unit);
        container.appendChild(group);
    });
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
        synthInstances[selectedName] = new Synths[selectedName](ctx);
    }
    
    return synthInstances[selectedName];
}

function playWithParams() {
    const synth = getCurrentSynth();
    if (!synth) return;
    synth.play(currentParams);
}

function playNote(freq) {
    const synth = getCurrentSynth();
    if (!synth) return;
    
    // Override freq param with note frequency
    const params = { ...currentParams, freq };
    synth.play(params);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    populateSynthSelector();
    
    // Listen for synth changes
    document.getElementById('synth-select').addEventListener('change', (e) => {
        loadSynthParameters(e.target.value);
    });
});

// Expose to global scope for onclick handlers
window.playWithParams = playWithParams;
window.playNote = playNote;