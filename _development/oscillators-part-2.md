---
layout: post
title: "Oscillators — Part 2: Oscillator Phase and Numerical Behavior"
date: 2026-01-15
last_modified_at: 2026-01-26
series: "Oscillators"
part: 2
published: true
permalink: /development/oscillators-part-2/
tags: [dsp, oscillator, synthesis, c++]
desc: "How floating-point arithmetic affects oscillator phase over long runtimes, even when phase remains bounded."
thumb: "/assets/images/thumbs/development/oscillator.jpg"
---

## Where We Left Off

In Part 1, we handled phase accumulation and phase wrapping. This article will deal with numerical behavior.

## A Quick Note About Floating Point Precision

In the naïve oscillator example, we used double‑precision phase values to keep numerical behavior from distracting from the phase‑accumulator model itself. In this article, the examples switch to single‑precision floating point, reflecting common practice in real‑time audio DSP, where `float` is typically chosen for performance and memory efficiency.[^smith]

This change doesn’t alter the oscillator’s structure or its intended behavior, but it makes the consequences of numerical representation easier to observe. With single precision, the effects of repeated accumulation, wrapping strategy, and long‑term stability become visible much sooner.

The goal here isn’t to promote one precision over another, but to highlight that precision choice is part of the oscillator’s design rather than an implementation detail to be overlooked.

## Phase as an Invariant

Wrapping phase enforces a simple but necessary invariant: **phase remains bounded**.

This prevents unbounded growth, precision collapse, and outright numerical failure. However, bounded phase alone does **not** guarantee:

- Perfect long-term periodicity  
- Repeatable behavior across implementations  
- Stability under large parameter changes  
- Identical results for mathematically equivalent formulations  

## Floating-Point Accumulation

Phase accumulators rely on repeated addition. Each step introduces a small rounding error. Individually, these errors are negligible. Over time, they accumulate.[^goldberg]

Important distinctions:

- Phase may remain bounded while numerical error grows  
- Two oscillators with identical logic can diverge  
- Long runtimes reveal behavior invisible at short timescales  

Tiny discrepancies can matter when they happen often enough. If a financial calculation is performed millions of times, a rounding difference that is invisible on any single transaction can accumulate into a measurable amount. 

Floating-point phase works the same way: each update is “correct” in the sense that it follows the intended update rule, but the representation cannot store most fractional increments exactly, so each step rounds to the nearest representable value.

Wrapping keeps phase bounded, but it does not undo this rounding residue. The error persists across updates and becomes visible over long runs, especially at single precision.

## Wrapping Strategies Under Stress

At this point, the question becomes: **if rounding error is inevitable, does the wrapping strategy matter?** In Part 1 of this series, we implemented phase wrapping like this:

```
phase += phaseIncrement
if (phase >= 1.0) {
  phase -= 1.0
}
```

In the [visualizer applet from Part 1]({% link _development/oscillators-part-1.md %}#the-phase-accumulator-model "Phase Accumulator Model with visualizer"), two different phase wrapping algorithms produce valid results.

### Conditional Subtraction 

Conditional subtraction looks like this:  
`if (p >= 1.0) { p -= 1.0 }`

It assumes:

- Increment is less than 1
- Phase advances smoothly
- You only cross the boundary **at most** once per step

It fails:

- With large increments
- With time jumps/scrubbing
- If motion is reversed
- If the boundary is crossed more than once

### Fractional Wrapping (Unconditional)

Fractional wrapping looks like this:  
`p -= floor(p)` or `p = fract(p)`

It assumes:

- Nothing about the size of the increment
- Nothing about the direction

In fact, *because* it is agnostic to the failure points of conditional subtraction, fractional wrapping is the more robust phase wrapping algorithm, but it is **not perfect**.

Tradeoffs:

- Fractional wrapping is slightly more expensive
- It introduces a floating-point `floor` operation

### In Summary:

Fractional wrapping is **guaranteed** for any real-valued phase representable in floating point, but **both** are subject to rounding error.

## What Does Floating-Point Error Do Over Time?

Each phase update introduces a small rounding error, and over many iterations those errors accumulate, gradually pulling the phase away from the trajectory implied by exact real‑number arithmetic. The deviation is easy to see against an analog reference, and the same phenomenon appears—more subtly—when comparing single‑precision accumulation with double precision.

In practice, this divergence is not limited to precision choice: differences in hardware, compiler behavior, and execution order can further influence long-term numerical behavior, even when the source code is identical. Exploring those effects in detail is beyond the scope of this article.

## Try It Out

This plot compares a single-precision phase accumulator against a double-precision reference using the same update rule and wrapping. The vertical axis shows their wrapped phase difference over time, expressed as the shortest angular distance between phases and bounded to ±180°. Hovering over the plot reveals the simulated time and instantaneous deviation at each point.

<div class="applet applet--lg"> <iframe class="applet__frame" src="/applets/oscillator/p2/phase-drift/index.html" loading="lazy"></iframe> </div> 

## What's Next

In the next article, we'll keep the same phase model but turn to the discontinuities that arise when phase is mapped to an output waveform, even when phase itself is handled correctly.

## Notes

[^smith]: Smith, Steven W. "DSP Software" *The Scientist and Engineer's Guide to
Digital Signal Processing*. [https://www.dspguide.com/ch4.htm](https://www.dspguide.com/ch4.htm)

[^goldberg]: Goldberg, David. “What Every Computer Scientist Should Know About Floating-Point Arithmetic.” *ACM Computing Surveys*, 1991. [https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html)