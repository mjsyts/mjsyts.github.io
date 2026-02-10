---
layout: post
title: "Filters — Part 1: The Frequency Domain and Why It Matters"
date: 2026-02-10
last_modified_at: 2026-02-10
series: "Filters"
part: 1
published: true
permalink: /development/filters-part-1/
tags: [dsp, filter, fft, fourier, webaudio, synthesis, c++]
desc: "Understanding the frequency domain, Fourier transforms, and the spectral view of sound that makes filtering possible."
thumb: "/assets/images/thumbs/development/filter.jpg"
---

## The Time Domain

You've recorded an electric guitar part but there's a 60 Hz hum bleeding through from the power supply. When looking at the signal as a **waveform** (amplitude over time) there's no way to separate the hum from the guitar. This representation — amplitude as a function of time - is called the **time domain**.

## The Fourier Insight

To understand how we can separate the hum from the guitar, we need a different way of looking at the signal. The key insight comes from Fourier:

> **Any signal can be represented as a sum of sine waves at different frequencies, amplitudes, and phases.**[^oppenheim] [^smith]

This isn't a recipe for approximating a signal — it's exact. A guitar note, white noise, drum hits, *any* sound can be decomposed in this way.

The **Fourier transform** decomposes a signal into its frequency components. Given a time-domain signal, it tells you how much of each frequency is present and at what phase.

For sampled audio, we use the **discrete Fourier transform (DFT)**, typically computed via the **Fast Fourier Transform (FFT)** algorithm. The math behind the FFT isn't critical here - what matters is that it converts a block of time-domain samples into a frequency spectrum.

## Time Domain vs Frequency Domain

We record sounds as amplitude over time — the time domain. The Fourier transform gives us the **frequency domain**: amplitude per frequency. Same information, different representation.

In the time domain, the guitar and the 60Hz hum are completely interleaved. In the frequency domain, they appear as separate components. The guitar's harmonics show up as distinct peaks. The hum shows up as a spike at 60Hz.

## Try It Out

Use the applet below to see a signal in both domains simultaneously. The guitar recordings demonstrate how a 60 Hz hum appears as a distinct spike in the frequency domain while remaining invisible in the time domain. You can also switch to microphone input to visualize your own sounds.

<div class="applet applet--lg"> 
    <iframe class="applet__frame" src="/applets/filter/p1/fft/index.html" loading="lazy"></iframe>
</div> 

The spectrum shows which frequencies are present and how loud. A **filter** modifies this spectrum - removing some frequencies, emphasizing others, leaving the rest unchanged. We might use a 60 Hz **notch filter** to remove the power supply hum from an electric guitar recording.

## What's Next

In the next article, we will discuss frequency response and create a simple one-pole filter.

## See Also

### Fundamentals

- [Fourier Transform for Spectral Analysis and Machine Listening - Ted Moore](https://learn.flucoma.org/learn/fourier-transform/)
- [Interactive Explanation of the Fourier Transform - Jack Schaedler](https://jackschaedler.github.io/circles-sines-signals/dft_introduction.html)

### Platform-Specific Implementations

- [CSound](https://csound.com/docs/manual/fft.html)
- [FAUST](https://faustdoc.grame.fr/examples/analysis/#fft)
- [JUCE](https://juce.com/tutorials/tutorial_simple_fft/)
- [MATLAB](https://www.mathworks.com/help/matlab/fourier-analysis-and-filtering.html)
- [Max/MSP](https://docs.cycling74.com/learn/articles/14_analysischapter03/)
- [PureData](http://www.pd-tutorial.com/english/ch03s08.html)
- [SuperCollider](https://doc.sccode.org/Guides/FFT-Overview.html)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)

## Notes

[^oppenheim]: Oppenheim, Alan V., and Ronald W. Schafer. *Discrete-Time Signal Processing*. Pearson, 2010. [https://www.pearson.com/en-us/subject-catalog/p/Oppenheim-Discrete-Time-Signal-Processing-3rd-Edition/P200000003226](https://www.pearson.com/en-us/subject-catalog/p/Oppenheim-Discrete-Time-Signal-Processing-3rd-Edition/P200000003226).

[^smith]: Smith, Steven W. "The Family of Fourier Transform." *The Scientist and Engineer's Guide to Digital Signal Processing*. [https://www.dspguide.com/ch8/1.htm](https://www.dspguide.com/ch8/1.htm).