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

## Citations & References

This site uses Markdown footnotes (via kramdown) for citations.

---

### Inline citations

Use footnote references inline:

```
Aliasing is unavoidable at discontinuities.[^stilson99]
```

The text inside `[^ ]` is an identifier only (not displayed).
Use short, lowercase, meaningful IDs.

Good examples:

* `[^stilson99]`
* `[^follin_gdc]`
* `[^smith_blep]`

Avoid numeric or vague IDs.

---

### Footnote definitions

Define footnotes at the **bottom of the Markdown file**:

```
[^stilson99]: Stilson, Timothy, and Julius O. Smith. *Alias-Free Digital Synthesis of Classic Analog Waveforms*. CCRMA, 1999. https://ccrma.stanford.edu/~stilti/papers/blit.pdf
```

Footnotes may be reused multiple times in a post by referencing the same ID.

---

### Formatting style

Use the following format consistently:

```md
Last, First. *Title*. Publisher / Venue, Year. [URL](URL).
```

Guidelines:

* Author names: Last, First
* Titles: italicized
* URLs: placed at the end
* Do not hyperlink the entire entry
* Omit access dates unless the source is volatile

Examples:

```
[^roads96]: Roads, Curtis. *The Computer Music Tutorial*. MIT Press, 1996.
[^follin_gdc]: Follin, Tim. *Composing for the NES*. Game Developers Conference, 2018. https://www.youtube.com/watch?v=XXXX
```

---

### Multiple citations

Multiple sources may be cited in a single location:

```
This approach is well documented.[^stilson99][^smith_phd]
```

---

### Works Cited (optional)

For source-heavy posts, a dedicated references section may be used:

```
## Works Cited
{: .refs }
```

Entries are formatted the same way as footnotes.

---

### Styling

Citation styling is handled globally via `citations.css`.
No per-post HTML or CSS is required.


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
