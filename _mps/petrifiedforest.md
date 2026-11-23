---
title: Petrified Forest Sample and Hold
tier: free
tags: [sample and hold, random, noise, polyphonic]
tagline: "Sample and hold with jitter control"
type: Sample & Hold
order: 6
hp: 11
accent: "#694150"
panel: petrifiedforest.webp
panel_w: 660
panel_dark: petrifiedforest-dark.webp
sitemap: false
robots: noindex
---

## Overview
Petrified Forest is a four-stage polyphonic sample and hold. Each stage samples its input on a trigger and holds the value until the next one. With nothing patched to IN, a stage samples random voltages instead. AMOUNT adds jitter to the held value and BIAS offsets it. PUSH triggers a stage by hand, and also triggers every stage below it.

## Controls
- **PUSH** (1–4): Triggers its stage by hand. Pushing a stage also triggers every stage below it.
- **AMOUNT** (1–4): Adds random jitter to the held value, from 0% to 100%. At 100%, each sample is offset by a random amount up to ±1 V.
- **BIAS** (1–4): Adds a fixed offset to the held value, from -5 V to 5 V.

## Inputs
- **IN** (1–4): Signal to sample, polyphonic. When nothing is patched, the stage samples random voltages between ±5 V instead.
- **TRIG** (1–4): Trigger input, polyphonic. A rising edge through about 1 V samples the stage's input.

## Outputs
- **OUT** (1–4): Held value, polyphonic, with as many channels as IN. When IN is unpatched, it outputs one channel.

## Tips
- A fast clock into TRIG with IN patched gives a sample-rate-reduced, stepped version of the input. Increasing AMOUNT will add a bit of noise.

## About the Park
Petrified Forest is one of the world's largest deposits of fossilized trees that date to the Late Triassic (205-225 million years ago).