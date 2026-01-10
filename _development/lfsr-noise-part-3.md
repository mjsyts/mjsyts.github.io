---
layout: post
title: "LFSR Noise Generator — Part 2: Adding a Frequency Control"
date: 2026-01-02
series: "LFSR Noise Generator"
part: 2
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

Before we add the width control, we need to address a problem with our LFSR that hasn't 
