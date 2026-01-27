---
layout: post
title: "Oscillators — Part 4: Antialiasing"
date: 2026-01-21
last_modified_at: 2026-01-27
series: "Oscillators"
part: 4
published: false
permalink: /development/oscillators-part-4/
tags: [dsp, oscillator, synthesis, c++]
desc: "An introduction to oscillator antialiasing through BLEP/PolyBLEP."
thumb: "/assets/images/thumbs/development/oscillator.jpg"
---

## Recap

Even with perfectly managed phase, digital audio cannot represent arbitrarily fast change. A discontinuity has infinite bandwidth, and sampling it forces all energy above Nyquist to reappear at lower frequencies as **aliasing**.

This article will discuss antialiasing using **b**and**l**imited st**ep** (**BLEP**). Other antialiasing techniques will be covered in a separate series.

## Bandlimiting

In digital audio, a signal is **bandlimited** when it contains no frequency content above the Nyquist limit, and therefore no energy that can alias. **Bandlimiting** is the process of shaping a waveform or correction signal so that all of its spectral content remains below the Nyquist limit.

## BLEP

Under the Nyquist limit, discontinuities are the root cause of aliasing. Our [naïve sine oscillator from part 3 of the series]({% link _development/oscillators-part-3.md %}#try-it-out "Oscillator sweep demo") has no overtones, so it only begins to alias when the fundamental frequency itself approaches the Nyquist limit.

A saw wave includes a single discontinuity each period when the waveform jumps from high to low. A square wave does the same, with an additional jump back up. Triangle waves contain direction discontinuities at the peak and trough — points where the slope flips sign. These are much gentler than the hard edges of a saw or square, but they still introduce high‑frequency content.

BLEP removes aliasing by smoothing the waveform only at these discontinuities, leaving the rest of the cycle untouched.

## Tables Vs Polynomials

Transcendental functions such as `cos()`, `sin()`, and `tanh()` are relatively expensive to evaluate compared to basic arithmetic. Digital synthesis mitigates this by generating periodic functions either by **lookup table** (precomputed values stored in memory) or by **polynomial approximation** (values are computed on the fly using only multiplication and addition).  

BLEP techniques follow the same idea:
- **MinBLEP** uses a table
- **PolyBLEP** uses a polynomial approximation

The underlying correction is the same — the difference is whether values are stored or computed.

<!-- ### MinBLEP

With **min**imum-phase **b**and**l**imited st**ep** (**MinBLEP**), we smooth a discontinuity by adding a short, precomputed bandlimited transition wherever the waveform jumps. The correction is stored in a lookup table and simply added into the signal at the moment of the discontinuity.[^brandt]

“Minimum‑phase” means the transition is arranged to occupy the smallest practical time window, keeping the correction localized and efficient. -->

## PolyBLEP

A **poly**nomial **b**and**l**imited st**ep** (**PolyBLEP**) replaces a discontinuity with a tiny smoothing curve computed directly from the oscillator’s phase. The idea is simple: whenever the waveform jumps, we add a short, smoothed curve that removes the infinitely sharp edge.[^valimaki] The oscillator remains naïve everywhere else, so we can easily integrate it directly in the oscillator class we built in [part 3 of the series]({% link _development/oscillators-part-3.md %}#full-implementation "Naïve oscillator class implementation").

PolyBLEP adds a short polynomial correction centered on the discontinuity. Below, we will implement **2nd-order PolyBLEP**, which modifies two samples: one before and one after the wrap point.

## Fractional Delay

The discontinuity doesn't happen *exactly* at a sample point — it happens somewhere *between* two consecutive samples.
Phase wraps from ~1.0 back to ~0.0 each cycle. Right after that wrap, the **fractional delay** `d` can be calculated:

```
d = phase / phaseIncrement
```

This value ranges from 0 to 1 and represents where within the sample interval the discontinuity occurred. For example, if `d = 0.2`, the wrap happened 20% of the way into the interval. If `d = 0.8`, it happened 80% of the way through. This fractional position determines how the correction is shaped.

## The Correction Polynomial

We use `d` to compute the two values that need to be corrected:

- The sample **before** the discontinuity: 

$$ \frac{d^2}{2} $$

- The sample **after** the discontinuity: 

$$ \frac{d^2}{2} + d - \frac{1}{2} $$

These quadratic expressions are derived from integrated linear interpolation (see Table I in Välimäki et al.[^valimaki]). They create a smooth, bandlimited transition that cancels the discontinuity's energy above Nyquist while keeping the correction localized to just two samples.

## Implementation

The correction polynomial can be implemented like so:

```cpp
float polyBlepBefore(float d) {
    return d * d / 2.f;
}

float polyBlepAfter(float d) {
    return d * d / 2.f + d - 0.5f;
}
```

## Notes

<!-- [^brandt]: Brandt, Eli. *Hard Sync Without Aliasing*. Carnegie Mellon University. [https://www.cs.cmu.edu/~eli/papers/icmc01-hardsync.pdf](https://www.cs.cmu.edu/~eli/papers/icmc01-hardsync.pdf) -->
[^valimaki]: Välimäki, Vesa, Jussi Pekonen, & Juhan Nam. "Perceptually informed synthesis of bandlimited classical waveforms using integrated polynomial interpolation." *Journal of the Acoustical Society of America*. Acoustical Society of America, 2012. [https://mac.kaist.ac.kr/pubs/ValimakiPeknenNam-jasa2012.pdf](https://mac.kaist.ac.kr/pubs/ValimakiPeknenNam-jasa2012.pdf)