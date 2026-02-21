---
layout: post
title: "Filters — Part 3: Poles, Biquad Filter, and Filter Types"
date: 2026-02-19
last_modified_at: 2026-02-19
series: "Filters"
part: 3
published: false
permalink: /development/filters-part-3/
tags: [dsp, filter, biquad, webaudio, synthesis, c++, mojo, mmmaudio]
desc: "Building a biquad filter, understanding poles and stability, and exploring common filter types."
thumb: "/assets/images/thumbs/development/filter.jpg"
---

## Motivation and Scope

**One-pole** filters are useful for gentle spectral adjustments: a **lowpass** to cut above a cutoff frequency, a **highpass** to cut below. You can also pair them: if the highpass cutoff is lower than the lowpass cutoff, the overlap between them gives you a **bandpass**; if the highpass cutoff is higher, you get a **notch**.
But these are approximations. One-pole filters have a shallow rolloff of **6 dB/octave**, so transitions are gradual and the notch is wide. Cleanly eliminating a 60 Hz hum requires steeper rolloffs and sharper notches. **Biquad** filters provide exactly that, and more: resonance, shelves, peaks, and other filter shapes that a one-pole simply can't produce.

## Poles and Zeros

A **pole** is an energy storage element — energy accumulates near its frequency, boosting the response there. Each pole contributes **6 dB/octave** of rolloff, so a one-pole filter rolls off at 6 dB/octave and a **biquad** (two poles) rolls off at 12 dB/octave. A **zero** does the opposite: response goes to zero at that frequency, cutting it completely. Filters are often described as **n**th order, where `n` is the number of poles and `n × 6` is the rolloff in dB/octave.

## The Z-Plane

Frequencies in a digital system can be represented as points on a circle: the **unit circle**.

The **z-plane** plots a filter's poles and zeros as points, and their position relative to the unit circle determines how the filter responds at each frequency.

Drag the filter pole and zero around on the unit circle to see the filter's frequency and impulse response. Notice that if these points leave the unit circle, the filter becomes unstable.

<div class="applet applet--lg"> 
    <iframe class="applet__frame" src="/applets/filter/p3/z-plane/index.html" loading="lazy"></iframe>
</div> 

## Direct Form II

The biquad has two stages.

The first equation computes an intermediate value $w[n]$ by taking the input and subtracting scaled copies of its own past two values — that's the **feedback**, and those are your **poles**.  

$$w[n] = x[n] - a_1 w[n-1] - a_2 w[n-2]$$

The second equation computes the output by mixing the current and past two values of $w[n]$ — that's the **feedforward**, and those are your **zeros**.

$$y[n] = b_0 w[n] + b_1 w[n-1] + b_2 w[n-2]$$

The $a$ coefficients control the poles (resonance, rolloff), the $b$ coefficients control the zeros (nulls, shelf shape). Together they give you the 12 dB/octave rolloff and the full range of filter shapes a one-pole can't produce.

## Implementation

### Filter Types

There are 9 different biquad filter shapes:
- Lowpass
- Highpass
- Bandpass (constant skirt gain)
- Bandpass (constant 0 dB peak gain)
- Notch
- Allpass
- Peaking EQ (`Peak`)
- Low shelf
- High shelf

Before implementing the processor, we need to enumerate the filter shapes.

<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript (AudioWorklet)","mojo":"Mojo (MMMAudio)"}'>

```cpp
enum class BiquadMode : int {
    Lowpass         = 0,
    Highpass        = 1,
    Bandpass        = 2,
    Bandpass_peak   = 3,
    Notch           = 4,
    Allpass         = 5,
    Peak            = 6,
    Lowshelf        = 7,
    Highshelf       = 8,
};
```

```js
const BiquadMode = Object.freeze({
    Lowpass:       0,
    Highpass:      1,
    Bandpass:      2,
    Bandpass_peak: 3,
    Notch:         4,
    Allpass:       5,
    Peak:          6,
    Lowshelf:      7,
    Highshelf:     8,
});
```

```mojo
struct BiquadModes:
    comptime lowpass: Int64 = 0
    comptime highpass: Int64 = 1
    comptime bandpass: Int64 = 2
    comptime bandpass_peak: Int64 = 3
    comptime notch: Int64 = 4
    comptime allpass: Int64 = 5
    comptime peak: Int64 = 6
    comptime lowshelf: Int64 = 7
    comptime highshelf: Int64 = 8
```

</div>

### The Processor

The `Biquad` class skeleton below has a few supporting methods. `setParameters()` takes frequency, Q, and gain and only recomputes coefficients when something actually changes. `setSampleRate()` does the same — updating the sample rate invalidates the cached coefficients. `reset()` clears the delay line state, useful after a discontinuity in the audio stream. `zapGremlins()` sanitizes the output on every sample. Filters can produce denormals, NaN, or infinity when pushed hard, so we zero anything that isn't a finite, non-negligible value.

<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript (AudioWorklet)","mojo":"Mojo (MMMAudio)"}'>

