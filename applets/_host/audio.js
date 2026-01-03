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