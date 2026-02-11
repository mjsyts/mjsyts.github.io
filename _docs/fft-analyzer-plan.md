# FFT Analyzer Implementation Plan

## Context

Building a real-time FFT spectrum analyzer with:
- Custom FFT implementation using fft.js library (to utilize custom window functions)
- Multiple colored spectrum overlays using existing color token system
- Capture functionality to freeze and overlay up to 5 spectra
- Custom windowing functions (Hann, Hamming, Blackman, Rectangular)
- Frequency scale options (logarithmic/linear)
- User has existing AudioEngine that provides microphone input

## Critical Files

- `_tools/fft-analyzer/fft-analyzer.js` - Main implementation
- `_tools/fft-analyzer/index.html` - UI markup
- `assets/css/components/audio-tool.css` - Already has spectrum color tokens defined

## Color System (Already Exists)

The project already has spectrum colors defined in `audio-tool.css`:
```css
--spectrum-live: var(--blue);       /* #43A0BD */
--spectrum-capture-1: var(--coral); /* #DE8D74 */
--spectrum-capture-2: var(--aqua);  /* #6ABCD5 */
--spectrum-capture-3: var(--gold);  /* #D4990D */
--spectrum-capture-4: var(--green); /* #9FC353 */
--spectrum-capture-5: var(--indigo);/* #7191AF */
```

## Implementation Steps

### ✅ Step 1: Setup fft.js Library

**Install via NPM or use CDN:**
- Option A: `npm install fft.js` and import it
- Option B: Use CDN in HTML: `<script src="https://cdn.jsdelivr.net/npm/fft.js@latest/lib/fft.js"></script>`
- **Recommended**: Since this is a standalone tool with ES modules, import from a CDN using import maps or dynamic import

**In fft-analyzer.js**: Add import for FFT library

### ⬜ Step 2: Clean Up HTML

Remove the unnecessary "Input Source" button section (lines 27-31 in index.html):
```html
<!-- REMOVE THIS:
<section class="control-group">
    <label>Input Source</label>
    <div class="button-group">
        <button class="toggle-button active" data-source="mic">Microphone</button>
    </div>
</section>
-->
```

### ⬜ Step 3: Core FFT Methods

Add these methods to the `FFTAnalyzer` class:

**`start()`** - Begin animation loop
- Set `this.running = true`
- Start `requestAnimationFrame` loop calling `draw()`

**`stop()`** - Stop animation loop
- Set `this.running = false`
- Cancel animation frame with `cancelAnimationFrame`

**`performFFT()`** - Execute FFT pipeline
1. Get time-domain data: `this.audio.getTimeData()`
2. Apply window function: `this.applyWindow(timeData)` (already implemented)
3. Perform FFT using fft.js on windowed data
4. Compute magnitude spectrum from complex FFT output
5. Apply smoothing if needed
6. Return magnitude array

**`draw()`** - Main render loop
1. Clear canvas
2. Get current spectrum via `performFFT()`
3. Draw captured overlays (if any) using their assigned colors
4. Draw live spectrum using `--spectrum-live` color
5. Request next frame if still running

### ⬜ Step 4: Spectrum Visualization

**`drawSpectrum(magnitudes, color, alpha)`** helper method:
- Convert magnitude data to dB scale: `20 * Math.log10(magnitude)`
- Apply frequency scale (log or linear based on `this.frequencyScale`)
- Apply frequency range filter (based on selected range)
- Draw spectrum line/fill on canvas
- Use provided color with alpha transparency

**Frequency scaling:**
- Logarithmic: Map frequency bins logarithmically across canvas width (more space for low frequencies)
- Linear: Even spacing of frequency bins

**Frequency ranges** (based on HTML select options):
- Full: 20 Hz - 20 kHz
- Musical: 50 Hz - 5 kHz (default)
- Sub: 20 Hz - 200 Hz
- Custom: User-defined (future enhancement)

### ⬜ Step 5: Capture Functionality

