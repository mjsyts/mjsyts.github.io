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

- We have a basic XOR-feedback LFSR noise generator.
- The taps are fixed as the two right-most bits (the least significant bit and its neighbor).
- We added a frequency control and the register is clocked explicitly (**not** cyclic).  
  
**Goal of this part:**
Make the register width selectable, while keeping the behavior predictable, safe, and musically usable.


## Terminal States

Before we add the width control, we need to address a problem with our LFSR that was only incidentally protected in previous implementations.  

**If the state ever becomes 0, the LFSR enters a terminal state and stops generating new values.**  

If you enter a seed value of 0 into the [visualizer from part 1 of the series](lfsr-noise-part-1.md#core-algorithm-step-by-step "LFSR Core Algorithm with visualizer"), every output value will be 0. All of the previous versions used a seed value of ```0x7fff``` and had a fixed width, so the register never had a chance to fall into an invalid state. Once the width becomes user‑controlled, the register can legitimately shift into the all‑zero, terminal-state pattern.


## Terminal State Guard and Reset

We'll need to add a guard that checks the internal state and then *resets it* to a valid state if it ever does reach zero. We'll start by adding a ```seed``` to the constructor that will be both our initial state and a safe value to reset to if the state reaches 0. We can just use ```1``` since it's valid for any conceivable shift register.
<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript (AudioWorklet)"}'>
```cpp
class LFSRNoise {
    LFSRNoise() : mSeed(1u), mState(mSeed) {}
private:
    // ...
    uint32_t mSeed;
    uint32_t mState;
};
```

```js
constructor() {
    this.seed = 1; // it makes more sense to initialize the value as seed...
    this.state = this.seed; // ...then assign it directly
}
```
</div>

We'll separate the zero-check function and the reset function to allow the user to manually reset the state.

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
    const lsb1 = (this.state >>> 1) & 1;
    const fb = lsb0 ^ lsb1;
    this.state = (this.state >>> 1) | (fb << 14);
}
```
</div>

## Variable Width

With a terminal state guard in place, we can now safely parameterize the register width. Since we're using a 32-bit integer to store the register state, the width is limited to 32 bits. Setting a minimum width of 3 prevents the feedback bit from overwriting one of the taps. We can write a width guard like this:

<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript (AudioWorklet)"}'>
```cpp
width = std::min(std::max(width, 3), 32);
```

```js
width = Math.min(Math.max(width, 3), 32);
```
</div>

### Width vs Index

It's important to note that we don't use ```width``` directly in the last line of the step function. We need to use ```width - 1``` since we need an *index value* for the feedback. That's why we used ```(fb << 14)``` for the 15-bit LFSR.  

### Bitmasking

To keep the register truly confined to the selected width, we need to zero out any bits above that width after each step. This is done with a **bitmask** like so:  
```
mask = (1 << width) - 1

// calculate feedback bit
// right shift LFSR
// insert feedback bit

state &= mask; // keeps the register N-bit
```
#### Why this matters:  
Say we're using a 32-bit integer for our state, the width parameter is currently set to 32, and we reach a state where only the leftmost bit is set. Internally: ```1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0``` or as a decimal 2147483648.

**Then the user sets the width parameter to 3...**  

We *should* effectively end up with ```0 0 0``` after the right shift. A 3-bit integer of all zeros **should not pass the zero check**. Without bitmasking, we still have bits outside of the expected register width. The state is internally: ```0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0``` or as a decimal 1073741824.  

**1073741824 passes the zero-check.**

In fact, it will *continue* to pass the zero check in what is effectively a terminal state *28 more times* before the only set bit in the register gets cleared by the feedback bit.

 ** *Note that the SuperCollider plugin doesn't do any bitmasking. Its internal logic is a bit different from what we'll end up with here.*

## Variable Width Step Function

The ideal conceptual model for the step function is:
```
step() {
    feedback = lsb0 ^ lsb1; // same as before
    state = (state >> 1) | (feedback << index); // where index is width - 1
    state &= mask;
}
```

Notice we never use ```width``` directly in any of the core LFSR logic, but that doesn't mean it's dispensible -- it matters to the *user*. The ```mask``` and ```index``` are both *derived* from the ```width``` and only matter to the processor. We'll add all three as member variables, but since two of them are derivative we can encapsulate all of the width logic in one setter function that handles everything internally.

<div data-codegroup markdown="1" data-labels='{"cpp":"C++","javascript":"JavaScript (AudioWorklet)"}'>
```cpp
class LFSRNoise {
public:
    // ...
    void setWidth(int w) {
        // set width
        mWidth = std::min(std::max(w, 3), 32);

        // calculate mask and index
        mFbIndex = mWidth - 1;
        mMask = (1u << mWidth) - 1u;
    }
private:
    // ...
    int mWidth;
    uint32_t mFbIndex;
    uint32_t mMask;
}
```

```js
constructor(w = 15) {
    // declare member variables
    this.width = null;
    this.fbIndex = null;
    this.mask = null;

    // let the setter handle assigning values
    this.setWidth(w);
}

