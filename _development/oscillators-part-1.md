---
layout: post
title: "Oscillators — Part 1: Oscillators in Discrete Time"
date: 2025-01-13
series: "Oscillators"
part: 1
published: true
tags: [dsp, oscillator, synthesis, c++]
desc: "Introduction to oscillators in discrete time."
thumb: "/assets/images/thumbs/development/oscillator.webp"
---

## Motivation and Scope 
This series is about digital oscillators as algorithms operating under discrete-time constraints. Oscillators are often treated as trivial components, yet generating a repeating signal sample by sample is already a nontrivial problem. The underlying theme of these articles is: 

> **The oscillator is the smallest system in which the fundamental constraints of discrete-time audio already apply.** 

Part 1 focuses on establishing a basic model and working definition. Later posts address specific implementation strategies, aliasing, bandlimiting, and oversampling. 

## Discrete Time as a Constraint 

Sound unfolds continuously in the physical world, but computers don't store or operate on continuous processes. To represent sound in a form that can be indexed, stored in memory, and manipulated algorithmically, time must be **discretized** — sampled at regular intervals. A useful analogy is a flipbook: continuous motion is represented as a sequence of individual pages. We will consider digital audio as a sequence of sampled values indexed by `n` taken at the sample rate `Fs`. 

<div class="applet applet--md"> <iframe class="applet__frame" src="/applets/oscillator/p1/discrete-time/index.html" loading="lazy"></iframe> </div> 

## What It Means to Oscillate 

An oscillator has the following properties: 
- It is **sustained**: the signal continues indefinitely in time. 
- It **varies**: the signal is not constant. 
- It is **cyclic**: the same sequence of values repeats in the same order. 

In discrete time, cyclic repetition means there exists a finite period $N$ such that $$ x[n] = x[n + N] $$ for exact sample-periodic signals.   

Signals that fail to meet one or more of these conditions are not oscillators: 
- A **constant signal** is sustained but does not vary. 
- A **transient** varies but does not sustain. 
- **Noise** may sustain and vary, but it does not repeat a fixed cycle. 

This definition is structural rather than perceptual - it does not depend on how the signal sounds. It is also intentionally strict. Real‑world oscillators — especially when modulated — may drift or vary, but the strict periodic model is the foundation we build on. Requiring cyclic repetition has immediate consequences in the digital realm. The generator must keep track of where it is within the cycle and advance that position explicitly from one sample to the next. 

## Period and Frequency 

In discrete time, we quantify the **period** of an oscillator in **samples**. For an exactly periodic discrete-time oscillator, **frequency** is a derived quantity: $$ f = Fs / N $$ 

As a consequence, not all frequency values are perfectly representable in digital audio. Exact cyclic repetition requires the period `N` to be an integer number of samples. This means that only frequencies of the form `Fs / N` can repeat exactly. For many frequencies, `Fs / f` is not an integer. In those cases, the signal can get very close to the desired frequency, but it cannot repeat with perfect sample-level periodicity. This limitation follows directly from discrete time and does not depend on the waveform or implementation. In other words:  

***Discrete time gives you a grid of sample points, and many periods do not align exactly with that grid.*** 

For example:  
At 48 kHz, a 440 Hz tone would require a period of 109.09 samples and we can't have a .09th sample. A phase accumulator solves this by allowing fractional phase increments, even though the underlying cycle never aligns perfectly with the sample grid over any finite window. 

## State and Phase 
It is helpful to think of generating an oscillator as repeating a pattern. To do that, the generator must remember where it is within the pattern. An oscillator is therefore a **stateful system**. At each sample, it produces an output and updates an internal state that determines what comes next. That state represents position within a cycle. We call this position **phase**.  

Phase is not a waveform and it is not a sound. It is a bookkeeping variable that tracks progress through a repeating cycle. In the simplest case, phase advances steadily from the start of the cycle to the end, then wraps around and repeats.  

The separation of **phase as position** and **waveform as shape** will be central throughout the rest of the series. 

## The Phase Accumulator Model 

Once phase is treated as a state variable, the simplest way to generate an oscillator is to advance that state by a fixed amount at each sample. This approach is known as the **phase accumulator model**. At every step, phase is incremented, wrapped when it exceeds the cycle, and then mapped to an output value. 

<p style="text-align: center; font-weight: 600; font-style: italic;"> In this series we’ll normalize phase so the cycle length is 1. </p> 

Implementing a phase accumulator looks like this:

```
phase += phaseIncrement
if (phase >= 1.0) {
  phase -= 1.0
}
output = waveform(phase)
```

## From Phase to Signal 

The phase accumulator tells us *where* we are in a cycle, but does not specify *what the signal looks like*. In order to produce audio, we need a **waveform**: a function that maps phase to an amplitude value. In its simplest form: 
$$ y[n]=waveform(phase[n]) $$  

Since we're normalizing phase to [0,1), a sine wave for example is just a convenient mapping: 
$$ y[n]=sin⁡(2π⋅phase[n]) $$ 

Other waveforms can be expressed as different mappings from phase to amplitude. We will return to those later, since discontinuities in the mapping introduce other problems in discrete time.

## A Minimal Naïve Sine Oscillator

```cpp
#include <cmath>

class SinOsc {
private:
    static constexpr double twoPi = 6.283185307179586;
    double mPhase;
    double mPhaseIncrement;

public:
    SinOsc() : mPhase(0.0), mPhaseIncrement(0.0) {}

    // we'll use sampleRate here instead of Fs
    void setFreq(double freq, double sampleRate) {
        mPhaseIncrement = freq / sampleRate;
    }

    double process() {
        // advance phase
        mPhase += mPhaseIncrement;
        if (mPhase >= 1.0) {
            mPhase -= 1.0;
        }

        // sine is our waveform function
        return std::sin(twoPi * mPhase);
    }
};
```

<p style="font-style: italic;">
**This simple accumulator works, but floating‑point precision subtly affects long‑term stability — a topic we'll dig into next.
</p>

## What This Ignores (For Now)

- Aliasing
- Numerical precision and drift
- Modulation and parameter changes
- Bandwidth limitations

We will address these issues throughout the series.

## What's Next

In the next article, we will be looking at phase and numerical precision.