// Phase 2c tests: gelatin jelly (melt / set / wobble), gummy worms (stretch, tear, melt), marshmallow, hard candy.
import { World } from '../sim/world.js';
import { pv } from '../sim/params.js';
import { wobbleProps, stepWobble, pokeWobble } from '../sim/wobble.js';
import { stepChains, splitChain } from '../sim/chain.js';

const r2 = (x, d = 2) => +(+x).toFixed(d);
const Z = { h: 0, T: 0 };
const hold = (T, h = 1e4) => () => ({ con: { ...Z }, air: { h, T, Trad: T, eps: 0, w: 0 }, wat: { ...Z }, ins: { h, T }, oil: { ...Z } });

export const TESTS_2C = [
  {
    name: 'jelly_melts_28_30', tag: 'P',
    run() {
      const at = (T) => { const W = new World(); const p = W.add('jelly', { T0: T }); W.place(p, 'plate'); p.noDrain = true; p.moisture = false; p.envOverride = hold(T); for (let i = 0; i < 1800; i++) W.tick(1); return p.procMean('liq'); };
      const a = at(26), b = at(30);
      return { pass: a < 0.1 && b > 0.9, info: { liquid_after_30min_26C: r2(a, 3), liquid_after_30min_30C: r2(b, 3), sourced: 'melts ≈28–30 °C' } };
    },
  },
  {
    name: 'jelly_sets_in_fridge', tag: 'F',
    run() {
      const W = new World({ dt: 5 });
      const p = W.add('jelly_mix', { T0: 60 }); W.place(p, 'fridge');
      let t = 0; while (p.grid.proc.liq[p.grid.core] > 0.15 && t < 8 * 3600) { W.tick(5); t += 5; }
      return { pass: t >= 2 * 3600 && t <= 4 * 3600, info: { mass_g: r2(p.mass() * 1000, 0), centre_set_after_h: r2(t / 3600, 2), sourced: '2–4 h in a fridge' } };
    },
  },
  {
    name: 'jelly_wobble_frequency', tag: 'V',
    run() {
      // the simulated spring rings at the analytic shear-mode frequency (1/4H)·√(G/ρ)
      const W = new World(); const p = W.add('jelly', { T0: 4 }); W.place(p, 'plate');
      const pr = wobbleProps(p);
      pokeWobble(p, 1, 0);
      const dt = 1 / 2000; let last = 0, crossings = [], t = 0, prev = 0;
      stepWobble(p, dt);
      for (let i = 0; i < 4000; i++) { const w = stepWobble(p, dt); t += dt; if (prev < 0 && w.x >= 0) crossings.push(t); prev = w.x; last = w.x; }
      void last;
      const fSim = crossings.length > 2 ? (crossings.length - 1) / (crossings[crossings.length - 1] - crossings[0]) : 0;
      const fd = pr.f * Math.sqrt(1 - pv('wobble_zeta') ** 2);
      return { pass: Math.abs(fSim - fd) / fd < 0.02 && pr.f > 2 && pr.f < 10, info: { analytic_Hz: r2(pr.f, 2), damped_Hz: r2(fd, 2), simulated_Hz: r2(fSim, 2), E_kPa: r2(pr.E / 1000, 2), height_mm: r2(pr.H * 1000, 0) } };
    },
  },
  {
    name: 'gummy_stretch_and_tear', tag: 'F',
    run() {
      const W = new World();
      const p = W.add('gummy_worm'); W.place(p, 'board');
      for (let i = 0; i < 60; i++) stepChains(W, 1 / 60);
      const ch = p.chain, L0 = ch.length();
      // resting: holds its length
      const restRatio = ch.length() / (ch.segLen * (ch.n - 1));
      ch.pin = 0; ch.target = [ch.x[0] - 0.003, ch.x[1] + 0.01, ch.x[2]];
      let torn = null, f = 0, Lmax = L0;
      while (!torn && f < 900) { ch.target[0] -= 0.0012; const t = stepChains(W, 1 / 60); f++; Lmax = Math.max(Lmax, ch.length()); if (t.length) torn = t[0]; }
      const m0 = p.mass();
      const parts = torn ? splitChain(W, p, torn.at) : [];
      const m1 = parts.reduce((a, q) => a + q.mass(), 0);
      return { pass: Math.abs(restRatio - 1) < 0.02 && torn && Lmax / L0 > 1.3 && Math.abs(m1 - m0) < 1e-9, info: { restLengthRatio: r2(restRatio, 3), stretchBeforeTear: r2(Lmax / L0, 2), pieces_g: parts.map((q) => r2(q.mass() * 1000, 2)) } };
    },
  },
  {
    name: 'gummy_melts_in_warm_pan', tag: 'F',
    run() {
      const W = new World(); W.pan.hold = 60;
      const p = W.add('gummy_worm'); W.place(p, 'pan');
      let t = 0; while (W.pieces.includes(p) && t < 1200) { W.tick(1); t++; }
      const pud = W.puddles.reduce((a, x) => a + x.mass(), 0);
      return { pass: !W.pieces.includes(p) && pud > 0.004, info: { melted_after_s: t, puddle_g: r2(pud * 1000, 2) } };
    },
  },
  {
    name: 'marshmallow_gas_law', tag: 'P',
    run() {
      const W = new World(); const p = W.add('marshmallow', { T0: 22 }); W.place(p, 'board');
      p.noDrain = true; p.moisture = false; p.envOverride = hold(40);
      for (let i = 0; i < 600; i++) W.tick(1);
      const phi = pv('mallow_porosity'), want = Math.cbrt(1 - phi + phi * (40 + 273.15) / (22 + 273.15));
      return { pass: Math.abs(p.puff - want) < 0.005, info: { linearScale: r2(p.puff, 4), idealGas: r2(want, 4), airFraction: phi } };
    },
  },
  {
    name: 'candy_sticky_above_Tg', tag: 'P',
    run() {
      const at = (T) => { const W = new World(); const p = W.add('lollipop', { T0: T }); W.place(p, 'board'); p.noDrain = true; p.moisture = false; p.envOverride = hold(T); for (let i = 0; i < 300; i++) W.tick(1); return p.procMean('sticky', 0); };
      const a = at(25), b = at(42);
      return { pass: a < 0.1 && b > 0.9, info: { sticky_25C: r2(a, 3), sticky_42C: r2(b, 3), sourced: 'Tg 26–41 °C' } };
    },
  },
];
