// Procedural kitchen sound (Web Audio), after pore-pressure's 09_audio.js. The sizzle level follows
// the simulated evaporation rate in the pan; the pot bubbles when the water boils.
export class Audio {
  constructor() {
    this.ctx = null;
    try { this.on = localStorage.getItem('kt:sound') !== '0'; } catch { this.on = true; }
  }
  start() {
    if (this.ctx || !this.on) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const c = (this.ctx = new AC());
      this.master = c.createGain(); this.master.gain.value = 0.5; this.master.connect(c.destination);
      const n = c.sampleRate * 2;
      this.noise = c.createBuffer(1, n, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      // continuous sizzle: crackly high-passed noise
      const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200;
      const bp = c.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 5200; bp.gain.value = 6;
      this.sizzleGain = c.createGain(); this.sizzleGain.gain.value = 0;
      src.connect(hp); hp.connect(bp); bp.connect(this.sizzleGain); this.sizzleGain.connect(this.master);
      src.start();
      // gas burner hiss
      const src2 = c.createBufferSource(); src2.buffer = this.noise; src2.loop = true; src2.playbackRate.value = 0.7;
      const lp = c.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 900; lp.Q.value = 0.6;
      this.gasGain = c.createGain(); this.gasGain.gain.value = 0;
      src2.connect(lp); lp.connect(this.gasGain); this.gasGain.connect(this.master);
      src2.start();
      this.lastBubble = 0;
    } catch { this.ctx = null; }
  }
  setOn(v) { this.on = v; try { localStorage.setItem('kt:sound', v ? '1' : '0'); } catch { /* ignore */ } if (this.master) this.master.gain.value = v ? 0.5 : 0; if (v) this.start(); }
  burst(o) {
    const c = this.ctx; if (!c || !this.on) return;
    const t = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = o.rate || 1;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f0 || 800, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + (o.dur || 0.1));
    f.Q.value = o.q || 2;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + (o.att || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur || 0.1));
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 1.5); src.stop(t + (o.dur || 0.1) + 0.05);
  }
  tick() { this.burst({ f0: 4200, q: 4, dur: 0.03, vol: 0.15 }); }
  chop() { this.burst({ f0: 1800, f1: 500, q: 1.2, dur: 0.07, vol: 0.3 }); this.burst({ f0: 6000, f1: 3000, q: 1, dur: 0.05, vol: 0.12, type: 'highpass' }); }
  sizzleBurst() { this.burst({ f0: 4000, f1: 2500, q: 0.6, dur: 0.6, vol: 0.35, type: 'highpass', att: 0.01 }); }
  splash() { this.burst({ f0: 700, f1: 250, q: 0.8, dur: 0.25, vol: 0.3, type: 'lowpass' }); }
  /** Called every frame with the simulated rates. */
  update(world, rdt) {
    const c = this.ctx; if (!c || !this.on) return;
    const s = world.events.sizzle; // kg/s of water boiling off food in the pan
    const level = Math.min(0.5, Math.sqrt(Math.max(0, s) * 4000) * 0.22);
    this.sizzleGain.gain.setTargetAtTime(level, c.currentTime, 0.08);
    const gas = world.burners.reduce((a, b) => a + b.setting, 0) / 20;
    this.gasGain.gain.setTargetAtTime(gas * 0.06, c.currentTime, 0.2);
    const boil = world.events.boil;
    if (boil > 0.05) {
      this.lastBubble -= rdt;
      if (this.lastBubble <= 0) {
        this.burst({ f0: 300 + Math.random() * 500, f1: 150, q: 6, dur: 0.05 + Math.random() * 0.05, vol: 0.05 + 0.12 * boil, type: 'bandpass', rate: 0.6 });
        this.lastBubble = (0.02 + Math.random() * 0.12) / (0.3 + boil);
      }
    }
  }
}
