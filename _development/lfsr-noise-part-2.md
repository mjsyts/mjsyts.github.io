---
layout: post
title: "LFSR Noise Generator — Part 2: Adding a Frequency Control"
date: 2026-01-02
last_modified_at: 2026-01-15
series: "LFSR Noise Generator"
part: 2
permalink: /development/lfsr-noise-part-2/
tags: [dsp, noise, lfsr, nes, gameboy, webaudio, cpp]
desc: "Adding a frequency control to the LFSR noise generator."
thumb: "/assets/images/thumbs/development/lfsr.webp"
---

## Where We Left Off

In the previous post, we built an NES/GameBoy style LFSR noise generator using the smallest working core. The problem now is that the minimal version is not particularly useful as an instrument -- it's not "playable" with a fixed timing.

## What “Frequency” Means for an LFSR

Unlike an oscillator, an LFSR doesn’t have a single fundamental frequency. Its output is a sequence of bits whose spectral content depends on both:
- the **length of the register** 
- how often the register advances.

In other words, the perceived pitch or brightness isn't just a product of the pattern itself. It emerges from how quickly we step through it as well.

## Decouple the Clock from the LFSR Logic

In Part 1, the register advanced on a fixed interval. That made the implementation simple, but it also locked the sound into a single behavior.

The key change here is architectural rather than mathematical. We keep the same internal logic but make the clock a controllable component.

This separation allows the system to behave musically. We are not changing *what* the LFSR produces — only *when* it produces it.

## Phase Accumulation

Adding a frequency control introduces a timing mismatch: audio advances sample by sample, but the LFSR advances in discrete steps.

To bridge that gap, I’m using a **phase accumulator** — the same mechanism used in digital oscillators, repurposed here to schedule register updates.

Each audio sample advances a running phase value. When that phase crosses one or more whole cycles, the LFSR steps accordingly and the phase wraps. Between steps, the register output is held.

This doesn’t change the LFSR itself — only when it updates. The bit pattern and feedback logic are untouched; the accumulator exists purely to make the step rate continuous and controllable.

So the structure is something like this:
```
phase += phaseIncrement
while (phase >= 1.0) {
  stepLFSR()
  phase -= 1.0
}
```

## Implementing the Phase Accumulator

We need to make a few changes to our existing implementation to get the frequency control working. First, because we need to keep track of the phase over the lifetime of the processor instance (just like we did with the initial shift register state), we'll add it to the constructor:

<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript (AudioWorklet)"}'>
```cpp
class LFSRNoise {
  // ...
private:
  uint32_t mState = 0x7fffu;
  float mAmp = 0.10f;
  float mPhase = 0.f; // NEW
};
```

```javascript
constructor() {
    super();
    this.state = 0x7fff;
    this.phase = 0.0; // NEW
  }
```
</div>

Now that we’ve added a frequency control, we can no longer assume one shift per audio sample. The phase accumulator now determines how many clock ticks occur in each sample. 
To implement the phase accumulator in the core process, we need to figure out how much to increment the phase on a given step. This is dependent on the frequency parameter and the sample rate, so we'll declare a function that takes ```freq``` and ```sampleRate``` as arguments:

<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript (AudioWorklet)"}'>
```cpp
float nextSample(float freq, float sampleRate) {
  // phase accumulator stuff will go here
}
```

```javascript
nextSample(freq, sampleRate) {
  // phase accumulator stuff will go here
}
```
</div>

We can calculate the exact amount we need to increase the phase simply by dividing our frequency value by the sample rate:

<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript (AudioWorklet)"}'>
```cpp
float nextSample(float freq, float sampleRate) {
  // advance phase by "cycles per sample"
  mPhase += (freq / sampleRate);
}
```

```javascript
nextSample(freq, sampleRate) {
  // advance phase by "cycles per sample"
  this.phase += (freq / sampleRate);
}
```
</div>

Whenever we complete a full phase, we need to step the LFSR by calling our ```step()``` function. We also need to wrap the value so that ```0 <= phase < 1```. We can also move the part where we map our output bit to a bipolar range into this function since its purpose is to get the next audio sample:

