---
layout: post
title: "Syntax Highlighting Test"
date: 2026-01-10
tags: [test, syntax]
excerpt: "Test page for verifying C/C++ and JavaScript syntax highlighting, especially numeric literals with suffixes."
---

## C++ Numeric Literals Test

This page tests the syntax highlighting for various numeric literal formats in C++ and JavaScript.

### Float Literals with Suffix

```cpp
float a = 1.f;
float b = 1.0f;
float c = 3.14159f;
float d = .5f;
double e = 1.0;
```

### Integer Literals with Suffixes

```cpp
unsigned int a = 10u;
unsigned long b = 10ul;
unsigned long long c = 10ull;
long d = 10l;
long long e = 10ll;
```

### Hexadecimal Literals with Suffixes

```cpp
unsigned int hex1 = 0xFFu;
unsigned long hex2 = 0xDEADBEEFul;
unsigned int hex3 = 0x7FFFu;
```

### Mixed Example (From LFSR Code)

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

  void process(float* out, int numSamples) {
    for (int i = 0; i < numSamples; ++i) {
      step();
      const float sample = (mState & 1u) ? 1.f : -1.f;
      out[i] = sample * mAmp;
    }
  }

private:
  uint32_t mState = 0x7fffu;
  float mAmp = 0.10f;
};
```

## C Numeric Literals Test

```c
#include <stdint.h>

void test_numerics() {
  uint32_t mask = 0xFFFFu;
  float ratio = 0.5f;
  int count = 100;
  unsigned long flags = 0x01ul | 0x02ul;
  
  if (count > 50u) {
    ratio = 1.0f;
  }
}
```

## JavaScript Numeric Literals Test

JavaScript doesn't use type suffixes, but we should ensure numbers look good here too.

```javascript
// Integer literals
const decimal = 123;
const hex = 0xFF;
const octal = 0o77;
const binary = 0b1010;

// Float literals
const pi = 3.14159;
const scientific = 1.5e10;
const fraction = 0.5;

// BigInt (with suffix n)
const bigInt = 9007199254740991n;
const bigHex = 0xFFFFFFFFFFFFn;

// In context
function calculate(x, y) {
  return x * 2.5 + y / 1.5;
}

const result = calculate(10, 20);
```

## TypeScript Example

```typescript
interface Point {
  x: number;
  y: number;
}

const origin: Point = {
  x: 0.0,
  y: 0.0
};

function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const d = distance(origin, { x: 3.0, y: 4.0 });
console.log(`Distance: ${d}`);
```

## Expected Behavior

- All numeric literals should have consistent coloring (gold/amber tone)
- In C/C++, suffixes like `f`, `u`, `ul`, `ull`, `l`, `ll` should be the same color as the number
- Hexadecimal, octal, and binary literals should be colored consistently
- JavaScript numbers should also use the gold color
- The gold color should have good contrast against the code block background
