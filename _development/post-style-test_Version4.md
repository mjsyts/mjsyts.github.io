---
title: "Post Style Test"
description: "A kitchen-sink post to preview typography styles."
published: false
date: 2026-01-12
---

<p class="lead">
This is a <strong>lead paragraph</strong> (optional helper). It should read slightly larger / calmer than normal body text, without shouting.
</p>

This is a normal paragraph with some *emphasis*, some **strong text**, and a link to
[an internal page](/) plus a link to [an external site](https://example.com).
Here is some inline code: `const x = 42;` and `npm run build`.

---

## H2 — Section heading

A paragraph under an H2. The goal is clear structure, comfortable reading width, and consistent spacing.

### H3 — Subsection

Some text under H3.

#### H4 — Minor heading

This is where you often want a “soft” heading style (less dominant), useful for small callouts.

---

## Lists

Unordered list:

- First item
- Second item with **bold**
- Third item with nested list:
  - Nested item A
  - Nested item B

Ordered list:

1. Step one
2. Step two
3. Step three
   1. Sub-step 3.1
   2. Sub-step 3.2

Definition-ish list (not real `<dl>` in Markdown, but common style):

- **Term:** Explanation text that can wrap across lines and show how it looks in a list context.

---

## Blockquote

> This is a blockquote. It should feel like part of the system, not like a different theme.
>
> It can span multiple paragraphs, and it can include a link like [this one](https://example.com).

> A shorter quote can look different if your styles do that.

---

## Callout (optional helper)

<div class="callout">
  <p><strong>Callout:</strong> This is an optional helper box for notes, warnings, or “aside” content.</p>
  <p>It should be calm and readable, not overly loud.</p>
</div>

---

## Code

Inline code already shown above. Here’s a fenced code block:

```js
function greet(name) {
  // A comment
  return `Hello, ${name}!`;
}

console.log(greet("world"));
```

Here’s another with some longer lines to test wrapping/scrolling:

```txt
This is a very long line to test horizontal scrolling behavior in code blocks: 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789
```

---

## Table

| Column A | Column B | Column C |
|---------:|:---------|:---------|
| 1        | left     | normal   |
| 2        | left     | **bold** |
| 3        | left     | `code`   |

If you need wide tables, you can optionally wrap them:

<div class="table-wrap">

| Very long column name | Another long column | Notes |
|---|---|---|
| This cell has a lot of text to see how the table behaves at narrow widths. | More text here. | Even more text. |

</div>

---

## Image / Figure

Plain image:

![Example image alt text](https://via.placeholder.com/1200x600.png?text=Post+Style+Test)

Figure + caption (Markdown doesn’t guarantee `<figure>`, so use HTML if you want consistent captions):

<figure>
  <img src="https://via.placeholder.com/1200x600.png?text=Figure+Example" alt="Figure example" />
  <figcaption>
    This is a <strong>figcaption</strong>. It should look like supportive metadata, not body text.
  </figcaption>
</figure>

---

## Mixed content

A paragraph followed by a list and code:

- A list item with inline code: `git status`
- A list item with a link: [Docs](https://example.com)

```bash
# bash code block
echo "hello"
```

---

## The end

Final paragraph to check bottom spacing, margins, and readability.