<div data-codegroup markdown="1" data-labels='{"cpp":"C++ ","javascript":"JavaScript (AudioWorklet)"}'>
```cpp
float nextSample(float freq, float sampleRate) {
  // advance phase by "cycles per sample"
  mPhase += (freq / sampleRate);

  // step the LFSR whenever we cross a whole cycle
  while (mPhase >= 1.f) {
    mPhase -= 1.f;
    step();
  }

  // get the output value and map to a bipolar range
  return (mState & 1) ? 1.f : -1.f;
}
```

```javascript
nextSample(freq, sampleRate) {
  // advance phase by "cycles per sample"
  this.phase += freq / sampleRate;

  // step the LFSR whenever we cross a whole cycle
  while (phase >= 1.0) {
    phase -= 1.0;
    this.step();
  }

  // get the output value and map to a bipolar range
  const bit = this.state & 1;
  return bit ? 1.0 : -1.0;
}
```
</div>

In practice, it’s also sensible to cap the clock frequency at or below the audio sample rate. Advancing the register faster than we can observe it doesn’t add new information, and at extreme values the behavior simply collapses into per-sample updates.

So *now* the whole thing is:
<div data-codegroup markdown="1" data-labels='{"cpp":"C++ ","javascript":"JavaScript (AudioWorklet)"}'>

```cpp
class LFSRNoise {
public:
  void setAmp(float a) { mAmp = a; }

  void step() {
    const uint32_t lsb0 = mState & 1u;
    const uint32_t lsb1 = (mState >> 1) & 1u;
    const uint32_t fb   = lsb0 ^ lsb1;

    mState = (mState >> 1) | (fb << 14);
    mState &= 0x7fffu;
  }

  float nextSample(float freq, float sampleRate) {
    mPhase += (freq / sampleRate);
    while (mPhase >= 1.f) {
      mPhase -= 1.f;
      step();
    }
    return (mState & 1) ? 1.f : -1.f;
  }

  void process(float* out, int numSamples, float freq, float sampleRate) { 
    for (int i = 0; i < numSamples; ++i) { 
      out[i] = nextSample(freq, sampleRate) * mAmp; 
    } 
  }

private:
  uint32_t mState = 0x7fffu;
  float mAmp = 0.10f;
  float mPhase = 0.f;
};
```

```javascript
class LfsrNoiseProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "amplitude",
        defaultValue: 0.10,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: "a-rate"
      },
      {
        name: "frequency",
        defaultValue: 440,
        minValue: 0,
        maxValue: 48000,
        automationRate: "k-rate" // we can change this later
      }
    ];
  }

  constructor() {
    super();
    this.state = 0x7fff;
    this.phase = 0.0;
  }

  step() {
    const lsb0 = this.state & 1;
    const lsb1 = (this.state >> 1) & 1;
    const fb = lsb0 ^ lsb1;
    this.state = (this.state >> 1) | (fb << 14);
    this.state &= 0x7fff;
  }

  nextSample(freq, sampleRate) {
    this.phase += freq / sampleRate;

    while (this.phase >= 1.0) {
      this.phase -= 1.0;
      this.step();
    }

    const bit = this.state & 1;
    return bit ? 1.0 : -1.0;
  }

  process(inputs, outputs, parameters) {
    const out = outputs[0];
    const ampParam = parameters.amplitude;
    const freqParam = parameters.frequency;

    const f0 = freqParam[0];
    const freq = Math.min(Math.max(f0, 0), sampleRate); // clamp frequency to a sensible observable range

    for (let ch = 0; ch < out.length; ch++) {
      const channel = out[ch];

      for (let i = 0; i < channel.length; i++) {
        const amp = ampParam.length > 1 ? ampParam[i] : ampParam[0];
        channel[i] = this.nextSample(freq, sampleRate) * amp;
      }
    }
    return true;
  }
}

registerProcessor("lfsr-noise", LfsrNoiseProcessor);
```
</div>

## Demo: WebAudio Noise with a Frequency Slider

<div class="applet lfsr15-audio">
  <iframe class="applet__frame" src="/applets/lfsr/p2/index.html" loading="lazy"></iframe>
</div>

## What’s Next

Our next step is to start varying the width of the shift register, which will introduce its own set of unique problems.
