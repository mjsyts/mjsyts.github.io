export class Spectrogram {
  constructor(canvas, analyser) {
    this.c = canvas;
    this.g = canvas.getContext("2d", { alpha: false });
    this.a = analyser;

    this.buf = new Uint8Array(analyser.frequencyBinCount);
    this.raf = 0;

    this.clear();
  }

  clear() {
    this.g.fillStyle = "#fff";
    this.g.fillRect(0, 0, this.c.width, this.c.height);
  }

  start() {
    this.stop();

    const { g, c, a, buf } = this;
    const w = c.width, h = c.height;

    const draw = () => {
      this.raf = requestAnimationFrame(draw);
      a.getByteFrequencyData(buf);

      g.drawImage(c, -1, 0);

      for (let y = 0; y < h; y++) {
        const t = 1 - y / h;
        const i = Math.floor(Math.pow(t, 2.2) * (buf.length - 1));
        const v = buf[i] | 0;
        g.fillStyle = `rgb(${v},${v},${v})`;
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
