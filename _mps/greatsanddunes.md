---
title: Great Sand Dunes Bitcrusher
tier: free
tags: [distortion, digital, effect, waveshaper, filter, polyphonic]
tagline: "Bitcrushing/downsampling distortion"
type: Bitcrusher
order: 5
hp: 9
accent: "#24313d"
panel: greatsanddunes.webp
panel_dark: greatsanddunes-dark.webp
sitemap: false
robots: noindex
---

## Overview
Gritty, sandy bitcrushing distortion. Reduces the bit depth and sample rate before passing the output to a lowpass tone control filter.

## Controls
- **DOWN SAMPLE**: Divides the sample rate by 1 to 32. At the minimum it does nothing.
- **BITCRUSH**: Reduces bit depth from 23 bits down to 2 bits.
- **TONE**: Lowpass filter cutoff, 20 Hz to 20 kHz. It sits at the end of the signal path and defaults to fully open.
- **DOWN (attenuverter)**: Scales and inverts the DOWN input, -100% to 100%.
- **CRUSH (attenuverter)**: Scales and inverts the CRUSH input, -100% to 100%.
- **TONE (attenuverter)**: Scales and inverts the TONE input, -100% to 100%.
- **INTERP**: Latch with light. When on, the downsampler interpolates linearly between samples instead of holding each one.

## Inputs
- **IN**: Audio input, polyphonic. 5 V is full scale.
- **DOWN**: Downsample CV, polyphonic. 10 V sweeps the full range at full attenuation.
- **CRUSH**: Bitcrush CV, polyphonic. 10 V sweeps the full range at full attenuation.
- **TONE**: Cutoff CV, polyphonic. 10 V sweeps the full range at full attenuation.

## Outputs
- **OUT**: Audio output, ±5 V, with as many channels as IN. It outputs silence when IN is unpatched.

## Tips
- BITCRUSH can also act as an equal-division quantizer. Patch a 1 V/oct signal into IN, set DOWN SAMPLE to 1× and TONE fully open, then set BITCRUSH to the bit depth for the scale you want:

| Scale/Tuning           | Bit depth |
| ---------------        | --------- |
| Whole Tone (6-EDO)     | 4.91      |
| Bohlen-Pierce          | 5.36      |
| Chromatic (12-EDO)     | 5.91      |
| 19-EDO                 | 6.57      |
| Quarter-Tone (24-EDO)  | 6.91      |
| 31-EDO.                | 7.28      |

- Create aliasing artifacts on high frequencies by turning up DOWN SAMPLE.

## About the Park
The dunes of Great Sand Dunes National Park create a deep humming sound when sand avalanches down their faces and air moves between the tumbling grains, giving them the nickname "the singing sands." This is one of very few places in the world where this phenomenon can be observed.