setWidth(w) {
    // clamp width
    this.width = Math.min(Math.max(w, 3), 32);

    // calculate index of the top bit
    this.fbIndex = this.width - 1;

    // calculate mask (special case for 32 bits)
    this.mask = (this.width === 32)
        ? 0xFFFFFFFF
        : (1 << this.width) - 1;
}
```
</div>

**JavaScript bitwise operators operate on 32‑bit *signed* integers, so shifting ```1 << 32``` wraps around. That’s why we handle the 32‑bit case explicitly.

## Full Implementation

For the full implementation, we'll add a new width control and a reset trigger so the register can be manually reset.

<div data-codegroup markdown="1" data-labels='{"cpp":"C++ ","javascript":"JavaScript (AudioWorklet)"}'>

```cpp
class LFSRNoise {
public:
    LFSRNoise(int w)
        : mSeed(1u),
          mState(mSeed),
          mAmp(1.f),
          mPhase(0.f)
    {
        setWidth(w);
    }

    void setAmp(float a) { 
        mAmp = a; 
    }

    void setWidth(int w) {
        mWidth = std::min(std::max(w, 3), 32);

        mFbIndex = mWidth - 1;

        mMask = (mWidth == 32)
            ? 0xFFFFFFFFu
            : (1u << mWidth) - 1u;

        mState &= mMask;
    }

    bool isTerminalState() const {
        return mState == 0;
    }

    void reset() {
        mState = mSeed;
    }

    void step() {
        if (isTerminalState()) {
            reset();
        }

        const uint32_t lsb0 = mState & 1u;
        const uint32_t lsb1 = (mState >> 1) & 1u;
        const uint32_t fb   = lsb0 ^ lsb1;

        mState = (mState >> 1) | (fb << mFbIndex);
        mState &= mMask;
    }

    float nextSample(float freq, float sampleRate) {
        const float f = std::max(0.0f, std::min(freq, sampleRate));
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
    uint32_t  mSeed;
    uint32_t  mState;

    int       mWidth;
    uint32_t  mFbIndex;
    uint32_t  mMask;

    float     mAmp;
    float     mPhase;
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
        automationRate: "a-rate",
      },
      {
        name: "frequency",
        defaultValue: 440,
        minValue: 0,
        maxValue: 48000,
        automationRate: "a-rate",
      },
      {
        name: "width",
        defaultValue: 15,
        minValue: 3,
        maxValue: 32,
        automationRate: "k-rate", // width doesn't need to change per-sample
      },
    ];
  }

  constructor() {
    super();

    // core LFSR state
    this.seed = 1;
    this.state = this.seed;
    this.phase = 0.0;

    // width-derived values
    this.width = 15;
    this.fbIndex = null;
    this.mask = null;

    this.setWidth(this.width);
  }

  isTerminalState() {
    return this.state === 0;
  }

  reset() {
    this.state = this.seed;
  }

  setWidth(w) {
    // clamp width
    const clamped = Math.min(Math.max(w | 0, 3), 32);

    // if unchanged, bail out
    if (clamped === this.width && this.mask !== null) {
      return;
    }

    this.width = clamped;

    this.fbIndex = this.width - 1;

    this.mask = (this.width === 32)
      ? 0xFFFFFFFF
      : (1 << this.width) - 1;

    this.state &= this.mask;

    this.seed = this.state || 1;
  }

  step() {
    if (this.isTerminalState()) {
      this.reset();
    }

    const lsb0 = this.state & 1;
    const lsb1 = (this.state >>> 1) & 1;
    const fb = lsb0 ^ lsb1;

    this.state = (this.state >>> 1) | (fb << this.fbIndex);
    this.state &= this.mask;
  }

  nextSample(freq) {
    // guard against weird freq inputs
    const f = Math.max(0, Math.min(freq, sampleRate));

    this.phase += f / sampleRate;

    while (this.phase >= 1.0) {
      this.phase -= 1.0;
      this.step();
    }

    const bit = this.state & 1;
    return bit ? 1.0 : -1.0;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const ampParam = parameters.amplitude;
    const freqParam = parameters.frequency;
    const widthParam = parameters.width;

    const isFreqARate = freqParam.length > 1;
    const isWidthKRate = widthParam.length === 1;

    // k-rate width: update once per block
    if (isWidthKRate) {
      this.setWidth(widthParam[0]);
    }

    for (let ch = 0; ch < output.length; ch++) {
      const channel = output[ch];

      for (let i = 0; i < channel.length; i++) {
        const amp = ampParam.length > 1 ? ampParam[i] : ampParam[0];

        // if width is accidentally a-rate, handle it gracefully
        if (!isWidthKRate) {
          this.setWidth(widthParam[i]);
        }

        const freq = isFreqARate ? freqParam[i] : freqParam[0];
        channel[i] = this.nextSample(freq) * amp;
      }
    }

    return true;
  }
}

registerProcessor("lfsr-noise", LfsrNoiseProcessor);
```

---

## Try It Out

<div class="applet lfsr15-audio">
  <iframe class="applet__frame" src="/applets/lfsr/p3/index.html" loading="lazy"></iframe>
</div>

Experiment with different width values to hear how the tonal character changes:
- **3-4 bits**: Very short sequences, almost tonal
- **8-10 bits**: Classic 8-bit game console noise
- **15 bits**: The standard NES/Game Boy noise mode
- **24-32 bits**: Approaching white noise with extremely long periods

Try the reset button to manually reset the LFSR state back to its seed value. This demonstrates the terminal state protection working in practice.