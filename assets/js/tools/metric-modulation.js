// metric-modulation.js

class MetricModulationCalculator {
    constructor() {
        this.direction = 'forward';
        this.initElements();
        this.attachListeners();
        this.calculate();
    }
    
    initElements() {
        // Direction toggle
        this.forwardButton = document.querySelector('[data-direction="forward"]');
        this.reverseButton = document.querySelector('[data-direction="reverse"]');
        
        // Old/Starting tempo inputs
        this.oldTempoInput = document.getElementById('old-tempo');
        this.oldBaseNoteSelect = document.getElementById('old-base-note');
        this.oldTupletSelect = document.getElementById('old-tuplet');
        this.oldNumeratorInput = document.getElementById('old-numerator');
        this.oldDenominatorInput = document.getElementById('old-denominator');
        this.oldIrrationalCheck = document.getElementById('old-irrational');
        this.oldBarsInput = document.getElementById('old-bars');
        
        // Modulation inputs
        this.modOldCountInput = document.getElementById('mod-old-count');
        this.modOldSubdivisionSelect = document.getElementById('mod-old-subdivision');
        this.modOldTupletSelect = document.getElementById('mod-old-tuplet');
        this.modNewCountInput = document.getElementById('mod-new-count');
        this.modNewSubdivisionSelect = document.getElementById('mod-new-subdivision');
        this.modNewTupletSelect = document.getElementById('mod-new-tuplet');
        
        // New tempo inputs
        this.newTempoInput = document.getElementById('new-tempo');
        this.newBaseNoteSelect = document.getElementById('new-base-note');
        this.newTupletSelect = document.getElementById('new-tuplet');
        this.newNumeratorInput = document.getElementById('new-numerator');
        this.newDenominatorInput = document.getElementById('new-denominator');
        this.newIrrationalCheck = document.getElementById('new-irrational');
        this.newBarsInput = document.getElementById('new-bars');
        
        // Display elements
        this.newTempoDisplay = document.getElementById('new-tempo-value');
        this.oldNoteSymbol = document.getElementById('old-note-symbol');
        this.newNoteSymbol = document.getElementById('new-note-symbol');
        
        // Audio controls
        this.playButton = document.getElementById('play-preview');
        this.stopButton = document.getElementById('stop-preview');
        this.clickSoundSelect = document.getElementById('click-sound');
    }
    
    attachListeners() {
        // Direction toggle
        this.forwardButton.addEventListener('click', () => {
            this.direction = 'forward';
            this.forwardButton.classList.add('active');
            this.reverseButton.classList.remove('active');
            this.calculate();
        });
        
        this.reverseButton.addEventListener('click', () => {
            this.direction = 'reverse';
            this.reverseButton.classList.add('active');
            this.forwardButton.classList.remove('active');
            this.calculate();
        });
        
        // Old tempo inputs
        this.oldTempoInput.addEventListener('input', () => this.calculate());
        this.oldBaseNoteSelect.addEventListener('change', () => this.calculate());
        this.oldTupletSelect.addEventListener('change', () => this.calculate());
        this.oldNumeratorInput.addEventListener('input', () => this.calculate());
        this.oldDenominatorInput.addEventListener('input', () => this.calculate());
        this.oldIrrationalCheck.addEventListener('change', () => this.calculate());
        this.oldBarsInput.addEventListener('input', () => this.calculate());
        
        // Modulation inputs
        this.modOldCountInput.addEventListener('input', () => this.calculate());
        this.modOldSubdivisionSelect.addEventListener('change', () => this.calculate());
        this.modOldTupletSelect.addEventListener('change', () => this.calculate());
        this.modNewCountInput.addEventListener('input', () => this.calculate());
        this.modNewSubdivisionSelect.addEventListener('change', () => this.calculate());
        this.modNewTupletSelect.addEventListener('change', () => this.calculate());
        
        // New tempo inputs
        this.newTempoInput.addEventListener('input', () => this.calculate());
        this.newBaseNoteSelect.addEventListener('change', () => this.calculate());
        this.newTupletSelect.addEventListener('change', () => this.calculate());
        this.newNumeratorInput.addEventListener('input', () => this.calculate());
        this.newDenominatorInput.addEventListener('input', () => this.calculate());
        this.newIrrationalCheck.addEventListener('change', () => this.calculate());
        this.newBarsInput.addEventListener('input', () => this.calculate());
        
        // Gap duration display
        this.gapDurationInput.addEventListener('input', () => {
            const gap = parseFloat(this.gapDurationInput.value);
            this.gapDisplay.textContent = gap === 1 ? '1 second' : `${gap} seconds`;
        });
    }
    
    calculateDenominator(base, tuplet) {
        // If not a tuplet (tuplet === 1), just return base
        if (tuplet === 1) return base;
        
        // Tuplet formula: base × (tuplet / (tuplet - 1))
        // e.g., quarter triplet: 4 × (3/2) = 6
        return base * tuplet / (tuplet - 1);
    }
    
    calculate() {
        // TODO: Implement the modulation calculation
        // Read all values, do the math, update display
        
        // Placeholder for now
        console.log('Calculate called');
    }
    
    updateNotationDisplay() {
        // VexFlow rendering (add later)
    }
}

// Initialize when audio is ready
document.getElementById('init-button').addEventListener('click', () => {
    // TODO: Audio context setup
    const calculator = new MetricModulationCalculator();
});