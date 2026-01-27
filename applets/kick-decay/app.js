import { AudioEngine } from "/applets/host/audio.js";

function makeKickTrigger(ctx, out) {
  return function triggerKick(decaySeconds) {
    const t0 = ctx.currentTime + 0.01;
    const dur = decaySeconds;

    // Thump oscillator
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, t0);
    osc.frequency.exponentialRampToValueAtTime(50, t0 + 0.2);

    // Envelope
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(1.0, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    // Routing
    osc.connect(g);
    g.connect(out);

    osc.start(t0);

    osc.stop(t0 + dur + 0.05);
  };
}

function initKickDecay(root) {
  const $ = (sel) => root.querySelector(sel);

  const startBtn = $('[data-action="start"]');
  const stopBtn  = $('[data-action="stop"]');
  const shortBtn = $('[data-action="short"]');
  const longBtn  = $('[data-action="long"]');

  const srEl = root.querySelector("[data-sr]");
  const statusEl = root.querySelector("[data-status]");

  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };

  const engine = new AudioEngine();
  let bus = null;
  let trigger = null;

  const setRunningUI = (running) => {
    if (startBtn) startBtn.disabled = running;
    if (stopBtn)  stopBtn.disabled  = !running;
    if (shortBtn) shortBtn.disabled = !running;
    if (longBtn)  longBtn.disabled  = !running;
  };

  async function start() {
    try {
      setStatus("init…");
      await engine.init();

      bus = engine.ctx.createGain();
      bus.gain.value = 1;

      trigger = makeKickTrigger(engine.ctx, bus);

      engine.setNode(bus);

      if (srEl) srEl.textContent = `sample rate: ${engine.sampleRate}`;

      await engine.start();
      setRunningUI(true);
      setStatus("running");
    } catch (e) {
      console.error(e);
      setRunningUI(false);
      setStatus("error");
    }
  }

  async function stop() {
    setStatus("stop…");
    await engine.stop();
    setRunningUI(false);
    setStatus("idle");
  }

  function play(decaySeconds) {
    if (!engine.ctx || engine.ctx.state !== "running" || !trigger) return;
    trigger(decaySeconds);
  }

  startBtn?.addEventListener("click", start);
  stopBtn?.addEventListener("click", stop);
  shortBtn?.addEventListener("click", () => play(0.12));
  longBtn?.addEventListener("click", () => play(1.0));

  setRunningUI(false);
  setStatus("idle");
}

document.querySelectorAll("[data-kick-decay]").forEach(initKickDecay);
