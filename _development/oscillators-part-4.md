---
layout: post
title: "Oscillators — Part 4: Antialiasing"
date: 2026-01-29
last_modified_at: 2026-01-29
series: "Oscillators"
part: 4
published: true
permalink: /development/oscillators-part-4/
tags: [dsp, oscillator, synthesis, c++, antialiasing, polyblep, blep]
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

### Adding a PolyBLEP Toggle

We will add `bool polyBLEP` as a private member variable with a public setter:

```cpp
class Oscillator{
public:
    //...
    void setPolyBlep(bool enabled){
        polyBlep = enabled;
    }
private:
    bool polyBlep = false;
}
```

### The Buffer Problem

At this point a problem becomes apparent: the correction must be applied to the sample before the discontinuity, but by the time the wrap is detected, that sample has already been output. We cannot retroactively correct an output sample.

The solution is to buffer the output by one sample. This allows the correction to be applied *before* the value is returned.

### Tracking Phase History

To detect discontinuities, the `Phase` struct must track the previous phase value.

```cpp
struct Phase {
    float p = 0.f;      // phase
    float prev = 0.f;   // previous phase <-THIS IS NEW
    float dp = 0.f;     // phase increment

    // ...
    
    float tick() {
        prev = p;       // store before updating
        p += dp;
        if (p >= 1.f)
            p -= 1.f;
        return p;
    }
};
```

### Correction Functions

The correction polynomial can be implemented like so:

```cpp
float polyBlepBefore(float d) {
    return d * d / 2.f;
}

float polyBlepAfter(float d) {
    return d * d / 2.f + d - 0.5f;
}
```

<p style="font-style: italic;">
**Triangle waves require a different correction due to their derivative discontinuities and are not covered in this article.
</p>

### Detection Functions

Discontinuities must be detected by comparing phase before and after each update.

The **wrap** can be detected when phase decreases:

```cpp
bool detectWrap(float phaseBefore, float phaseAfter) {
    return phaseBefore > phaseAfter;
}
```

**Threshold crossings** can be detected when phase rises past a specific value:

```cpp
bool detectRisingEdge(float phaseBefore, float phaseAfter, float threshold) {
    return phaseBefore < threshold && phaseAfter >= threshold;
}
```

When a discontinuity is detected, the fractional delay `d` must be calculated to determine where within the sample interval it occurred. The detection functions can be modified to calculate and return this value.

```cpp
// d is passed by reference (&) so the function can set its value
bool detectWrap(float phaseBefore, float phaseAfter, float& d) {
    if (phaseBefore > phaseAfter) {
        d = phaseAfter / phase.dp;  // calculate fractional delay
        return true;
    }
    return false;
}

bool detectRisingEdge(float phaseBefore, float phaseAfter, float threshold, float& d) {
    if (phaseBefore < threshold && phaseAfter >= threshold) {
        d = (phaseAfter - threshold) / phase.dp;  // calculate fractional delay
        return true;
    }
    return false;
}
```

### Modified `tick()` Function

The modified `tick()` method in the `Oscillator` class generates the naïve sample, detects discontinuities, applies corrections, and buffers the output.

We only need to detect discontinuities and apply the correction when `polyBlep = true`. We can add this conditional block to the function:

```cpp
if (polyBlep) {
    float d;
    
    // Detect and correct wrap (saw and square)
    if (detectWrap(phase.prev, p, d)) {
        if (waveform == Waveform::Saw || waveform == Waveform::Square) {
            previousSample += polyBlepBefore(d);
            currentSample += polyBlepAfter(d);
        }
    }
    
    // Detect and correct 0.5 crossing (square only)
    if (waveform == Waveform::Square) {
        if (detectRisingEdge(phase.prev, p, 0.5f, d)) {
            previousSample -= polyBlepBefore(d);
            currentSample -= polyBlepAfter(d);
        }
    }
}
```

Since the PolyBLEP oscillator needs a single-sample buffer, we should apply the buffer to *all* of the oscillator types, not just the PolyBLEP. This will go at the end of the `tick()` function:

```cpp
// Return buffered sample and store current for next iteration
float output = previousSample;
previousSample = currentSample;
return output;
```

So the full `tick()` function looks like this:

```cpp
float tick() {
    const float p = phase.tick();
    
    // Generate naïve sample
    float currentSample;
    switch (waveform) {
        case Waveform::Sine:     currentSample = sine(p); break;
        case Waveform::Saw:      currentSample = saw(p); break;
        case Waveform::Square:   currentSample = square(p); break;
        case Waveform::Triangle: currentSample = triangle(p); break;
        default: currentSample = 0.f;
    }
    
    // Apply PolyBLEP correction
    if (polyBlep) {
        float d;
        
        // Detect and correct wrap (saw and square)
        if (detectWrap(phase.prev, p, d)) {
            if (waveform == Waveform::Saw || waveform == Waveform::Square) {
                previousSample += polyBlepBefore(d);
                currentSample += polyBlepAfter(d);
            }
        }
        
        // Detect and correct 0.5 crossing (square only)
        if (waveform == Waveform::Square) {
            if (detectRisingEdge(phase.prev, p, 0.5f, d)) {
                previousSample -= polyBlepBefore(d);
                currentSample -= polyBlepAfter(d);
            }
        }
    }
    
    // Return buffered sample and store current for next iteration
    float output = previousSample;
    previousSample = currentSample;
    return output;
}
```

## Full Implementation

Here's the full `Oscillator` class with 2nd-order PolyBLEP:

