# mjsyts.github.io

Personal website for M. Josiah Sytsma.

Built with Jekyll and hosted on GitHub Pages.
Includes long-form writing, sound design posts, and interactive WebAudio applets.

## Local development

bundle install
bundle exec jekyll serve

The site will be available at the local URL printed by Jekyll.

## Repository structure

- _includes/, _layouts/ — Jekyll templates
- _data/ — structured site data (archives, metadata)
- assets/ — site-wide CSS, JS, fonts, images
- applets/ — interactive WebAudio demos and DSP code
  - demos/ — standalone demo pages
  - dsp/ — AudioWorklet processors and DSP modules
  - lib/ — shared applet utilities
- tools/ — build and automation scripts (not used at runtime)

## Notes

- Applet code is intentionally isolated from site-wide JS.
- GitHub Pages–compatible (no custom Jekyll plugins).
