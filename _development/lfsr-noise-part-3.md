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
If you enter a seed value of 0 into the [visualizer from part 1 of the series](lfsr-noise-part-1.md#core-algorithm-step-by-step "LFSR Core Algorithm with visualizer"), every output value will be 0. All of the previous versions used a seed value of ```0x7fff``` and had a fixed width, so the register never had a chance to fall into an invalid state. Once the width becomes user‑controlled, the register can legitimately shift into the all‑zero, terminal-state pattern.

---

## Terminal State Guard and Reset

We'll need to add a guard that checks the internal state and then *resets it* to a valid state if it ever does reach zero. We'll start by adding a ```seed``` to the constructor that will be both our initial state and a safe value to reset to if the state reaches 0. 
<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript (AudioWorklet)"}'>
```cpp
class LFSRNoise {
    LFSRNoise() : mSeed(0x7fff), mState(mSeed) {}
private:
    // ...
    uint32_t mSeed;
    uint32_t mState;
};
```

```js
constructor() {
    this.seed = 0x7fff; // it makes more sense to initialize the value as seed...
    this.state = this.seed; // ...then assign it directly
}
```
</div>

We'll separate the zero-check function and the reset function since it would be nice to allow the user to manually reset the state.

<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript (AudioWorklet)"}'>
```cpp
bool isTerminalState() {
    return mState == 0;
}

void reset() {
    mState = mSeed;
}
```

```js
isTerminalState() {
    return this.state === 0;
}

reset() {
    this.state = this.seed;
}
```
</div>

Now we just need to hook in the check/reset logic at the beginning of the ```step()``` process block:

<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript (AudioWorklet)"}'>
```cpp
void step() {
    // check/reset
    if (isTerminalState()) {
        reset();
    }

    const uint32_t lsb0 = mState & 1u;
    const uint32_t lsb1 = (mState >> 1) & 1u;
    const uint32_t fb   = lsb0 ^ lsb1;

    mState = (mState >> 1) | (fb << 14);
}
```

```js
step() {
    // check/reset
    if(this.isTerminalState()) {
        this.reset();
    }

    const lsb0 = this.state & 1;
    const lsb1 = (this.state >> 1) & 1;
    const fb = lsb0 ^ lsb1;
    this.state = (this.state >> 1) | (fb << 14);
}
```
</div>

