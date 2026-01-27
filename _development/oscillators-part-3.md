---
layout: post
title: "Oscillators — Part 3: Discontinuities and Aliasing"
date: 2026-01-17
last_modified_at: 2026-01-26
series: "Oscillators"
part: 3
published: true
permalink: /development/oscillators-part-3/
tags: [dsp, oscillator, synthesis, c++]
desc: "How waveform discontinuities produce aliasing in discrete-time oscillators, even when phase is handled correctly."
thumb: "/assets/images/thumbs/development/oscillator.jpg"
desmos: true
---

## After Phase

In Part 1, we built a naïve sine oscillator and handled the constraints of discrete time. Phase is now wrapped, bounded, and updated correctly.

Yet the oscillator still fails.

## Discontinuity

If everything about phase is handled correctly, any remaining instability must come from how phase is *used*, not how it is maintained.

When phase is mapped to an output, that mapping is not always smooth. Sine waves vary continuously, but many other waveforms do not. Sharp corners and jumps introduce discontinuities that discrete-time systems can only approximate.

## The Four Basic Waveforms

Below are mathematical representations and naïve C++ implementations of **sine**, **saw**, **square**, and **triangle** waves. This assumes a phase accumulator $$ p ∈ [0, 1) $$ and frequency $$ f $$ at sample rate $$ F_s $$.

### Shared Phase Accumulator

- Phase increment: 

$$ \Delta = \frac{f}{F_s} $$

- Phase update and wrap:

$$
p \leftarrow p + \Delta
$$

$$
\text{if } p \ge 1,\quad p \leftarrow p - 1
$$

```cpp
struct Phase {
    float p = 0.f;   // phase
    float dp = 0.f;  // phase increment

    void setFrequency(float f, float Fs) {
        dp = f / Fs;
    }

    float tick() {
        p += dp;
        if (p >= 1.f)
            p -= 1.f;
        return p;
    }
};
```

### Waveforms

#### Sine Wave:

$$
y(p) = \sin(2\pi p)
$$

```cpp
float sine(float p) {
    return std::sinf(2.f * float(M_PI) * p);
}
```
#### Sawtooth (rising):

$$
y(p) = 2p - 1
$$

```cpp
float saw(float p) {
    return 2.f * p - 1.f;
}
```

#### Square Wave (50% Duty Cycle):

$$
y(p) =
\begin{cases}
+1, & p < 0.5 \\
-1, & p \ge 0.5
\end{cases}
$$

```cpp
float square(float p) {
    return (p < 0.5f) ? 1.f : -1.f;
}
```

#### Triangle Wave:

$$
y(p) = 1 - 4\left|p - \tfrac{1}{2}\right|
$$

```cpp
float triangle(float p) {
    return 1.f - 4.f * std::fabs(p - 0.5f);
}
```

### Waveform Graph

<iframe src="https://www.desmos.com/calculator/qbolruq9da?embed" width="960" height="500" style="border: 1px solid #ccc" frameborder=0></iframe>

### Full Implementation

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

    void resetPhase(float p0 = 0.f) {
        phase.p = p0; // assume p0 in [0,1) for this naïve example
    }

    float tick() {
        const float p = phase.tick();
        switch (waveform) {
            case Waveform::Sine:     return sine(p);
            case Waveform::Saw:      return saw(p);
            case Waveform::Square:   return square(p);
            case Waveform::Triangle: return triangle(p);
        }
        return 0.f;
    }

private:
    // --- Phase accumulator ---
    struct Phase {
        float p = 0.f;   // phase
        float dp = 0.f;  // phase increment

        void setFrequency(float f, float Fs) { dp = f / Fs; }

        float tick() {
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

    void updatePhaseInc() {
        phase.setFrequency(f, Fs);
    }

    // Stored state
    Phase phase;
    Waveform waveform = Waveform::Sine;

    float f  = 440.f;
    float Fs = 48000.f;
};
```

## Spectral Consequences of Discontinuity

In discrete time, abrupt change becomes wideband energy. The sharper the transition, the broader the spectrum it demands. When that demand exceeds what the system can represent, the excess energy doesn’t disappear—it shows up where it doesn’t belong.

This problem—known as **aliasing**—is not a separate phenomenon, but the direct result of discontinuity in a finite system.[^smith]

Phase wrapping prevents unbounded growth. It does **not** remove sharp edges. A perfectly wrapped oscillator can still fail once discontinuities enter the picture.

## Aliasing

Once discontinuities exist, their consequences are unavoidable. A discrete-time system can only represent a finite range of frequencies. When a waveform demands energy beyond that range, the excess does not vanish.

Instead, it **folds back**.

As harmonics exceed the representable bandwidth, they reflect around the **Nyquist limit**: (`Fs / 2`), and reappear at lower frequencies. These components are no longer harmonically related to the fundamental. As the oscillator’s frequency increases, they move downward rather than upward, producing inharmonic structure that was never present in the original signal.[^j_smith]

This behavior is still fully deterministic. Nothing “random” is happening and nothing is numerically broken. The oscillator is behaving exactly as a finite system must when asked to represent sharp change.

Aliasing is therefore not "artifact polluting an otherwise correct oscillator." It is the inevitable spectral consequence of discontinuity colliding with the limitations of discrete time.

## Try It Out

Use the visualizer below to see and hear how different naïve oscillators alias as their frequency increases. The oscillator frequency sweep runs from 20 Hz to just under the sample rate, deliberately crossing the Nyquist limit.

<div class="applet applet--lg">
  <div class="applet__wrap">
    <iframe
      class="applet__frame"
      src="/applets/oscillator/p3/aliasing/aliasing.html"
      loading="lazy"
      title="Naive Oscillator Aliasing">
    </iframe>
  </div>
</div>

## What's Next

In the next article, we'll discuss antialiasing.

## Notes

[^j_smith]: Smith, Julian O. "Aliasing of Sampled Signals." *Mathematics of the Discrete Fourier Transform (DFT), with Audio Applications*. [https://ccrma.stanford.edu/~jos/st/Aliasing_Sampled_Signals.html](https://ccrma.stanford.edu/~jos/st/Aliasing_Sampled_Signals.html).

[^smith]: Smith, Steven W. "The Sampling Theorem." *The Scientist and Engineer's Guide to Digital Signal Processing*. [https://www.dspguide.com/ch3/2.htm](https://www.dspguide.com/ch3/2.htm).

[^oppenheim]: Oppenheim, Alan V., and Ronald W. Schafer. *Discrete-Time Signal Processing*. Pearson, 2010. [https://www.pearson.com/en-us/subject-catalog/p/Oppenheim-Discrete-Time-Signal-Processing-3rd-Edition/P200000003226](https://www.pearson.com/en-us/subject-catalog/p/Oppenheim-Discrete-Time-Signal-Processing-3rd-Edition/P200000003226).