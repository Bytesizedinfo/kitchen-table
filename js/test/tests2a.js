// Phase 2a tests: knife presets and bits, fruit & veg chemistry, oils.
import { World } from '../sim/world.js';
import { pv } from '../sim/params.js';
import { applyPreset } from '../geom/presets.js';
import { cutPiece, meshPiece } from '../geom/cutpiece.js';
import { arrhK, processStep } from '../sim/process.js';
import { MATERIALS } from '../sim/foods.js';
import { caramelRate } from '../sim/heat.js';
import { coatPiece, peelPiece } from '../sim/ops.js';

const r2 = (x, d = 2) => +(+x).toFixed(d);
const ZERO = { h: 0, T: 0 };
const iso = (over) => () => ({ con: { ...ZERO }, air: { h: 0, T: 0, Trad: 0, eps: 0, w: 0 }, wat: { ...ZERO }, ins: { ...ZERO }, oil: { ...ZERO }, ...over });
const run = (W, sec, fn) => { for (let i = 0; i < sec; i++) { W.tick(1); if (fn && fn(W.t) === false) return; } };
const totals = (W) => {
  let m = 0, w = 0, e = 0;
  for (const p of W.pieces) { const g = p.grid; for (let c = 0; c < g.N; c++) if (g.occ[c]) { m += g.ms[c] + g.mw[c]; w += g.mw[c]; e += (g.ms[c] + g.mw[c]) * g.T[c]; } for (let s = 0; s < g.nSkin; s++) { m += g.film[s]; w += g.film[s]; } }
  for (const b of W.bits) { m += b.mass(); w += b.mw + b.film; e += (b.ms + b.mw) * (0.7 * b.Tc + 0.3 * b.Ts); }
  return { m, w, e };
};
const mode = (arr) => { const c = new Map(); for (const x of arr) c.set(x, (c.get(x) || 0) + 1); return [...c].sort((a, b) => b[1] - a[1])[0][0]; };

/** Onion medium dice in a thermostatic pan; returns the bits world. */
function onionPan(hold, setting) {
  const W = new World();
  if (hold) W.pan.hold = hold; else W.burners[0].setting = setting;
  if (!hold) run(W, 300);
  const p = W.add('onion'); W.place(p, 'board');
  applyPreset(W, p, 'dice_m', { noMesh: true });
  for (const b of W.bits) b.support = 'pan';
  return W;
}

