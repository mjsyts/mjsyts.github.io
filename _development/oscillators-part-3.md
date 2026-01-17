---
layout: post
title: "Oscillators — Part 3: Discontinuities and Aliasing"
date: 2026-01-14
last_modified_at: 2026-01-17
series: "Oscillators"
part: 3
published: false
tags: [dsp, oscillator, synthesis, c++]
permalink: /development/oscillators-part-3/
desc: "DESC_PLACEHOLDER"
thumb: "/assets/images/thumbs/development/oscillator.webp"
---

## After Phase

In Part 1, we built a naïve sine oscillator and handled the constraints of discrete time. Phase is now wrapped, bounded, and updated correctly.

Yet the oscillator still fails.

## Discontinuity

If everything about phase is handled correctly, any remaining instability must come from how phase is *used*, not how it is maintained.

When phase is mapped to an output, that mapping is not always smooth. Sine waves vary continuously, but many other waveforms do not. Sharp corners and jumps introduce discontinuities that discrete-time systems can only approximate.

In discrete time, abrupt change becomes wideband energy. The sharper the transition, the broader the spectrum it demands. When that demand exceeds what the system can represent, the excess energy doesn’t disappear—it shows up where it doesn’t belong.

This problem—known as **aliasing**—is not a separate phenomenon, but the direct result of discontinuity in a finite system.

Phase wrapping prevents unbounded growth. It does **not** remove sharp edges. A perfectly wrapped oscillator can still fail once discontinuities enter the picture.

## Aliasing

Once discontinuities exist, their consequences are unavoidable. A discrete-time system can only represent a finite range of frequencies. When a waveform demands energy beyond that range, the excess does not vanish.

Instead, it **folds back**.

As harmonics exceed the representable bandwidth, they reflect around **Nyquist limit**: (`Fs / 2`), and reappear at lower frequencies. These components are no longer harmonically related to the fundamental. As the oscillator’s frequency increases, they move downward rather than upward, producing inharmonic structure that was never present in the original signal.

This behavior is still fully deterministic. Nothing “random” is happening. Nothing is numerically broken. The oscillator is behaving exactly as a finite system must when asked to represent sharp change.

Aliasing is therefore not "artifact polluting an otherwise correct oscillator." It is the inevitable spectral consequence of discontinuity colliding with the limitations of discrete time.