**`captureSpectrum()`** method:
1. Get current spectrum data via `performFFT()`
2. Create capture object:
   ```js
   {
     data: magnitudes,
     color: this.getNextCaptureColor(),
     timestamp: Date.now(),
     visible: true
   }
   ```
3. Add to `this.captures` array (max 5)
4. Update captured list UI with color indicator

**`getNextCaptureColor()`** helper:
- Return next color from capture color sequence (coral, aqua, gold, green, indigo)
- Cycle through colors for captures 1-5

**`removeCapturedSpectrum(index)`** method:
- Remove from `this.captures` array
- Update UI

**`toggleCaptureVisibility(index)`** method:
- Toggle `visible` flag for overlay rendering

### ⬜ Step 6: UI Event Handlers

Wire up all control interactions at initialization:

**Frequency Scale buttons** (`data-scale="log"` / `data-scale="linear"`):
- Update `this.frequencyScale`
- Toggle button active states

**Frequency Range select** (`#freq-range`):
- Update frequency range filter
- Redraw

**Window Function select** (`#window-select`):
- Update `this.windowType` property
- Available: 'blackman', 'hann', 'hamming', 'rectangular'

**Smoothing slider** (`#smoothing`):
- Convert 0-90 range to 0.0-0.9
- Update `this.smoothing` property
- Update display span (`#smoothing-display`)

**Capture button** (`#capture-button`):
- Call `captureSpectrum()` when clicked

**Captured list items**:
- Click to toggle visibility
- Delete button to remove

### ⬜ Step 7: Canvas Drawing Details

**Color usage:**
- Live spectrum: Use `getComputedStyle(document.documentElement).getPropertyValue('--spectrum-live')` to get CSS variable
- Captured overlays: Use `--spectrum-capture-1` through `--spectrum-capture-5`
- Convert to rgba with appropriate alpha (0.6 for overlays, 0.8 for live)

**Drawing style:**
- Use `ctx.beginPath()` and `ctx.lineTo()` for spectrum line
- Optional: Fill under curve with gradient
- Line width: 2-3px for clarity
- Anti-aliasing enabled

**Canvas coordinate system:**
- Account for device pixel ratio (already handled in `resizeCanvas()`)
- X-axis: frequency (with log or linear scale)
- Y-axis: magnitude in dB (0 dB at top, -60 or -80 dB at bottom)

## Verification Steps

1. **Test microphone input**: Click "Initialize Audio" and verify mic access granted
2. **Test live spectrum**: Should see real-time frequency response (try whistling or playing music)
3. **Test window functions**: Switch between window types and verify visual changes
4. **Test frequency scales**: Toggle log/linear and verify scaling changes
5. **Test captures**:
   - Capture a spectrum and verify it appears with correct color
   - Capture up to 5 spectra and verify color cycling
   - Toggle visibility of captured spectra
   - Remove captured spectra
6. **Test smoothing**: Adjust slider and verify smoothing effect
7. **Test frequency ranges**: Switch between Full, Musical, and Sub ranges
8. **Test responsiveness**: Resize browser and verify canvas scales properly

## Implementation Order (Recommended)

Work in this sequence for incremental testing:

1. **Setup**: Add fft.js import, clean HTML
2. **Basic FFT**: Implement `performFFT()` to get magnitude data working
3. **Basic rendering**: Implement simple `draw()` to show live spectrum (single color, no fancy scaling)
4. **Frequency scaling**: Add log/linear scale conversion
5. **UI controls**: Wire up window function, smoothing, scale toggles
6. **Captures**: Implement capture system with colors and overlays
7. **Polish**: Add frequency range filtering, better styling, axis labels

## Notes

- The `applyWindow()` method is already correctly implemented in the class
- AudioEngine already handles microphone initialization and provides `getTimeData()`
- Color system is already established in CSS - just reference the CSS variables
- Maximum 5 captures enforced by `this.maxCaptures = 5`

---

**Track your progress**: Check off steps with ✅ as you complete them!