```cpp
#pragma once
#include <cmath>

class Biquad {
public:
    Biquad(float sampleRate = 44100.0f) : mSampleRate{sampleRate} {}

    void setSampleRate(float sampleRate) {
        mSampleRate = sampleRate;
        mCoeffsDirty = true;
    }

    void setParameters(float frequency, float q, float gainDb = 0.0f) {
        if (frequency == mFrequency && q == mQ && gainDb == mGainDb) return;
        mFrequency = frequency;
        mQ = q;
        mGainDb = gainDb;
        mCoeffsDirty = true;
    }

    void reset() {
        mW1 = mW2 = 0.0f;
    }

    float process(float x) {
        if (mCoeffsDirty) computeCoefficients();
        float w = x - mA1 * mW1 - mA2 * mW2;
        float y = mB0 * w + mB1 * mW1 + mB2 * mW2;
        mW2 = mW1;
        mW1 = w;
        return zapGremlins(y);
    }

private:
    void computeCoefficients() {
        mCoeffsDirty = false;
    }

    float zapGremlins(float x) {
        return (std::isfinite(x) && std::abs(x) >= 1e-15f) ? x : 0.0f;
    }

    float mSampleRate  = 44100.0f;
    float mFrequency   = 1000.0f;
    float mQ           = 0.707f;
    float mGainDb      = 0.0f;

    float mB0 = 1.0f, mB1 = 0.0f, mB2 = 0.0f;
    float mA1 = 0.0f, mA2 = 0.0f;
    float mW1 = 0.0f, mW2 = 0.0f;

    bool mCoeffsDirty = true;
};
```

```js
class Biquad {
    constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.frequency = 1000;
        this.q = 0.707;
        this.gainDb = 0;

        this.b0 = 1; this.b1 = 0; this.b2 = 0;
        this.a1 = 0; this.a2 = 0;
        this.w1 = 0; this.w2 = 0;

        this.dirty = true;
    }

    setSampleRate(sampleRate) {
        this.sampleRate = sampleRate;
        this.dirty = true;
    }

    setParameters(frequency, q, gainDb = 0) {
        if (frequency === this.frequency && q === this.q && gainDb === this.gainDb) return;
        this.frequency = frequency;
        this.q = q;
        this.gainDb = gainDb;
        this.dirty = true;
    }

    reset() {
        this.w1 = this.w2 = 0;
    }

    process(x) {
        if (this.dirty) this.computeCoefficients();
        const w = x - this.a1 * this.w1 - this.a2 * this.w2;
        const y = this.b0 * w + this.b1 * this.w1 + this.b2 * this.w2;
        this.w2 = this.w1;
        this.w1 = w;
        return this.zapGremlins(y);
    }

    computeCoefficients() {
        this.dirty = false;
    }

    zapGremlins(x) {
        return (isFinite(x) && Math.abs(x) >= 1e-15) ? x : 0;
    }
}
```

```mojo
struct Biquad(Representable, Movable, Copyable):
    var sampleRate: Float32
    var frequency: Float32
    var q: Float32
    var gainDb: Float32

    var b0: Float32; var b1: Float32; var b2: Float32
    var a1: Float32; var a2: Float32
    var w1: Float32; var w2: Float32

    var coeffsDirty: Bool

    fn __init__(out self, sampleRate: Float32 = 44100.0):
        self.sampleRate  = sampleRate
        self.frequency   = 1000.0
        self.q           = 0.707
        self.gainDb      = 0.0
        self.b0 = 1.0; self.b1 = 0.0; self.b2 = 0.0
        self.a1 = 0.0; self.a2 = 0.0
        self.w1 = 0.0; self.w2 = 0.0
        self.coeffsDirty = True

    fn setSampleRate(mut self, sampleRate: Float32):
        self.sampleRate = sampleRate
        self.coeffsDirty = True

    fn setParameters(mut self, frequency: Float32, q: Float32, gainDb: Float32 = 0.0):
        if frequency == self.frequency and q == self.q and gainDb == self.gainDb:
            return
        self.frequency = frequency
        self.q = q
        self.gainDb = gainDb
        self.coeffsDirty = True

    fn reset(mut self):
        self.w1 = 0.0
        self.w2 = 0.0

    fn process(mut self, x: Float32) -> Float32:
        if self.coeffsDirty:
            self._computeCoefficients()
        var w = x - self.a1 * self.w1 - self.a2 * self.w2
        var y = self.b0 * w + self.b1 * self.w1 + self.b2 * self.w2
        self.w2 = self.w1
        self.w1 = w
        return self._zapGremlins(y)

    fn _computeCoefficients(mut self):
        self.coeffsDirty = False

    fn _zapGremlins(self, x: Float32) -> Float32:
        if isfinite(x) and abs(x) >= 1e-15:
            return x
        return 0.0
```

</div>

### Coefficients

Coefficients are calculated differently for each biquad filter shape. `computeCoefficients()` has five intermediate values. `w0` is a normalized frequency value in radians. We also need `sin(w0)` and `cos(w0)`. `alpha` is a scaling factor to normalize the filter resonance. `A` is a gain factor only used by **peak (peaking EQ)**, **lowshelf**, and **highshelf** filters. At 0 dB, `A = 1` and it drops out of the equations entirely, which is why the other filter types can ignore it.

Use the applet below to view the different coefficient calculation functions and to learn more about each filter shape. Adjust the parameters to see the effect they have on the filter's frequency response. An **allpass** filter only changes the **phase** of a signal, so the frequency response plot is flat for all frequencies.

<div class="applet applet--lg"> 
    <iframe class="applet__frame" src="/applets/filter/p3/code/index.html" loading="lazy"></iframe>
</div> 