---
layout: post
title: "LFSR Noise Generator — Part 1: Concept & Minimal Core"
date: 2026-01-03
series: "LFSR Noise Generator"
part: 1
tags: [dsp, noise, lfsr, nes, gameboy, webaudio]
excerpt: "PLACEHOLDER_EXCERPT"
---

## Introduction

I started working on GameBoy/NES audio emulation in early 2022 with SuperCollider. On paper it's pretty straightforward, but SC doesn't really support the style of noise generation from the 8-bit Nintendo consoles. After I started C++ coursework at Johns Hopkins, I decided I'd make something more useful than a command line Texas Hold 'Em game. I wanted to augment the idea behind Nintendo's noise generator, adding more granular control. You can find the SuperCollider plugin [here](https://github.com/mjsyts/LFSRNoiseUGens).

What I love about this noise generator is the massive amount of variety you can squeeze out of something that is extremely elegant and almost trivial computationally. The same audio processing algorithm can give results that range from white noise to incredibly rich, but still relatively stable tones.

---

## What Is an LFSR?

An LFSR (linear-feedback shift register) is a tiny state machine that generates a deterministic stream of bits that *behaves* like noise.

You keep an integer "register" (a fixed number of bits). On each step:
1. You choose a few of the bit positions (called **taps**).
2. XOR the tap bits to get a new feedback bit.
3. Shift the entire register one position.
4. Insert the feedback bit back into the register.
5. Take one bit (usually the least-significant bit) as the **output** for that step.

Because the next state depends on the current state, it's fully deterministic. Certain taps will cause a very long sequence of unique register states before repeating, so the output is pseudo-random. All that happens is a bitshift operation and an XOR -- extremely lightweight and extremely fast. Once you map the output stream of 1's and 0's to a bipolar range to avoid DC offset, you have a really nice audio source.

---

## The Variant Used in This Post

This version is a fixed 15 bit shift register stepped at the sample rate. This version has no control over
- Initial state
- Frequency/clock rate
- Width
- Taps (I won't be including a version with selectable taps, but if you enjoy this post, I encourage you to cook one up!)

---

## Core Algorithm (Step by Step)

1. XOR the two right‑most bits (LSB &amp; bit1)
2. Right‑shift
3. Insert the XOR result as the new left‑most bit (MSB).

You can use the applet to see what's happening internally:

<div class="applet lfsr-applet">
  <iframe
    class="applet__frame"
    src="{{ '/applets/lfsr-15/' | relative_url }}"
    title="LFSR visualizer"
    loading="lazy"
    scrolling="no"
  ></iframe>
</div>

---

## Minimal JavaScript Implementation

This is the smallest working core of our LFSR noise generator in WebAudio.

In the constructor:

```js
constructor() {
    super();
    this.state = 0x7fff;
  }
```
Then the core process loop:

```js
// Get the two least significant bits for feedback. lsb0 will also become our output value.
const lsb0 = this.state & 1;
const lsb1 = (this.state >> 1) & 1;

// XOR
const fb = lsb0 ^ lsb1;

// Right shift
this.state = (this.state >> 1) | (fb << 14);

// Map to bipolar
const sample = lsb0 ? 1.0 : -1.0;
const amp = (ampParam.length === 1) ? ampParam[0] : ampParam[i];

// ...and then scale by the amplitude value.
channel[i] = sample * amp;
```

So the whole thing is:

```js
class LfsrNoiseProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'amplitude',
      defaultValue: 0.10,
      minValue: 0.0,
      maxValue: 1.0,
      automationRate: 'a-rate'
    }];
  }

  constructor() {
    super();
    this.state = 0x7fff;
  }

  process(inputs, outputs, parameters) {
    const out = outputs[0];
    const ampParam = parameters.amplitude;

    for (let ch = 0; ch < out.length; ch++) {
      const channel = out[ch];

      for (let i = 0; i < channel.length; i++) {
        const lsb0 = this.state & 1;
        const lsb1 = (this.state >> 1) & 1;
        const fb = lsb0 ^ lsb1;

        this.state = (this.state >> 1) | (fb << 14);

        const sample = lsb0 ? 1.0 : -1.0;
        const amp = (ampParam.length === 1) ? ampParam[0] : ampParam[i];

        channel[i] = sample * amp;
      }
    }
    return true;
  }
}

registerProcessor('lfsr-noise', LfsrNoiseProcessor);
```

That's it. Atomically small, but this simplicity will have significant implications later on.

---

## Listening to the Output
<div class="applet lfsr-applet">
  <iframe
    class="applet__frame"
    src="/applets//demos/lfsr/p1/"
    title="LFSR Noise — WebAudio demo"
    loading="lazy"
    scrolling="no"
  ></iframe>
</div>
---

## Limitations of This Version

Again, this version has no control over:
- Initial state
- Frequency/clock rate
- Width
- Taps
- As we'll see in future posts, this could theoretically get stuck. We don't really handle terminal state edge-cases in this version internally.

---

## What Comes Next

Now that we have a simple working core, we can add controls for frequency, register width, seed, and a reset trigger to set the state back to the seed. We also need to handle terminal states.

