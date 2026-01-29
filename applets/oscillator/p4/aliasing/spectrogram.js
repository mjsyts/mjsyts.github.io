export class Spectrogram {
  constructor(canvas, analyser) {
    this.c = canvas;
    this.g = canvas.getContext("2d", { alpha: false });
    this.a = analyser;

    this.buf = new Uint8Array(analyser.frequencyBinCount);
    this.raf = 0;

    // Prefer a CSS variable if you add one later; fallback to your site blue.
    const root = getComputedStyle(document.documentElement);
    this.blue = (root.getPropertyValue("--blue").trim() ||
                 root.getPropertyValue("--accent").trim() ||
                 "#43A0BD");

    this.blueRgb = this._hexToRgb(this.blue) ?? { r: 67, g: 160, b: 189 };

    this.clear();
  }

  _hexToRgb(hex) {
    const h = hex.replace("#", "").trim();
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return { r, g, b };
    }
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return { r, g, b };
    }
    return null;
  }

  clear() {
    this.g.fillStyle = "#fff";
    this.g.fillRect(0, 0, this.c.width, this.c.height);
  }

  start() {
    this.stop();

    const { g, c, a, buf } = this;
    const w = c.width, h = c.height;
    const { r: br, g: bg, b: bb } = this.blueRgb;

    const draw = () => {
      this.raf = requestAnimationFrame(draw);
      a.getByteFrequencyData(buf);

      // scroll left
      g.drawImage(c, -1, 0);

      for (let y = 0; y < h; y++) {
        const t = 1 - y / h;
        const i = Math.floor(Math.pow(t, 2.2) * (buf.length - 1));

        // 0..1 magnitude
        const m = (buf[i] | 0) / 255;

        // simple gamma so quiet stuff is still visible (tweak 1.6–2.4)
        const x = Math.pow(m, 1.8);

        // lerp white -> blue
        const r = Math.round(255 + (br - 255) * x);
        const gg = Math.round(255 + (bg - 255) * x);
        const b = Math.round(255 + (bb - 255) * x);

        g.fillStyle = `rgb(${r},${gg},${b})`;
        g.fillRect(w - 1, y, 1, 1);
      }
    };

    draw();
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
