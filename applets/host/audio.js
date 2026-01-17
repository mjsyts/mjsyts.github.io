// applets/_host/audio.js
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.node = null;
    this.connected = false;
  }

  async init() {
    if (this.ctx) return;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
  }

  get sampleRate() {
    return this.ctx?.sampleRate ?? 0;
  }

  async loadWorklet(url) {
    await this.init();
    await this.ctx.audioWorklet.addModule(url);
  }

  setNode(node) {
    this.node = node;
    this.connected = false;
  }

  connect() {
    if (!this.node || this.connected) return;
    this.node.connect(this.master);
    this.connected = true;
  }

  fadeTo(value, timeConstant = 0.02) {
    if (!this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(value, t, timeConstant);
  }

  async start() {
    await this.init();
    this.connect();
    await this.ctx.resume();
    this.fadeTo(1, 0.01);
  }

  async stop() {
    if (!this.ctx) return;
    this.fadeTo(0, 0.02);

    // give fade time to land before suspending
    setTimeout(() => {
      if (this.ctx?.state === 'running') {
        this.ctx.suspend();
      }
    }, 60);
  }

  setParam(name, value) {
    if (!this.node?.parameters) return false;
    const p = this.node.parameters.get(name);
    if (!p) return false;
    p.setValueAtTime(value, this.ctx.currentTime);
    return true;
  }

  post(msg) {
    if (!this.node?.port) return false;
    this.node.port.postMessage(msg);
    return true;
  }
}

export function bindAudioUI({
  engine,
  startId = "start",
  stopId = "stop",
  srId = "sr",
  statusId = "status",
  params = [], // [{ id:"amp", unit:"", format:v=>..., onInput:(v)=>... }]
} = {}) {
  const $ = (id) => document.getElementById(id);

  const startBtn = $(startId);
  const stopBtn = $(stopId);
  const srEl = $(srId);
  const statusEl = $(statusId);

  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  const setRunningUI = (running) => {
    if (startBtn) startBtn.disabled = running;
    if (stopBtn) stopBtn.disabled = !running;
  };

  const updateOne = (p) => {
    const input = $(p.id);
    const out = $(p.id + "Val");
    if (!input) return;

    const raw = Number(input.value);
    const text = p.format ? p.format(raw) : String(raw);
    if (out) out.textContent = (p.unit ? `${text}${p.unit}` : text);

    if (p.onInput) p.onInput(raw);
  };

  const updateAll = () => params.forEach(updateOne);

  params.forEach((p) => {
    const input = $(p.id);
    if (!input) return;
    input.addEventListener("input", () => updateOne(p));
  });

  if (startBtn) startBtn.addEventListener("click", async () => {
    try {
      setStatus("init…");
      await engine.init();
      if (srEl) srEl.textContent = `sample rate: ${engine.sampleRate}`;
      await engine.start();
      setRunningUI(true);
      setStatus("running");
    } catch (e) {
      console.error(e);
      setStatus("error");
      setRunningUI(false);
    }
  });

  if (stopBtn) stopBtn.addEventListener("click", async () => {
    setStatus("stop…");
    await engine.stop();
    setRunningUI(false);
    setStatus("stopped");
  });

  // initial
  setRunningUI(false);
  setStatus("idle");
  updateAll();

  return { setStatus, setRunningUI, updateAll, updateOne };
}
