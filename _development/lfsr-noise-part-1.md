---
layout: post
title: "LFSR Noise Generator — Part 1: Concept & Minimal Core"
date: YYYY-MM-DD
series: "LFSR Noise Generator"
part: 1
tags: [dsp, noise, lfsr, nes, gameboy, webaudio]
excerpt: "PLACEHOLDER_EXCERPT"
---

## Introduction

I started working on GameBoy/NES audio emulation in early 2022 with SuperCollider. On paper it's pretty straightforward, but SC doesn't really support the style of noise generation from the 8-bit Nintendo consoles. After I started C++ coursework at Johns Hopkins, I decided I'd make something more useful than a command line Texas Hold 'Em game. I wanted to expand the idea of Nintendo's noise generator, but with more control. You can find the SuperCollider plugin [here](https://github.com/mjsyts/LFSRNoiseUGens).

What I love about this noise generator is the massive amount of variety you can squeeze out of something that is extremely elegant and almost trivial computationally. The same audio processing algorithm can give results that range from white noise to incredibly rich, but still relatively stable tones.

---

## What Is an LFSR?

An LFSR (linear-feedback shift register) is a tiny state machine that generates a deterministic stream of bits that *behaves* like noise.

You keep an integer "register (a fixed number of bits). On each step:
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

<iframe
  class="applet-frame"
  src="{{ '/applets/lfsr-15/' | relative_url }}"
  loading="lazy"
  title="15-bit LFSR Visualizer"
></iframe>

---

## Minimal JavaScript Implementation

<!--
PLACEHOLDER:
Intro sentence framing this as the smallest working core.
-->

```js
// PLACEHOLDER: minimal LFSR implementation
```

<!--
PLACEHOLDER:
Brief explanation of the code.
Why it works.
Why it’s efficient.
-->

---

## Listening to the Output

<!--
PLACEHOLDER:
Explain how the sound is generated and played.
Temporary approach before AudioWorklet.
Amplitude handling.
-->

<!--
PLACEHOLDER FOR AUDIO DEMO / WEB AUDIO APPLET
(Play / stop controls, etc.)
-->

---

## Limitations of This Version

<!--
PLACEHOLDER:
Bullet list of known limitations.
Set expectations.
Prepare for future parts.
-->

---

## What Comes Next

<!--
PLACEHOLDER:
Brief outline of Part 2 and beyond.
No technical detail yet.
-->

