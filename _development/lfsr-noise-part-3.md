---
layout: post
title: "LFSR Noise Generator — Part 3: Variable Width & Terminal States"
date: 2026-01-10
series: "LFSR Noise Generator"
part: 3
tags: [dsp, noise, lfsr, nes, gameboy, webaudio]
excerpt: "PLACEHOLDER_EXCERPT"
---

## Where We Left Off

-We have a basic XOR-feedback LFSR noise generator.
-The taps are fixed as the two right-most bits (the least significant bit and its neighbor).
-We added a frequency control and the register is clocked explicitly (**not** cyclic).  
**Goal of this part:**
Make the register width selectable, while keeping the behavior predictable, safe, and musically usable.

---

## Terminal States

Before we add the width control, we need to address a problem with our LFSR that was only incidentally protected in previous implementations.  
**If the state ever becomes 0, the LFSR enters a terminal state and stops generating new values.**  
If you enter a seed value of 0 into the [visualizer from part 1 of the series](lfsr-noise-part-1.md#core-algorithm-step-by-step "LFSR Core Algorithm with visualizer"), every output value will be 0. All of the previous versions used a seed value of ```0x7fff``` and had a fixed width, so the register never had a chance to fall into an invalid state. If we start changing the width, it could theoretically fall into a 0 state.

---

## Terminal State Guard

We'll need to add a guard that checks the internal state and then *resets it* to a valid state if it ever does reach zero.


