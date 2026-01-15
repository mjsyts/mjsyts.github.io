# mjsyts.github.io

Personal website for M. Josiah Sytsma.

Built with Jekyll and hosted on GitHub Pages.
Includes long-form writing, sound design posts, and interactive WebAudio applets.

## Local development

```bash
bundle install
bundle exec jekyll serve
```

The site will be available at the local URL printed by Jekyll.

### Publishing articles

1. **Set publish date**: Update the `date` field in the article's frontmatter to the intended publication date
2. **Set published flag**: Change `published: false` to `published: true` in the frontmatter
3. **Commit and push**: The article will be live on GitHub Pages

### Queueing email notifications

After publishing a new article, add an entry to `_data/notify_queue.yml`:

```yaml
- id: YYYY-MM-DD-article-slug
  post: /development/article-permalink/   # article URL path
  type: new_article                       # new_article | update | milestone
  subject: "Your article title is live!"
  excerpt: "Brief description for the email"
  audience: dsp                           # dsp | sound_design | both
  status: queued                          # queued | sent
  created_at: YYYY-MM-DD
```

When the email is sent through MailerLite, update `status: queued` to `status: sent`.

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