```cpp
#pragma once
#include <cmath>

class Oscillator {
public:
    enum class Waveform { Sine, Saw, Square, Triangle };

    void setSampleRate(float sampleRate) {
        Fs = sampleRate;
        updatePhaseInc();
    }

    void setFrequency(float frequency) {
        f = frequency;
        updatePhaseInc();
    }

    void setWaveform(Waveform w) {
        waveform = w;
    }

    void setPolyBlep(bool enabled) {
        polyBlep = enabled;
    }

    void resetPhase(float p0 = 0.f) {
        phase.p = p0; // assume p0 in [0,1) for this naïve example
    }

    float tick() {
        const float p = phase.tick();
        
        // Generate naïve sample
        float currentSample;
        switch (waveform) {
            case Waveform::Sine:     currentSample = sine(p); break;
            case Waveform::Saw:      currentSample = saw(p); break;
            case Waveform::Square:   currentSample = square(p); break;
            case Waveform::Triangle: currentSample = triangle(p); break;
            default: currentSample = 0.f;
        }
        
        // Apply PolyBLEP correction
        if (polyBlep) {
            float d;
            
            // Detect and correct wrap (saw and square)
            if (detectWrap(phase.prev, p, d)) {
                if (waveform == Waveform::Saw || waveform == Waveform::Square) {
                    previousSample += polyBlepBefore(d);
                    currentSample += polyBlepAfter(d);
                }
            }
            
            // Detect and correct 0.5 crossing (square only)
            if (waveform == Waveform::Square) {
                if (detectRisingEdge(phase.prev, p, 0.5f, d)) {
                    previousSample -= polyBlepBefore(d);
                    currentSample -= polyBlepAfter(d);
                }
            }
        }
        
        // Return buffered sample and store current for next iteration
        float output = previousSample;
        previousSample = currentSample;
        return output;
    }

private:
    // --- Phase accumulator ---
    struct Phase {
        float p = 0.f;      // phase
        float prev = 0.f;   // previous phase
        float dp = 0.f;     // phase increment

        void setFrequency(float f, float Fs) { dp = f / Fs; }

        float tick() {
            prev = p;
            p += dp;
            if (p >= 1.f) p -= 1.f;
            return p;
        }
    };

    // --- Waveforms (naïve / band-unlimited) ---
    static float sine(float p) {
        return std::sinf(2.f * float(M_PI) * p);
    }

    static float saw(float p) {
        return 2.f * p - 1.f;
    }

    static float square(float p) {
        return (p < 0.5f) ? 1.f : -1.f;
    }

    static float triangle(float p) {
        return 1.f - 4.f * std::fabs(p - 0.5f);
    }

    static float polyBlepBefore(float d) {
        return d * d / 2.f;
    }

    static float polyBlepAfter(float d) {
        return d * d / 2.f + d - 0.5f;
    }

    bool detectWrap(float phaseBefore, float phaseAfter, float& d) {
        if (phaseBefore > phaseAfter) {
            d = phaseAfter / phase.dp;  // calculate fractional delay
            return true;
        }
        return false;
    }

    bool detectRisingEdge(float phaseBefore, float phaseAfter, float threshold, float& d) {
        if (phaseBefore < threshold && phaseAfter >= threshold) {
            d = (phaseAfter - threshold) / phase.dp;  // calculate fractional delay
            return true;
        }
        return false;
    }

    void updatePhaseInc() {
        phase.setFrequency(f, Fs);
    }

    // Stored state
    Phase phase;
    Waveform waveform = Waveform::Sine;

    float f  = 440.f;
    float Fs = 48000.f;
    float previousSample = 0.f;
    bool polyBlep = false;
};
```

## Try It Out

The applet below demonstrates 2nd-order PolyBLEP antialiasing. Toggle PolyBLEP on and off while sweeping to hear the difference in aliasing suppression.

<div class="applet applet--lg">
  <div class="applet__wrap">
    <iframe
      class="applet__frame"
      src="/applets/oscillator/p4/aliasing/aliasing.html"
      loading="lazy"
      title="polyBLEP oscillator aliasing">
    </iframe>
  </div>
</div>

## What's Next

This concludes the oscillator series. We've built a complete phase accumulator model, addressed numerical stability, identified aliasing as the consequence of discontinuity, and implemented 2nd-order PolyBLEP antialiasing for saw and square waves.
Several topics remain outside the scope of this series: higher-order PolyBLEP corrections, the triangle wave antialiasing (which requires integrated PolyBLEP due to derivative discontinuities), MinBLEP, and alternative antialiasing approaches such as oversampling. These techniques will be addressed in future articles.

## Further Reading

- [FAUST PolyBLEP Oscillator Library](https://faustlibraries.grame.fr/libs/oscillators/#polyblep-based-oscillators)
- [Martin Finke's PolyBLEP Oscillator Tutorial](https://www.martin-finke.de/articles/audio-plugins-018-polyblep-oscillator/)

## Notes

<!-- [^brandt]: Brandt, Eli. *Hard Sync Without Aliasing*. Carnegie Mellon University. [https://www.cs.cmu.edu/~eli/papers/icmc01-hardsync.pdf](https://www.cs.cmu.edu/~eli/papers/icmc01-hardsync.pdf) -->
[^valimaki]: Välimäki, Vesa, Jussi Pekonen, & Juhan Nam. "Perceptually informed synthesis of bandlimited classical waveforms using integrated polynomial interpolation." *Journal of the Acoustical Society of America*. Acoustical Society of America, 2012. [https://mac.kaist.ac.kr/pubs/ValimakiPeknenNam-jasa2012.pdf](https://mac.kaist.ac.kr/pubs/ValimakiPeknenNam-jasa2012.pdf)
