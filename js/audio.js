// Tiny procedural WebAudio: block sounds, NPC mumbles, ambient birds + wind.
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.birdT = 4;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startWind();
    } catch { return false; }
    return true;
  }

  resume() { try { this.ctx?.resume(); } catch {} }
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  startWind() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.015 * white) / 1.015;
      d[i] = last * 2.4;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = ctx.createGain(); g.gain.value = 0.05;
    src.connect(lp).connect(g).connect(this.master);
    src.start();
  }

  blip(freq, dur = 0.09, type = 'square', vol = 0.16, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noiseBurst(dur, freq, vol = 0.3) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const len = Math.max(1, (ctx.sampleRate * dur) | 0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  breakBlock() { this.noiseBurst(0.16, 900, 0.32); this.blip(160, 0.08, 'triangle', 0.1, -60); }
  placeBlock() { this.noiseBurst(0.06, 1600, 0.18); this.blip(320, 0.05, 'triangle', 0.08, -80); }
  step() { this.noiseBurst(0.04, 700, 0.05); }
  greetTone() { this.blip(520, 0.07, 'sine', 0.08); }

  mumble(goat = false) {
    if (!this.ctx || this.muted) return;
    if (goat) { this.blip(220, 0.22, 'sawtooth', 0.06, 40); return; }
    const base = 180 + Math.random() * 160;
    this.blip(base, 0.07, 'sine', 0.06);
    setTimeout(() => this.blip(base * (0.8 + Math.random() * 0.5), 0.07, 'sine', 0.05), 90);
    setTimeout(() => this.blip(base * (0.7 + Math.random() * 0.4), 0.09, 'sine', 0.04), 200);
  }

  bird() {
    const f = 1900 + Math.random() * 1400;
    this.blip(f, 0.06, 'sine', 0.025, 300 + Math.random() * 500);
    setTimeout(() => this.blip(f * 1.1, 0.08, 'sine', 0.02, -400), 110);
  }

  update(dt) {
    if (!this.ctx || this.muted) return;
    this.birdT -= dt;
    if (this.birdT <= 0) {
      this.birdT = 5 + Math.random() * 11;
      this.bird();
    }
  }
}
