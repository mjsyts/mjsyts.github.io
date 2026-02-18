---
layout: post
title: "Filters — Part 2: One Pole and Frequency Response"
date: 2026-02-17
last_modified_at: 2026-02-17
series: "Filters"
part: 2
published: false
permalink: /development/filters-part-2/
tags: [dsp, filter, webaudio, synthesis, c++]
desc: "Building a one-pole filter and understanding frequency response."
thumb: "/assets/images/thumbs/development/filter.jpg"
---

## Where We Left Off

In Part 1, we established the **frequency domain** as a way of viewing signals. The **Fourier transform** decomposes a signal into its frequency components, showing which frequencies are present and how loud they are.

A **filter** modifies this frequency spectrum. It removes some frequencies, emphasizes others, and leaves the rest unchanged. In this article, we'll build an actual filter and see how it shapes frequency content.

## The Simplest Filter

A **one-pole filter** is the simplest type of digital filter and is implemented as:

`y[n] = x[n] + a * y[n-1]`

- `x[n]` — current input sample
- `y[n-1]` — previous output sample
- `a` — coefficient between -1 and 1

Each output is the current input plus the previous output scaled by `a`.

<div class="applet applet--sm"> 
    <iframe class="applet__frame" src="/applets/filter/p2/impulse-response/index.html" loading="lazy"></iframe>
</div> 

Try moving the coefficient and watch what happens to the output.

## What's Happening

When `a` is **positive**, each output blends in the previous output — feedback that reinforces slow-moving signals and smooths out fast ones. Low frequencies pass through while high frequencies are attenuated. This is a **lowpass filter**.

When `a` is **negative**, the feedback flips sign — it works against slow-moving signals and reinforces fast ones. High frequencies pass through while low frequencies are attenuated. This is a **highpass filter**.

At `a = 0`, no feedback is added and no filtering happens. As `|a|` approaches 1, the effect becomes more pronounced.

## Impulse Response and LTI

What the applet is showing is the filter's **impulse response** — what the filter outputs when given a single-sample spike as input. The shape of that decay is determined entirely by `a`, and this single response is enough to predict how the filter will behave at any frequency.

Because the filter's behavior doesn't change over time, it is known as a **linear time-invariant (LTI) system**. For any LTI system, the impulse response is a complete description of the filter's behavior.[^oppenheim]

## Frequency Response

The impulse response tells us the filter is doing *something* to the signal, but it doesn't make obvious what that something looks like in terms of frequency. Taking the Fourier transform of the impulse response gives us the **frequency response**: a direct view of how the filter affects each frequency.[^oppenheim]

<div class="applet applet--lg"> 
    <iframe class="applet__frame" src="/applets/filter/p2/dft/index.html" loading="lazy"></iframe>
</div> 
<p style="font-style: italic;">
**As <code>a</code> approaches ±1, the impulse response decays so slowly that 128 samples aren't enough to capture it fully. The jagged frequency response is an artifact of the truncated measurement, not the filter itself.
</p>

## Cutoff Frequency

The coefficient `a` is not intuitive to work with directly. In practice, you want to specify a **cutoff frequency** in Hz — the frequency at which the filter begins to attenuate — and derive `a` from that.

For a one-pole lowpass, the relationship is:[^smith]

$$a = 1 - \frac{2\pi f_c}{F_s}$$

Where $f_c$ is the cutoff frequency in Hz and $F_s$ is the sample rate. Inverting this:

$$f_c = \frac{(1 - a) F_s}{2\pi}$$

For a highpass, `a` is negative, so the cutoff maps symmetrically:

$$a = -\left(1 - \frac{2\pi f_c}{F_s}\right)$$

Note that this approximation holds well at low frequencies but becomes less accurate as `fc` approaches Nyquist — a limitation we'll return to in later articles.

<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript"}'>

```cpp
float coeffFromCutoff(float fc, float Fs) {
    return 1.f - (2.f * M_PI * fc / Fs);
}

float cutoffFromCoeff(float a, float Fs) {
    return (1.f - a) * Fs / (2.f * M_PI);
}
```

```javascript
function coeffFromCutoff(fc, Fs) {
    return 1.0 - (2.0 * Math.PI * fc / Fs);
}

function cutoffFromCoeff(a, Fs) {
    return (1.0 - a) * Fs / (2.0 * Math.PI);
}
```
</div>

## Full Implementation

<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript"}'>

```cpp
#pragma once
#include <cmath>

class OnePoleFilter {
public:
    void setSampleRate(float Fs) {
        mFs = Fs;
    }

    void setCoeff(float a) {
        mA = std::max(-1.f, std::min(1.f, a));
    }

    void setCutoff(float fc) {
        setCoeff(1.f - (2.f * M_PI * fc / mFs));
    }

    float coeffFromCutoff(float fc) const {
        return 1.f - (2.f * M_PI * fc / mFs);
    }

    float cutoffFromCoeff(float a) const {
        return (1.f - a) * mFs / (2.f * M_PI);
    }

    float process(float x) {
        mY = x + mA * mY;
        return mY;
    }

private:
    float mFs = 48000.f;
    float mA  = 0.f;
    float mY  = 0.f;
};
```

```javascript
class OnePoleFilter {
    constructor(Fs = 48000) {
        this.Fs = Fs;
        this.a  = 0.0;
        this.y  = 0.0;
    }

    setCoeff(a) {
        this.a = Math.max(-1.0, Math.min(1.0, a));
    }

    setCutoff(fc) {
        this.setCoeff(1.0 - (2.0 * Math.PI * fc / this.Fs));
    }

    coeffFromCutoff(fc) {
        return 1.0 - (2.0 * Math.PI * fc / this.Fs);
    }

    cutoffFromCoeff(a) {
        return (1.0 - a) * this.Fs / (2.0 * Math.PI);
    }

    process(x) {
        this.y = x + this.a * this.y;
        return this.y;
    }
}
```

</div>

## Try It Out

Use the applet to hear white noise filtered by a one-pole filter and to see the value of `a` in real time.

<div class="applet applet--sm"> 
    <iframe class="applet__frame" src="/applets/filter/p2/demo/index.html" loading="lazy"></iframe>
</div> 

## What's Next

In the next article, we'll look at biquad filters and what it actually means for a filter to have a pole.

## Notes

[^oppenheim]: Oppenheim, Alan V., and Ronald W. Schafer. *Discrete-Time Signal Processing*. Pearson, 2010. [https://www.pearson.com/en-us/subject-catalog/p/Oppenheim-Discrete-Time-Signal-Processing-3rd-Edition/P200000003226](https://www.pearson.com/en-us/subject-catalog/p/Oppenheim-Discrete-Time-Signal-Processing-3rd-Edition/P200000003226).

[^smith]: Smith, Steven W. "Chapter 19: Recursive Filters." *The Scientist and Engineer's Guide to Digital Signal Processing*. [https://www.dspguide.com/ch19.htm](https://www.dspguide.com/ch19.htm).