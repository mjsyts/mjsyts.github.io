---
layout: post
title: "Four Approaches to Sine Waves"
date: 2026-01-31
last_modified_at: 2026-01-31
permalink: /development/sine-wave-generation/
tags: [dsp, sine, oscillator, filter, wavetable, synthesis, c++]
published: true
desc: "An overview and comparison of digital sine wave generation techniques."
thumb: "/assets/images/thumbs/development/sine.jpg"
---

## Motivation and Scope
Digital audio synthesis requires sine wave generation for oscillators, LFOs and other modulation sources, and wavetable interpolation. The standard library `sin()` function is accurate but expensive. When generating thousands of samples per second across multiple voices, faster alternatives matter. This article compares practical sine generation techniques and their suitability for different applications.

## Overview

| Method | Variant | Accuracy | Speed | Memory | FM/PM | Best For |
|--------|---------|----------|-------|--------|-------|----------|
| [**Direct**](#direct-evaluation) | `std::sinf()` | Excellent | Moderate | None | Excellent | General purpose, prototyping, single LFO |
| [**Table**](#table) | [Linear interpolation](#linear-interpolation) | Good | Fast | 4-16KB | Good | Multiple oscillators |
| | [Cubic interpolation](#cubic-interpolation) | Excellent | Fast | 4-16KB | Excellent | High-quality synthesis |
| [**Polynomial**](#polynomial) | [Taylor (low-order)](#taylor-series) | Fair-Good | Fast | None | Fair-Good | Embedded, simple LFOs |
| | [Minimax](#minimax-approximation) | Good-Excellent | Fast | None | Good-Excellent | Quality/speed balance |
| [**Resonator**](#resonator) | [IIR (magic circle)](#iir-resonator-magic-circle) | Good | Fastest | None | Poor | Fixed-frequency LFOs |
| | [SVF](#svf-resonator) | Good | Fastest | None | Fair | Modulation sources |

## Phase Accumulation

All sine generation techniques require a continuously advancing phase value. We normalize phase to the range [0, 1) and increment it each sample by `frequency / sample_rate`. The technique-specific code converts this phase to a sine value.

```cpp
// Basic phase accumulator used in all examples
float phase = 0.f;
float phase_increment = frequency / sample_rate;

float next_sample() {
    // [technique-specific code goes here]
    
    phase += phase_increment;
    if (phase >= 1.f) phase -= 1.f;
    
    return output;
}
```
<p style="font-style: italic;">
**This assumes <code>frequency</code> does not exceed <code>sample_rate</code>. We're also using conditional subtraction for wrapping as opposed to fractional wrapping for efficiency. For more information about phase accumulation see <a href="https://www.mjsyts.com/development/oscillators-part-2">Oscillators — Part 2: Oscillator Phase and Numerical Behavior</a>.
</p>

## Direct Evaluation

We use `std::sinf()` for single-precision calculation, which matches typical audio processing workflows and avoids unnecessary double-precision conversions.[^cpp]

```cpp
#include <cmath>

inline float sine_direct(float phase) {
    return std::sinf(phase * 2.f * M_PI);
}
```

## Table

Using a lookup table is much faster than direct evaluation, but requires storing precomputed sine values in memory. We precompute `sin()` for evenly-spaced phase values, then use the current phase to index into the table.  

The table should be shared across all oscillator instances within your code. Constructing a separate table per oscillator wastes memory and initialization time. In modular environments like [VCV Rack](https://vcvrack.com/ "VCV Rack"), each plugin is a self-contained library, so even with a singleton pattern, you may end up with multiple sine tables in memory if different developers each implement their own. This is one reason VCV Rack's core library uses polynomial approximation instead.[^belt]

<p style="font-style: italic;">**SuperCollider uses a lookup table for <a href="https://doc.sccode.org/Classes/SinOsc.html">the <code>SinOsc</code> UGen</a>.</p>

### Lookup Table

This is an example implementation of a static singleton pattern for a lookup table with 2048 values.[^meyers] A table size of 2048 provides good balance between memory usage (8KB) and interpolation accuracy. Smaller tables require better interpolation. Larger tables waste memory for diminishing returns.  

```cpp
#include <array>

// Sine lookup table (constructed once, shared across all oscillators)
class SineTable {
public:
    static constexpr size_t SIZE = 2048;
    
    static const SineTable& instance() {
        static SineTable table;
        return table;
    }
    
    float operator[](size_t index) const {
        return data[index];
    }
    
    size_t size() const { return SIZE; }
    
private:
    std::array<float, SIZE> data;
    
    SineTable() {
        for (size_t i = 0; i < SIZE; ++i) {
            data[i] = std::sinf(2.f * M_PI * i / SIZE);
        }
    }
    
    // Prevent copying
    SineTable(const SineTable&) = delete;
    SineTable& operator=(const SineTable&) = delete;
};
```

### Linear Interpolation

Linear interpolation draws a straight line between adjacent table entries. It's the simplest and fastest interpolation method.
```cpp
inline float sine_table_linear(float phase) {
    const auto& table = SineTable::instance();
    
    float index_float = phase * table.size();
    size_t i0 = static_cast<size_t>(index_float);
    size_t i1 = (i0 + 1) % table.size();
    float frac = index_float - i0;
    
    return table[i0] + frac * (table[i1] - table[i0]);
}
```

### Cubic Interpolation

Cubic Hermite interpolation fits a smooth curve through four points, providing significantly better accuracy than linear interpolation.
```cpp
inline float sine_table_cubic(float phase) {
    const auto& table = SineTable::instance();
    
    float index_float = phase * table.size();
    size_t i1 = static_cast<size_t>(index_float);
    size_t i0 = (i1 - 1 + table.size()) % table.size();
    size_t i2 = (i1 + 1) % table.size();
    size_t i3 = (i1 + 2) % table.size();
    float frac = index_float - i1;
    
    // Cubic Hermite interpolation
    float y0 = table[i0], y1 = table[i1], y2 = table[i2], y3 = table[i3];
    float c0 = y1;
    float c1 = 0.5f * (y2 - y0);
    float c2 = y0 - 2.5f * y1 + 2.f * y2 - 0.5f * y3;
    float c3 = 0.5f * (y3 - y0) + 1.5f * (y1 - y2);
    
    return c0 + c1 * frac + c2 * frac * frac + c3 * frac * frac * frac;
}
```

### Linear vs. Cubic: Performance and Quality Tradeoffs

Linear interpolation is fast (one multiply, one add per sample) but introduces higher-frequency error, particularly audible in applications requiring high spectral purity.

Cubic interpolation produces significantly lower harmonic distortion at the cost of roughly 3-4× the computational cost. For high-quality oscillators or modulation sources where phase may change rapidly (FM/PM synthesis), cubic interpolation is worth the overhead.

**Rule of thumb:** Use linear for LFOs and simple modulation. Use cubic for audio-rate oscillators or anywhere aliasing/distortion matters.

## Polynomial

Polynomial approximations use mathematical series to compute sine values without trigonometric functions or lookup tables. They trade some accuracy for speed and zero memory overhead, making them popular in embedded systems and environments where memory is at a premium.

### Taylor Series

The Taylor series expansion of sine around zero is:

$$\sin(x) = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \frac{x^7}{7!} + ...$$

For audio applications, a 5th or 7th order approximation typically provides acceptable accuracy while remaining computationally cheap.
```cpp
inline float sine_taylor(float phase) {
    float x = phase * 2.f * M_PI;
    
    // Normalize to [-π, π] for better accuracy
    while (x > M_PI) x -= 2.f * M_PI;
    while (x < -M_PI) x += 2.f * M_PI;
    
    // 7th order Taylor series
    float x2 = x * x;
    return x * (1.f - x2 * (1.f/6.f - x2 * (1.f/120.f - x2 * (1.f/5040.f))));
}
```

### Minimax Approximation

Minimax polynomials are optimized to minimize the maximum error over a given range, providing better accuracy than Taylor series for the same polynomial degree. These coefficients are typically derived using the Remez exchange algorithm.[^remez]

```cpp
inline float sine_minimax(float phase) {
    float x = phase * 2.f * M_PI;
    
    // Normalize to [-π, π]
    while (x > M_PI) x -= 2.f * M_PI;
    while (x < -M_PI) x += 2.f * M_PI;
    
    // 7th order minimax approximation
    // Coefficients generated using Remez exchange algorithm in Python
    float x2 = x * x;
    return x * (0.99869644f + x2 * (-0.16520112f + x2 * (0.00786412f + x2 * -0.00013966f)));
}
```

<p style="font-style: italic;">**The normalization to [-π, π] is important for accuracy—polynomials behave poorly for large inputs.</p>

### Taylor vs. Minimax

Taylor series are mathematically elegant and easy to derive, but minimax polynomials provide superior accuracy for the same computational cost. For production code, use minimax. For educational purposes or quick prototyping, Taylor series are fine. VCV currently (as of January 2026) uses a 9th-order Taylor approximation.[^belt]

## Resonator

Resonator methods generate sine waves by implementing a digital filter that naturally oscillates at a specific frequency. Unlike other methods, resonators maintain internal state and are most efficient for generating continuous waveforms at a fixed frequency. They're ideal for LFOs and modulation sources that don't require frequent frequency changes. The implementations below use a full class as opposed to inlining the function, since they are derived from a ringing filter.  

<p style="font-style: italic;">**SuperCollider uses a ringing filter for <a href="https://doc.sccode.org/Classes/FSinOsc.html">the <code>FSinOsc</code> UGen</a>.</p>

### IIR Resonator (Magic Circle)

The IIR resonator (often called the "magic circle" algorithm) uses a simple two-pole filter that oscillates indefinitely. It requires only two state variables and two multiplies per sample, making it extremely fast.[^chamberlin]

The resonator is initialized with a frequency-dependent coefficient and two initial states. The downside is numerical drift—over long periods, amplitude and frequency can slowly drift due to floating-point rounding errors.
```cpp
class SineIIR {
    float y1 = 1.f;  // Initialize with unit amplitude
    float y2 = 0.f;
    float coeff;
    
public:
    SineIIR(float freq, float sample_rate) {
        // coefficient = 2 * cos(2π * freq / sample_rate)
        coeff = 2.f * std::cosf(2.f * M_PI * freq / sample_rate);
    }
    
    float process() {
        float output = coeff * y1 - y2;
        y2 = y1;
        y1 = output;
        return output;
    }
};
```

### SVF Resonator

The State Variable Filter (SVF) configured as an oscillator provides better stability than the IIR magic circle while maintaining similar efficiency.[^chamberlin] It uses three state variables and is less prone to amplitude drift.
```cpp
class SineSVF {
    float low = 0.f;
    float band = 1.f;  // Initialize for unit amplitude
    float freq_coeff;
    
public:
    SineSVF(float freq, float sample_rate) {
        // frequency coefficient
        freq_coeff = 2.f * std::sinf(M_PI * freq / sample_rate);
    }
    
    float process() {
        low += freq_coeff * band;
        float high = -low - band;
        band += freq_coeff * high;
        return low;  // Sine output from lowpass
    }
};
```

### IIR vs. SVF: Stability and Use Cases

The IIR magic circle is the absolute fastest method—only two multiplies and one subtract per sample. However, it suffers from numerical drift over time. Amplitude can grow or decay, and frequency can shift slightly. For short-duration modulation or effects where you can periodically reset the oscillator, this is acceptable.

The SVF resonator is slightly more expensive (four multiplies, three adds) but significantly more stable. It's better suited for continuous operation like persistent LFOs or long-running modulation sources.

**Critical limitation:** Both methods require **re-initialization when frequency changes**. Changing the coefficient mid-stream causes phase discontinuities. This makes them unsuitable for FM/PM synthesis or any application requiring smooth frequency modulation. Use them only for fixed-frequency or slowly-changing modulation sources.

**Rule of thumb:** Use IIR for short-duration effects where you can reset periodically. Use SVF for continuous LFOs. Never use either for frequency-modulated oscillators.

## Honorable Mentions

The following methods are valid but impractical for most audio applications:
- **CORDIC**: Iterative algorithm suited for hardware/FPGA, too slow for software
- **FFT Synthesis**: Generates sine via inverse FFT - massive overkill for single oscillators
- **Triangle Waveshaping**: Maps triangle wave through transfer function - limited practical use

## Notes

[^cpp]: C++ Reference. "sin." *cplusplus.com*. [https://cplusplus.com/reference/cmath/sin/](https://cplusplus.com/reference/cmath/sin/).

[^belt]: Belt, Andrew. "VCO." *VCV Rack*. Source code, 2026. [https://github.com/VCVRack/Fundamental/blob/v2/src/VCO.cpp](https://github.com/VCVRack/Fundamental/blob/v2/src/VCO.cpp).

[^meyers]: Meyers, Scott. *Effective C++*. Addison-Wesley, 2005. [https://www.informit.com/store/effective-c-plus-plus-55-specific-ways-to-improve-your-9780321334879](https://www.informit.com/store/effective-c-plus-plus-55-specific-ways-to-improve-your-9780321334879).

[^remez]: Remez, Eugene. "Sur la calcul effectiv des polynomes d'approximation de Tschebyscheff." *Comptes Rendus de l'Académie des Sciences*, 1934. For a modern treatment see: Powell, M. J. D. *Approximation Theory and Methods*. Cambridge University Press, 1981. 

[^chamberlin]: Chamberlin, Hal. *Musical Applications of Microprocessors*. Hayden Books, 1985. [https://www.amazon.com/Musical-Applications-Microprocessors-Hal-Chamberlin/dp/0810457687](https://www.amazon.com/Musical-Applications-Microprocessors-Hal-Chamberlin/dp/0810457687)