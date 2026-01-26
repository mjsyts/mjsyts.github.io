---
layout: post
title: "LFSR Noise Generator — Part 1: Concept & Minimal Core"
date: 2025-12-30
last_modified_at: 2026-01-19
series: "LFSR Noise Generator"
part: 1
permalink: /development/lfsr-noise-part-1/
tags: [dsp, noise, lfsr, nes, gameboy, webaudio, c++]
desc: "Minimal 15-bit LFSR core and bipolar noise output."
thumb: "/assets/images/thumbs/development/lfsr.jpg"
---

## Introduction

I started working on GameBoy/NES audio emulation in early 2022 with SuperCollider. On paper it's pretty straightforward, but SC doesn't really support the style of noise generation from the 8-bit Nintendo consoles. During my C++ coursework at Johns Hopkins, I took the core structure of this noise generator, added more granular control, and packaged it into a SC UGen as a pet project. You can find the SuperCollider plugin [here](https://github.com/mjsyts/LFSRNoiseUGens "LFSRNoise SuperCollider plugin").

What I love about this noise generator is the massive amount of variety you can squeeze out of something that is extremely elegant and almost trivial computationally. The same audio processing algorithm can give results that range from white noise to incredibly rich, but still relatively stable tones.

## What Is an LFSR?

An LFSR (linear-feedback shift register) is a tiny state machine that generates a deterministic stream of bits that *behaves* like noise.

You keep an integer "register" (a fixed number of bits). On each step:

1. You choose a few of the bit positions (called **taps**).
2. XOR the tap bits to get a new feedback bit.
3. Shift the entire register one position.
4. Insert the feedback bit back into the register.
5. Take one bit (usually the least-significant bit) as the **output** for that step.

Because the next state depends on the current state, it's fully deterministic. Certain taps will cause a very long sequence of unique register states before repeating, so the output is pseudo-random. All that happens is a bitshift operation and an XOR, which is about as cheap as arithmetic gets on modern CPUs. Once you map the output stream of 1's and 0's to a bipolar range to avoid DC offset, you have a really nice audio source.

## The Variant Used in This Post

To keep Part 1 focused, we’ll use the simplest possible version: a fixed 15‑bit register stepped at the sample rate. Later posts will add frequency control, variable width, and more.

## Core Algorithm (Step by Step)

The NES and GameBoy use the same core LFSR structure:

1. XOR the two right‑most bits (LSB &amp; bit1)
2. Right‑shift
3. Insert the XOR result as the new left‑most bit (MSB).

You can use the applet to see what's happening internally:

<div class="applet applet--sm">
  <iframe
    class="applet__frame"
    src="{{ '/applets/lfsr/p1/viz/' | relative_url }}"
    title="LFSR visualizer"
    loading="lazy"
  ></iframe>
</div>

## Minimal Implementation

This is the smallest working core of our LFSR noise generator in C++ and WebAudio. For simplicity, the C++ isn't tied to SC plugin architecture here, so you can use it wherever.

We need to keep track of the shift register over the lifetime of the processor instance. The GameBoy and NES have a 15-bit shift register with all bits set to 1 initially (```0x7fff```), so in the constructor:

<div data-codegroup markdown="1" data-labels='{"cpp":"C++ ","javascript":"JavaScript (AudioWorklet)"}'>

```cpp
#pragma once

class LFSRNoise {
public:
  LFSRNoise();

private:
  uint32_t mState = 0x7fff;
};
```

```javascript
constructor() {
  super();
  this.state = 0x7fff;
}
```

</div>

Then the core LFSR logic wrapped in a function:

<div data-codegroup markdown="1" data-labels='{"cpp":"C++ ","javascript":"JavaScript (AudioWorklet)"}'>

```cpp
void step() {
  // Get the least significant bit. This is both our output bit
  // and one of the feedback taps.
  const uint32_t lsb0 = mState & 1u;

  // Get the next bit up to use as the second feedback tap.
  const uint32_t lsb1 = (mState >> 1) & 1u;

  // XOR the two tap bits to generate the feedback bit.
  const uint32_t fb = lsb0 ^ lsb1;

  // Shift the register right by one and inject the feedback
  // bit into the most significant position (bit 14).
  mState = (mState >> 1) | (fb << 14);
}
```

```javascript
step() {
  // Get the least significant bit. This is both our output bit
  // and one of the feedback taps.
  const lsb0 = this.state & 1;

  // Get the next bit up to use as the second feedback tap.
  const lsb1 = (this.state >> 1) & 1;

  // XOR the two tap bits to generate the feedback bit.
  const fb = lsb0 ^ lsb1;

  // Shift the register right by one and inject the feedback
  // bit into the most significant position (bit 14).
  this.state = (this.state >> 1) | (fb << 14);
}
```

</div>

In the main process block, all we have to do is call our ```step()``` function and then map that value to a bipolar range so we don't get DC offset:

<div data-codegroup markdown="1" data-labels='{"cpp":"C++ ","javascript":"JavaScript (AudioWorklet)"}'>

```cpp
// Generate audio-rate samples from the LFSR.
// Each call to step() advances the register by one tick.
void process(float* out, int numSamples) {
  for (int i = 0; i < numSamples; ++i) {
    // Step the LFSR.
    step();

    // Map the output bit to a bipolar range to avoid DC offset.
    const float sample = (mState & 1) ? 1.0f : -1.0f;

    // Write the sample to the output buffer.
    out[i] = sample;
  }
}
```

```javascript
// Generate audio-rate samples from the LFSR.
// Each call to step() advances the register by one tick.
process(channel) {
  for (let i = 0; i < channel.length; i++) {
    // Step the LFSR.
    step();

    // Map the output bit to a bipolar range to avoid DC offset.
    const sample = (this.state & 1) ? 1.0 : -1.0;

    // Write the sample to the output buffer.
    channel[i] = sample;
  }
}
```

</div>

Once we add an amplitude parameter, the whole thing is:

<div data-codegroup markdown="1" data-labels='{"cpp":"C++ ","javascript":"JavaScript (AudioWorklet)"}'>

```cpp
#pragma once

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

  void process(float* out, int numSamples) {
    for (int i = 0; i < numSamples; ++i) {
      step();
      const float sample = (mState & 1u) ? 1.f : -1.f;
      out[i] = sample * mAmp;
    }
  }

private:
  uint32_t mState = 0x7fffu;
  float mAmp = 0.10f; // this is a reasonable default
};
```

```javascript
class LfsrNoiseProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'amplitude',
      defaultValue: 0.10, // this is a reasonable default
      minValue: 0.0,
      maxValue: 1.0,
      automationRate: 'a-rate'
    }];
  }

  constructor() {
    super();
    this.state = 0x7fff;
  }

  step() {
    const lsb0 = this.state & 1;
    const lsb1 = (this.state >> 1) & 1;
    const fb = lsb0 ^ lsb1;
    this.state = (this.state >> 1) | (fb << 14);
    this.state &= 0x7fff;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];

    const ampParam = parameters.amplitude; // a-rate array OR length-1 constant

    for (let i = 0; i < channel.length; i++) {
      this.step();
      const sample = (this.state & 1) ? 1.0 : -1.0;

      const amp = (ampParam.length === 1) ? ampParam[0] : ampParam[i];
      channel[i] = sample * amp;
    }

    return true;
  }
}

registerProcessor('lfsr-noise', LfsrNoiseProcessor);
```

</div>

That's it. Atomically small, but this simplicity will have significant implications later on.

## Listening to the Output

<div class="applet lfsr15-audio">
  <iframe
    class="applet__frame"
    src="{{ '/applets/lfsr/p1/audio/' | relative_url }}"
    title="LFSR Noise — WebAudio demo"
    loading="lazy"
  ></iframe>
</div>

## Limitations of This Version

Again, this version has no control over:

- Initial state
- Frequency/clock rate
- Width
- Taps (we won't be building a version with selectable taps in this tutorial)
- As we'll see in future posts, this could theoretically get stuck. We don't really handle terminal state edge-cases in this version internally.

## What Comes Next

Now that we have a simple working core, the next step is to make it "playable" by adding a frequency control.
