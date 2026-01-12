---
layout: post
title: "Oscillators — Part 1: Oscillators in Discrete Time"
date: 2025-01-12
series: "Oscillators"
part: 1
tags: [dsp, oscillator, synthesis, webaudio, c++]
excerpt: "EXCERPT_PLACEHOLDER"
---

## Motivation and Scope
This series is about digital oscillators—not as sound sources, but as algorithms operating under discrete-time constraints. Oscillators are often treated as trivial components, yet generating a repeating signal sample by sample is already a nontrivial problem. The underlying theme of these articles is:

***The oscillator is the smallest system in which the fundamental constraints of discrete-time audio already apply.***

Part 1 focuses on establishing the basic model. Later posts address specific implementation strategies, aliasing, bandlimiting, and oversampling.

## Discrete Time as a Constraint
- Audio as a sequence of samples
- Sample index `n` and sample rate `Fs`
- No intermediate time values
- Emphasize:
  - This is a constraint on *generation*, not playback
  - All behavior must be defined sample-by-sample

---

## 3. What It Means to Oscillate
- What does *not* produce sustained sound:
  - Constant signals
  - One-shot transients
  - Unconstrained randomness
- Why repetition is necessary
- Periodicity as a requirement, not a stylistic choice

---

## 4. Period and Frequency (Minimal Treatment)
- Period defined in samples
- Frequency as a derived quantity:
  - `f = Fs / N`
- Note:
  - Finite frequency resolution
  - Not all frequencies are exactly representable
- Avoid pitch or musical notation here

---

## 5. State and Phase
- Why repetition requires memory
- Oscillators as stateful systems
- Phase as “position within a cycle”
- Normalized phase range `[0, 1)`

---

## 6. The Phase Accumulator Model
- Incremental phase update
- Phase increment as frequency control
- Wrap-around behavior
- Emphasize:
  - This model is waveform-agnostic
  - Phase advancement *is* the oscillator

---

## 7. From Phase to Signal
- Waveforms as functions of phase
- Sine as the smooth baseline
- Briefly mention other waveforms without exploring them
- Stress:
  - The oscillator is not the waveform

---

## 8. A Minimal Naïve Oscillator
- Sketch a minimal implementation (pseudocode or C++)
- Show:
  - Phase variable
  - Increment
  - Wrap
  - `sin()` mapping
- Emphasize:
  - This works
  - This is intentionally naïve

---

## 9. What This Ignores (For Now)
- Aliasing
- Numerical precision and drift
- Modulation and parameter changes
- Bandwidth limitations

Make it explicit that these are deferred, not forgotten.

---

## 10. Where the Series Goes Next
- Phase error and accumulation issues
- Naïve waveforms breaking
- Multiple sine oscillator implementations
- Bandlimiting and oversampling

Set expectations without previewing solutions.
