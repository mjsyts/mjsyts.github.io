---
title: Congaree
tagline: A Kuramoto saw bank that sounds like a swamp at dusk.
order: 1
tier: Premium
hp: 10
accent: "#5b7a4a"
---
Congaree is a bank of band-limited sawtooth oscillators that pull on each other the way fireflies synchronize. Spread them apart and you get a thick, drifting chorus. Pull them together and they bunch into a single, huge voice.

## Controls

| Control | What it does |
| --- | --- |
| **FREQ** | Center pitch of the bank. |
| **FAT** | Spread of the detune across the oscillators. Low is nearly a single saw; high is a wide, bunched cloud. |
| **COHERENCE** | Coupling strength. At zero the oscillators run free; as it rises they lock toward each other and the beating collapses. |
| **VCO / LFO** | Switches the bank between audio range and low-frequency range. |

FAT and COHERENCE each have a CV jack with an attenuator pot.

## Jacks

| Jack | Type | Notes |
| --- | --- | --- |
| **V/OCT** | In | 1 V/octave pitch. |
| **LFM** | In | Linear frequency modulation. |
| **SYNC** | In | Hard sync. |
| **SOFT** | In | Soft sync. |
| **FREQ CV** | In | Modulates FREQ. |
| **FAT CV** | In | Modulates FAT. |
| **COHERENCE CV** | In | Modulates COHERENCE. |
| **OUT** | Out | The summed bank. |

## Patch ideas

- Sweep COHERENCE with a slow LFO to move between swarm and single voice.
- Patch an envelope into FAT so each note opens wide and then tightens.
- Set VCO / LFO to LFO and use the bank as a slow, shifting modulation source.
