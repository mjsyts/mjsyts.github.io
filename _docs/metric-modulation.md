# Metric Modulation Calculator - Build Guide

## Project Overview
Building an interactive metric modulation calculator with Web Audio API synthesis for playback.

## Web Audio Synth Design

### Audio Synthesis Approach
Yes, Web Audio API is perfect for this. You can create all the needed sounds programmatically without external files.

### Planned Sounds

#### 1. **Sine Beep** (Tempo reference tone)
- Simple sine oscillator
- ~1000Hz frequency
- Short envelope (50-100ms attack, quick release)
- Volume: moderate to not mask other sounds

#### 2. **808-style Hi-Hat** (Beat marker)
- Pink/white noise generator
- High-pass filter (~7-10kHz)
- Very short decay (50-80ms)
- Volume: slightly quieter than beep

#### 3. **BPF Noise Woodblock** (Accent/note reference)
- Noise generator
- Band-pass filter (~2-4kHz center)
- Decay envelope (~100-150ms)
- Could add slight pitch envelope for character

#### 4. **Rimshot** (Percussion accent)
- Similar to woodblock but:
  - Higher frequency (~4-6kHz center)
  - Shorter decay (~60-80ms)
  - Could be same synth with different filter settings
  - OR simplified as high-frequency click with quick decay

---

## Build Phases

### Phase 1: Core Calculator Logic
- [ ] Input validation (numeric fields, relationships)
- [ ] Tempo ratio calculations
- [ ] Display calculations (cents, frequency ratios, etc.)
- [ ] Error handling and feedback

### Phase 2: Web Audio Foundation
- [ ] AudioContext initialization
- [ ] Utility functions:
  - [ ] Play sine tone (frequency, duration, volume)
  - [ ] Play noise (duration, volume)
  - [ ] Create band-pass filter node
  - [ ] Create high-pass filter node
  - [ ] Envelope generator (ADSR helper)

### Phase 3: Synth Implementations
- [ ] Sine beep synth
- [ ] Hi-hat synth (noise + HP filter)
- [ ] Woodblock synth (noise + BP filter)
- [ ] Rimshot synth (noise + HP filter variant OR shared code)

### Phase 4: UI Integration
- [ ] Play buttons for each reference sound
- [ ] Play button for tempo click pattern
- [ ] Volume/balance controls
- [ ] Synth parameter tweaking (optional UI)

### Phase 5: Polish
- [ ] Visual feedback on plays
- [ ] Disable buttons during playback
- [ ] Responsive design
- [ ] Testing on different browsers/devices

---

## Current File Structure

```
_tools/metric-modulation.html          (container/page)
assets/js/tools/metric-modulation.js   (logic + synths)
assets/css/tools/                      (styling, if needed)
```

---

## Implementation Strategy

### Start with: Core Calculator Math
Why? It's the foundation—audio is flavor on top.

**Steps:**
1. Parse input values from HTML form
2. Validate relationships (source/target, tempi)
3. Calculate: modulation ratio, cents deviation, frequency mapping
4. Display results clearly

### Then: Web Audio Initialization
Create a manager class that:
- Initializes AudioContext once
- Holds utility methods for all synth playbacks
- Handles timing/scheduling

### Then: Individual Synths
Each synth is a method that:
- Takes params (frequency, duration, etc.)
- Creates nodes
- Connects them
- Starts playback
- Returns promise or callback when done

### Finally: UI Hooks
Wire up buttons to synth methods and calculator.

---

## Questions to Answer Before Building

1. Should synths be adjustable via UI, or baked-in constants?
2. Do you want a "click pattern" button that plays the modulation in time?
3. Should there be visual feedback (waveform, spectrum) or just audio?
4. Any target browsers/devices to support?

---

## Progress Tracker

- Phase: Not started
- Last updated: 2026-02-12
