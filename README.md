# mjsyts.github.io

Personal website for M. Josiah Sytsma.

Built with Jekyll and hosted on GitHub Pages.
Includes long-form writing, sound design posts, and interactive WebAudio applets.

## Local development

bundle install
bundle exec jekyll serve

The site will be available at the local URL printed by Jekyll.

## Repository structure

```
mjsyts.github.io/
├── _includes/          # Jekyll template partials (head, header, nav, footer, etc.)
├── _layouts/           # Jekyll page layouts (default, post)
├── _data/              # Structured site data (archives, metadata)
├── _development/       # Development blog posts (Jekyll collection)
├── applets/            # Interactive WebAudio demos and DSP visualizations
│   ├── lfsr/          # LFSR noise generator applet
│   ├── _host/         # Applet hosting CSS
│   └── shared/        # Shared applet utilities and theme
├── assets/             # Site-wide static assets
│   ├── css/           # Stylesheets
│   │   ├── base/      # Base styles (tokens, fonts, code tokens)
│   │   ├── components/ # Component styles (codeblocks, header, nav, etc.)
│   │   ├── pages/     # Page-specific styles
│   │   └── vendor/    # Third-party styles (Rouge syntax highlighting)
│   ├── js/            # JavaScript
│   │   ├── codeblocks.js        # Code block enhancements (tabs, copy, collapse)
│   │   ├── header-metrics.js     # Header size calculations
│   │   ├── chameleon-eye.js      # Eye animation
│   │   └── contact-form.js       # Contact form handling
│   ├── fonts/         # Custom web fonts
│   ├── images/        # Site images
│   └── favicon/       # Favicon files
├── sound-design/       # Sound design portfolio pages
├── development/        # Development section landing page
├── index.html          # Homepage
├── _config.yml         # Jekyll configuration
└── Gemfile             # Ruby dependencies
```

## Notes

- Applet code is intentionally isolated from site-wide JS.
- GitHub Pages–compatible (no custom Jekyll plugins).