export const TESTS_2A = [
  {
    name: 'bit_shells', tag: 'V',
    run() {
      // a 12 mm cube bit in 100 °C water (h → ∞) vs the exact cube centre: θ = θ_slab(0,t)³
      const W = new World();
      const p = W.add('potato'); W.place(p, 'board');
      applyPreset(W, p, 'dice_m', { noMesh: true });
      const b = W.bits.filter((x) => x.dims.every((d) => Math.abs(d - 0.012) < 1e-4)).sort((x, y) => y.mass() - x.mass())[0];
      W.bits = [b]; b.support = 'pot'; b.Tc = b.Ts = 20;
      const m = b.mats[b.mi].raw(40), alpha = m.k / (m.rho * m.cp), a = 0.012;
      const env = iso({ wat: { h: 1e6, T: 100 } })();
      const slab = (t) => { let s = 0; for (let n = 0; n < 60; n++) { const k = 2 * n + 1; s += ((4 * (n % 2 ? -1 : 1)) / (k * Math.PI)) * Math.exp((-k * k * Math.PI * Math.PI * alpha * t) / (a * a)); } return s; };
      let worst = 0; const samples = [];
      for (let t = 1; t <= 360; t++) {
        const out = { Qcon: 0, Qwat: 0, evap: 0 };
        b.procs = {}; // thermal only
        // reuse the world's bit stepper through a one-bit world tick
        W.env = () => env; W.tick(1);
        const ex = 100 + (20 - 100) * slab(t) ** 3;
        const th = (100 - ex) / 80;
        if (th < 0.85 && th > 0.1) worst = Math.max(worst, Math.abs(b.Tc - ex));
        if (t % 60 === 0) samples.push([t, r2(b.Tc, 1), r2(ex, 1)]);
        void out;
      }
      return { pass: worst < 6, info: { worst: r2(worst, 2), samples, note: 'four-shell bit model vs exact cube centre, 0.1 < θ < 0.85' } };
    },
  },
  {
    name: 'preset_conservation', tag: 'V',
    run() {
      const res = [];
      for (const [food, preset] of [['onion', 'dice_m'], ['carrot', 'batonnet'], ['potato', 'slice'], ['apple', 'brunoise']]) {
        const W = new World();
        const p = W.add(food); W.place(p, 'pan'); W.pan.hold = 150; run(W, 60); W.place(p, 'board');
        const a = totals(W);
        const r = applyPreset(W, p, preset, { noMesh: true });
        const b = totals(W);
        res.push({ food, preset, parts: r.bits.length + r.pieces.length, dm: r2(Math.abs(b.m + r.dropped - a.m) / a.m * 1e6, 2), dw_ppm: r2(Math.abs(b.w - a.w) / a.w * 1e6, 1), de_ppm: r2(Math.abs(b.e - a.e) / a.e * 1e6, 1) });
      }
      return { pass: res.every((x) => x.dm < 1 && x.dw_ppm < 2000 && x.de_ppm < 2000), info: res };
    },
  },
  {
    name: 'knife_dimensions', tag: 'P',
    run() {
      const want = { dice_s: [6, 6, 6], dice_m: [12, 12, 12], dice_l: [19, 19, 19], brunoise: [3, 3, 3], julienne: [50, 3, 3], batonnet: [50, 6, 6] };
      const out = {};
      let ok = true;
      for (const [preset, w] of Object.entries(want)) {
        const W = new World();
        const p = W.add(preset === 'julienne' || preset === 'batonnet' ? 'potato' : 'potato'); W.place(p, 'board');
        applyPreset(W, p, preset, { noMesh: true, bitMax: 0.06 });
        const dims = W.bits.map((b) => b.dims.map((d) => Math.round(d * 1000)).sort((x, y) => y - x).join('×'));
        const typical = mode(dims).split('×').map(Number);
        // sticks: the longest one shows the full length (tapered ends are shorter)
        if (w[0] === 50) typical[0] = Math.max(...W.bits.map((b) => Math.round(Math.max(...b.dims) * 1000)));
        out[preset] = { typical: typical.join('×'), bits: W.bits.length };
        if (typical.some((d, i) => Math.abs(d - w[i]) > 1)) ok = false;
      }
      return { pass: ok, info: out };
    },
  },
  {
    name: 'onion_saute_loss', tag: 'F',
    run() {
      const W = onionPan(140);
      const m0 = W.bits.reduce((a, b) => a + b.mass(), 0);
      for (let t = 1; t <= 480; t++) { W.tick(1); if (t % 30 === 0) for (const b of W.bits) b.stirred = true; }
      const loss = 1 - W.bits.reduce((a, b) => a + b.mass(), 0) / m0;
      return { pass: loss >= 0.37 && loss <= 0.43, info: { loss_pct: r2(loss * 100, 1), sourced: '37–43 % in 8 min at 140 °C' } };
    },
  },
  {
    name: 'onion_stages', tag: 'F',
    run() {
      const W = onionPan(null, 3);
      let tT = null, tG = null, tB = null;
      for (let t = 1; t <= 3600; t++) {
        W.tick(1);
        if (t % 30 === 0) for (const b of W.bits) b.stirred = true;
        if (t % 30) continue;
        const n = W.bits.length, avg = (f) => W.bits.reduce((a, b) => a + f(b), 0) / n;
        if (tT == null && avg((b) => b.procs.trans) > 0.5) tT = t / 60;
        if (tG == null && avg((b) => b.brown) > 0.4) tG = t / 60;
        if (tB == null && avg((b) => b.brown) > 1.2) { tB = t / 60; break; }
      }
      return { pass: tT >= 4 && tT <= 10 && tG >= 15 && tG <= 30 && tB >= 30 && tB <= 60, info: { translucent_min: tT, golden_min: tG, deepBrown_min: tB, sourced: '5–10 / 15–30 / 30–60 min' } };
    },
  },
  {
    name: 'apple_browning', tag: 'F',
    run() {
      const time = (coat, sub) => {
        const W = new World();
        const p = W.add('apple'); W.place(p, 'board');
        const b = p.bounds();
        const r = cutPiece(W, p, meshPiece(p), [1, 0, 0], [(b.lo[0] + b.hi[0]) / 2, 0.03, (b.lo[2] + b.hi[2]) / 2]);
        const half = r[0].piece;
        if (coat) coatPiece(half, coat);
        if (sub) half.envOverride = (e) => ({ wat: { h: 300, T: 22 } }), half.support = { kind: 'pot' };
        const g = half.grid;
        for (let t = 1; t <= 7200; t++) {
          W.tick(1);
          let a = 0, s = 0; for (let i = 0; i < g.nSkin; i++) if (g.cut[i]) { a += g.skinArea[i]; s += g.skinArea[i] * g.enz[i]; }
          if (s / a >= 1) return t / 60;
        }
        return 999;
      };
      const plain = time(0), lemon = time(1), asc = time(2);
      return { pass: plain >= 7 && plain <= 13 && lemon >= 2 * plain && asc > lemon, info: { plain_min: r2(plain, 1), lemon_min: r2(lemon, 1), ascorbic_min: r2(asc, 1) } };
    },
  },
  {
    name: 'ppo_inactivation', tag: 'P',
    run() {
      const spec = MATERIALS.apple.procs.find((x) => x.id === 'ppo');
      const k78 = arrhK(spec, 78) * 60, k68 = arrhK(spec, 68) * 60;
      const W = new World();
      const p = W.add('apple', { T0: 78 }); W.place(p, 'board');
      p.moisture = false; p.envOverride = iso({ air: { h: 1e4, T: 78, Trad: 78, eps: 0, w: 0 }, ins: { h: 1e4, T: 78 } });
      run(W, 900);
      const left = p.procMean('ppo');
      return { pass: k78 >= 0.16 && k78 <= 0.28 && left < 0.05, info: { k78_per_min: r2(k78, 3), k68_per_min: r2(k68, 4), activeAfter15min_78C: r2(left, 4) } };
    },
  },
  {
    name: 'apple_cooks_above_53', tag: 'P',
    run() {
      const hold = (T) => { const W = new World(); const p = W.add('apple', { T0: T }); W.place(p, 'board'); p.moisture = false; p.envOverride = iso({ air: { h: 1e4, T, Trad: T, eps: 0, w: 0 }, ins: { h: 1e4, T } }); run(W, 1200); return p.procMean('cooked'); };
      const a50 = hold(50), a60 = hold(60);
      return { pass: a50 < 0.2 && a60 > 0.8, info: { cooked_at_50C: r2(a50, 3), cooked_at_60C: r2(a60, 3) } };
    },
  },
  {
    name: 'potato_softening_Ea', tag: 'P',
    run() {
      const spec = MATERIALS.potato.procs.find((x) => x.id === 'firm');
      const Ea = (Math.log(arrhK(spec, 100) / arrhK(spec, 90)) * pv('Rgas')) / (1 / 363.15 - 1 / 373.15) / 1000;
      return { pass: Ea >= 145 && Ea <= 160, info: { Ea_kJ: r2(Ea, 1), sourced: '145–160 kJ/mol' } };
    },
  },
  {
    name: 'banana_chill', tag: 'P',
    run() {
      const dose = (T) => { const W = new World(); const p = W.add('banana', { T0: T }); W.place(p, 'board'); processStep(p, 4 * 86400); const g = p.grid; let s = 0, n = 0; for (const c of g.matCells[1]) { s += g.proc.chill[c]; n++; } return s / n; };
      const d5 = dose(5), d15 = dose(15);
      return { pass: d5 >= 0.95 && d5 <= 1.05 && d15 === 0, info: { peelInjury_4days_5C: r2(d5, 3), at15C: d15 } };
    },
  },
  {
    name: 'tomato_skin_split', tag: 'P',
    run() {
      const W = new World(); W.pot.T = 100; W.burners[1].setting = 10;
      const p = W.add('tomato'); W.place(p, 'pot');
      let t = 0; while (!p.skinSplit && t < 300) { W.tick(1); t++; }
      return { pass: t >= 30 && t <= 60, info: { split_after_s: t, sourced: '30–60 s in boiling water' } };
    },
  },
  {
    name: 'peel_banana', tag: 'V',
    run() {
      const W = new World();
      const p = W.add('banana'); W.place(p, 'board');
      const m0 = p.mass(), peel = peelPiece(W, p);
      const left = p.grid.matCells[1].length;
      return { pass: left === 0 && Math.abs(p.mass() + peel - m0) < 1e-9 && peel > 0.015 && peel < 0.06, info: { peel_g: r2(peel * 1000, 1), flesh_g: r2(p.mass() * 1000, 1) } };
    },
  },
  {
    name: 'oil_smoke_points', tag: 'P',
    run() {
      const res = {};
      let ok = true;
      for (const [id, lo, hi] of [['smoke_butter', 150, 177], ['smoke_evoo', 177, 210], ['smoke_canola', 200, 210], ['smoke_peanut', 225, 235]]) {
        const W = new World(); W.burners[0].setting = 10; W.pan.oiled = true; W.pan.smokePoint = pv(id);
        let T = null; for (let t = 0; t < 1800 && T == null; t++) { W.tick(1); if (W.pan.smoking()) T = W.pan.T; }
        res[id] = r2(T, 1); if (!(T >= lo && T <= hi + 2)) ok = false;
      }
      return { pass: ok, info: res };
    },
  },
  {
    name: 'caramel_onset_order', tag: 'F',
    run() {
      const onset = (sug) => { for (let T = 90; T < 220; T += 0.5) if (caramelRate(T, sug) > 1e-6) return T; return null; };
      const f = onset({ fru: 5 }), g = onset({ glu: 5 }), s = onset({ suc: 5 });
      return { pass: f < g && g < s && f >= 105 && f <= 112 && g >= 150 && g <= 162 && s >= 160 && s <= 172, info: { fructose: f, glucose: g, sucrose: s } };
    },
  },
];
