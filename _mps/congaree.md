---
title: Congaree
type: Saw VCO
tagline: A Kuramoto saw bank that sounds like a swamp at dusk.
order: 1
tier: Premium
hp: 9
accent: "#5b7a4a"
panel: congaree.webp
---
Congaree is a bank of band-limited sawtooth oscillators that pull on each other the way fireflies synchronize. Spread them apart and you get a thick, drifting chorus. Pull them together and they bunch into a single, huge voice.

## Controls

| Control | What it does |
| --- | --- |
| **FREQ** | Center pitch of the bank. |
| **SWARM** | How far the oscillators are spread apart in pitch. Low is nearly a single saw; high is a wide, drifting cloud. |
| **PULL** | How strongly the oscillators drag on each other. Low lets them run free; high locks them together and the beating collapses. |
| **VCO / LFO** | Switches the bank between audio range and low-frequency range. |
| **SOFT** | Latch. Sync is hard by default; lit, it becomes soft sync. |
| **LFM** | Latch. FM is 1 V/octave by default; lit, it becomes linear FM. |

FREQ, PULL and SWARM each have an attenuverter, the small pot above their input jack. It sets how much of the incoming CV is applied, and can invert it.

## Jacks

| Jack | Type | Notes |
| --- | --- | --- |
| **V/OCT** | In | 1 V/octave pitch. Polyphonic: the output carries as many voices as this cable. |
| **FREQ** | In | Frequency modulation, scaled by its attenuverter. Exponential or linear depending on LFM. |
| **SWARM** | In | CV for SWARM. 10 V sweeps the full range at full attenuverter. |
| **PULL** | In | CV for PULL. 10 V sweeps the full range at full attenuverter. |
| **SYNC** | In | Syncs the bank to the incoming signal. Hard or soft depending on SOFT. |
| **OUT** | Out | The summed bank. |

## Patch ideas

- Sweep PULL with a slow LFO to move between a wide swarm and a single voice.
- Patch an envelope into SWARM so each note opens wide and then tightens.
- Set VCO / LFO to LFO and use the bank as a slow, shifting modulation source.
