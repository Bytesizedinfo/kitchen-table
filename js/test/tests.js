// Deterministic behaviour tests. Pure (Node + browser). Each returns {pass, info}.
// Tags: V = verification against an exact solution; P = sourced inputs give the sourced outcome
// (no tuning on that outcome); F = outcome used for calibration (regression guard only).
import { World } from '../sim/world.js';
import { Piece } from '../sim/piece.js';
import { mixture } from '../sim/props.js';
import { getMaterial } from '../sim/piece.js';
import { pv, williamsTime } from '../sim/params.js';
import { arrhK } from '../sim/process.js';
import { MATERIALS } from '../sim/foods.js';
import { flipPiece } from '../sim/ops.js';
import { cutPiece } from '../geom/cutpiece.js';
import { surfaceNets } from '../geom/surfacenets.js';
import { mulberry32 } from '../sim/rng.js';
import { TESTS_2A } from './tests2a.js';
import { TESTS_2B } from './tests2b.js';
export { flipPiece };

// ---- helpers ----
const erf = (x) => {
  // Abramowitz–Stegun 7.1.26 (|err| < 1.5e-7)
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
};
const ZERO = { h: 0, T: 0 };
function isoEnv(over) {
  return () => ({ con: { ...ZERO }, air: { h: 0, T: 0, Trad: 0, eps: 0, w: 0 }, wat: { ...ZERO }, ins: { ...ZERO }, oil: { ...ZERO }, ...over });
}
function run(world, sec, every, fn) {
  const n = Math.round(sec / world.dt);
  for (let i = 0; i < n; i++) { world.tick(world.dt); if (fn && every && (i + 1) % every === 0) { if (fn(world.t) === false) return false; } }
  return true;
}
/** Mean T over cells whose centre lies within ±band of radius r from the grid centre. */
function shellT(p, r, band, outR) {
  const g = p.grid, q = [0, 0, 0]; let n = 0, s = 0, sr = 0;
  for (let c = 0; c < g.N; c++) {
    if (!g.occ[c]) continue;
    g.center(c, q);
    const d = Math.hypot(q[0], q[1], q[2]);
    if (Math.abs(d - r) <= band) { n++; s += g.T[c]; sr += d; }
  }
  if (outR) outR.r = sr / n;
  return s / n;
}
const r2 = (x, d = 2) => +(+x).toFixed(d);

/** Simulated time until the egg's yolk–white boundary (r = 0.69R, Williams' 0.76 factor) reaches 63 °C. */
function eggTime(M, T0) {
  const W = new World();
  W.pot.T = 100; W.burners[1].setting = 10; // keep a rolling boil
  const rho = 1038, R = Math.cbrt((3 * (M / 1000)) / (4 * Math.PI * rho));
  const p = Piece.create('t_sphere', { R, cell: R / 13, T0 });
  W.addPiece(p); W.place(p, 'pot');
  // r where 2·sin(x)/x = 0.76 (first-term series) → x = 2.172
  let lo = 1, hi = 3;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if ((2 * Math.sin(m)) / m > 0.76) lo = m; else hi = m; }
  const rr = (lo / Math.PI) * R;
  let tHit = null, prevT = shellT(p, rr, p.grid.dx * 0.6), prevt = 0;
  run(W, 900, 1, (t) => {
    const T = shellT(p, rr, p.grid.dx * 0.6);
    if (T >= pv('williams_Tyolk')) { tHit = prevt + ((pv('williams_Tyolk') - prevT) / (T - prevT)) * (t - prevt); return false; }
    prevT = T; prevt = t;
  });
  return tHit;
}

/** Full-series time for Williams' homogeneous egg (surface at 100 °C) to reach 63 °C at r = 0.691R. */
function seriesEggTime(M, T0) {
  const c = 3700, rho = 1038, k = 0.54, alpha = k / (rho * c);
  const R = Math.cbrt((3 * (M / 1000)) / (4 * Math.PI * rho));
  const x = 2.1723; // 2 sin(x)/x = 0.76
  const target = (63 - 100) / (T0 - 100);
  const th = (Fo) => { let s = 0; for (let n = 1; n < 200; n++) s += 2 * (n % 2 ? 1 : -1) * (Math.sin(n * x) / (n * x)) * Math.exp(-n * n * Math.PI * Math.PI * Fo); return s; };
  let lo = 1e-4, hi = 1;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (th(m) > target) lo = m; else hi = m; }
  return (lo * R * R) / alpha;
}

let STEAK_RESULT = null;

export const TESTS = [
  {
    name: 'slab_erfc', tag: 'V',
    run() {
      // semi-infinite solid, surface held at 100 °C from 20 °C; compare with the erfc solution
      const W = new World();
      const p = Piece.create('t_slab', { Lx: 0.01, Ly: 0.07, Lz: 0.01, cell: [0.005, 0.001, 0.005], T0: 20 });
      W.addPiece(p); W.place(p, 'pan');
      p.envOverride = isoEnv({ con: { h: 1e7, T: 100 } });
      run(W, 300);
      const m = p.mats[0].raw(), alpha = m.k / (m.rho * m.cp);
      const g = p.grid, y0 = g.origin[1] + g.dy; // bottom face of the first occupied layer
      const res = [];
      for (const depth of [0.005, 0.010]) {
        const pt = [0, y0 + depth, 0];
        const Tsim = g.sampleT(pt);
        const Tex = 100 + (20 - 100) * erf(depth / (2 * Math.sqrt(alpha * 300)));
        res.push({ depth_mm: depth * 1000, Tsim: r2(Tsim), Texact: r2(Tex) });
      }
      return { pass: res.every((r) => Math.abs(r.Tsim - r.Texact) < 0.5), info: res };
    },
  },
  {
    name: 'sphere_series', tag: 'V',
    run() {
      // sphere R = 22 mm, surface held at 100 °C; centre vs exact series θ = 2Σ(−1)^(n+1) e^(−n²π²Fo)
      const W = new World();
      const R = 0.022, p = Piece.create('t_sphere', { R, cell: R / 20, T0: 4 });
      W.addPiece(p); W.place(p, 'pot');
      p.envOverride = isoEnv({ wat: { h: 1e7, T: 100 }, con: { h: 1e7, T: 100 } });
      const m = p.mats[0].raw(), alpha = m.k / (m.rho * m.cp);
      // the voxel sphere has the same volume as an equivalent sphere radius Re
      const Re = Math.cbrt((3 * p.grid.occupiedCount() * p.grid.cellVol()) / (4 * Math.PI));
      const res = []; let worst = 0;
      run(W, 900, 150, (t) => {
        const Fo = (alpha * t) / (Re * Re);
        const o = {}, Tsim = shellT(p, 0, p.grid.dx * 0.9, o);
        const x = (Math.PI * o.r) / Re;
        let th = 0; for (let n = 1; n < 80; n++) th += 2 * (n % 2 ? 1 : -1) * (x > 1e-9 ? Math.sin(n * x) / (n * x) : 1) * Math.exp(-n * n * Math.PI * Math.PI * Fo);
        const Tex = 100 + (4 - 100) * th;
        worst = Math.max(worst, Math.abs(Tsim - Tex));
        res.push([t, r2(Tsim, 1), r2(Tex, 1)]);
      });
      return { pass: worst < 0.5, info: { worst: r2(worst), samples: res } };
    },
  },
  {
    name: 'stiff_bc', tag: 'V',
    run() {
      const W = new World();
      const p = Piece.create('t_sphere', { R: 0.02, cell: 0.002, T0: 4 });
      W.addPiece(p); W.place(p, 'pot');
      p.envOverride = isoEnv({ wat: { h: 6e4, T: 100 }, con: { h: 6e4, T: 100 } });
      let bad = false, maxT = -1e9;
      run(W, 600, 1, () => { const t = p.maxT(); if (!isFinite(t)) bad = true; maxT = Math.max(maxT, t); });
      return { pass: !bad && maxT <= 100.01, info: { maxT: r2(maxT, 3) } };
    },
  },
  {
    name: 'energy_closed', tag: 'V',
    run() {
      const W = new World();
      const p = Piece.create('t_slab', { Lx: 0.04, Ly: 0.02, Lz: 0.04, cell: [0.002, 0.002, 0.002], T0: 20 });
      W.addPiece(p); W.place(p, 'board');
      p.envOverride = isoEnv({});
      const g = p.grid, q = [0, 0, 0];
      for (let c = 0; c < g.N; c++) if (g.occ[c]) { g.center(c, q); if (q[0] > 0) g.T[c] = 80; }
      const E = () => { let e = 0; for (let c = 0; c < g.N; c++) if (g.occ[c]) e += (g.ms[c] + g.mw[c]) * 3700 * g.T[c]; return e; };
      const e0 = E(); run(W, 1800); const e1 = E();
      return { pass: Math.abs(e1 - e0) / e0 < 0.001, info: { drift: (e1 - e0) / e0 } };
    },
  },
  {
    name: 'energy_boundary', tag: 'V',
    run() {
      // heat from the pan = sensible heat gained by the food + latent heat of evaporation
      const W = new World();
      const p = Piece.create('steak', { T0: 4 });
      p.transport = false; // evaporation on, internal water movement off (it moves heat with the water)
      W.addPiece(p); W.place(p, 'pan');
      p.envOverride = (e) => ({ con: { h: 550, T: 220 } });
      const g = p.grid;
      let inSum = 0, latSum = 0, dE = 0;
      const n = 240;
      for (let i = 0; i < n; i++) {
        const T0 = Float32Array.from(g.T);
        p.classify(W);
        const out = { Qcon: 0, Qair: 0, Qwat: 0, Qins: 0, Qoil: 0, evap: 0, latent: 0, evapSens: 0 };
        const C = (c) => g._C ? g._C[c] : 0;
        p.tick(W.env(p), 1, out);
        for (let c = 0; c < g.N; c++) if (g.occ[c]) dE += C(c) * (g.T[c] - T0[c]);
        inSum += out.Qcon + out.Qair + out.Qwat + out.Qins + out.Qoil; latSum += out.latent;
      }
      const err = Math.abs(dE - (inSum - latSum)) / Math.abs(inSum);
      return { pass: err < 0.005, info: { relErr: err, in_kJ: r2(inSum / 1000), latent_kJ: r2(latSum / 1000), sensible_kJ: r2(dE / 1000) } };
    },
  },
  {
    name: 'determinism', tag: 'V',
    run() {
      const hash = () => {
        const W = new World(); W.pan.T = 220; W.burners[0].setting = 6;
        const p = W.add('steak', { T0: 4 }); W.place(p, 'pan');
        run(W, 120);
        let h = 2166136261;
        const f = new Uint32Array(p.grid.T.buffer);
        for (let i = 0; i < f.length; i++) { h ^= f[i]; h = Math.imul(h, 16777619); }
        return h >>> 0;
      };
      const a = hash(), b = hash();
      return { pass: a === b, info: { a, b } };
    },
  },
  {
    name: 'cut_conservation', tag: 'V',
    run() {
      // 20 seeded random cuts through a warm, half-cooked potato and steak: mass, water and heat
      // content are conserved (slivers under 4 cells are counted), and every child mesh is closed.
      const rnd = mulberry32(42);
      const res = [];
      let worst = 0, open = 0, pieces = 0;
      for (const food of ['potato', 'steak']) {
        const W = new World(); W.burners[0].setting = 6; run(W, 300);
        const p0 = W.add(food, { T0: 20 }); W.place(p0, 'pan'); run(W, 120); W.place(p0, 'board');
        const sp = p0.spec, h = sp.meshCell, dd = sp.dims.map((x) => x / 2 + 3 * h);
        const sn = surfaceNets(sp.sdf, dd.map((x) => -x), dd, h);
        const meshes = new Map([[p0, { ...sn, cap: new Float32Array(sn.pos.length / 3) }]]);
        const tot = () => { let m = 0, w = 0, e = 0; for (const p of W.pieces) { const g = p.grid; for (let c = 0; c < g.N; c++) if (g.occ[c]) { m += g.ms[c] + g.mw[c]; w += g.mw[c]; e += (g.ms[c] + g.mw[c]) * g.T[c]; } for (let s = 0; s < g.nSkin; s++) { m += g.film[s]; w += g.film[s]; } } return { m, w, e }; };
        const before = tot();
        let dropped = 0;
        for (let i = 0; i < 10; i++) {
          const big = W.pieces.slice().sort((a, b) => b.mass() - a.mass())[0];
          const b = big.bounds();
          const pW = [b.lo[0] + (b.hi[0] - b.lo[0]) * (0.3 + 0.4 * rnd()), (b.lo[1] + b.hi[1]) / 2, b.lo[2] + (b.hi[2] - b.lo[2]) * (0.3 + 0.4 * rnd())];
          const a = rnd() * Math.PI, tilt = (rnd() - 0.5) * 0.6;
          const nW = [Math.cos(a) * Math.cos(tilt), Math.sin(tilt), Math.sin(a) * Math.cos(tilt)];
          const mBefore = tot().m;
          const r = cutPiece(W, big, meshes.get(big), nW, pW);
          if (!r) continue;
          dropped += mBefore - tot().m;
          meshes.delete(big);
          for (const x of r) {
            meshes.set(x.piece, x.mesh);
            // closed surface ⇔ the area-weighted normals sum to zero (T-junctions are fine)
            const I = x.mesh.idx, P = x.mesh.pos;
            let sx = 0, sy = 0, sz = 0, tot = 0;
            for (let t = 0; t < I.length; t += 3) {
              const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
              const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
              const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
              sx += nx; sy += ny; sz += nz; tot += Math.hypot(nx, ny, nz);
            }
            if (Math.hypot(sx, sy, sz) / tot > 1e-4) open++;
          }
        }
        const after = tot();
        const dm = Math.abs(after.m + dropped - before.m) / before.m, dw = Math.abs(after.w - before.w) / before.w, de = Math.abs(after.e - before.e) / before.e;
        worst = Math.max(worst, dm);
        pieces += W.pieces.length;
        res.push({ food, pieces: W.pieces.length, mass: dm.toExponential(1), water: dw.toExponential(1), heat: de.toExponential(1), slivers_g: +(dropped * 1000).toFixed(2) });
      }
      const ok = res.every((r) => +r.mass < 1e-3 && +r.water < 2e-3 && +r.heat < 2e-3) && open === 0;
      return { pass: ok, info: { res, notClosed: open } };
    },
  },
  {
    name: 'props_choi_okos', tag: 'P',
    run() {
      const pot = mixture(MATERIALS.potato.comp, 20).k;
      const beef79 = getMaterial('test_beef79').raw(7).k; // pure Choi–Okos (no override)
      const lean = getMaterial('beef_lean');
      const leanAt79 = mixture(MATERIALS.beef_lean.kMeasured.comp, 7).k * lean.kScale;
      return {
        pass: Math.abs(pot - 0.55) <= 0.05 && leanAt79 >= 0.43 && leanAt79 <= 0.48,
        info: { potato_k: r2(pot, 3), beef79_ChoiOkos: r2(beef79, 3), beef79_withOverride: r2(leanAt79, 3), measured: '0.43–0.48', lean_strip_k: r2(lean.raw(20).k, 3) },
      };
    },
  },
  {
    name: 'egg_williams', tag: 'P',
    run() {
      // Williams' formula is the first term of the exact series for a homogeneous sphere with surface
      // at water temperature. We simulate the full heat equation, so compare with (a) the full series
      // of Williams' own model, and (b) his printed formula for the case his article quotes (fridge egg).
      const tf = eggTime(57, 4), tr = eggTime(57, 21), t70 = eggTime(70, 4), t50 = eggTime(50, 4);
      const wf = williamsTime(57, 4), wr = williamsTime(57, 21);
      const sf = seriesEggTime(57, 4), sr = seriesEggTime(57, 21);
      const mass = t70 / t50;
      // pass/fail on the exact solution and the M^(2/3) scaling; the first-term formula gap is reported
      const pass = Math.abs(tf / sf - 1) < 0.1 && Math.abs(tr / sr - 1) < 0.1 && Math.abs(mass - 1.25) < 0.06;
      return { pass, info: { fridge_s: r2(tf, 0), fullSeries_fridge_s: r2(sf, 0), williamsFormula_fridge_s: r2(wf, 0), vsFormula_pct: r2((tf / wf - 1) * 100, 1), room_s: r2(tr, 0), fullSeries_room_s: r2(sr, 0), williamsFormula_room_s: r2(wr, 0), mass70_50: r2(mass, 3), expected_mass: r2(Math.pow(70 / 50, 2 / 3), 3) } };
    },
  },
  {
    name: 'egg_64C_bath', tag: 'P',
    run() {
      const W = new World();
      const p = W.add('egg', { T0: 4 }); W.place(p, 'pot');
      W.pot.hold = 64;
      p.envOverride = () => ({ wat: { h: pv('h_water_still'), T: 64 }, con: { h: pv('h_water_still'), T: 64 } });
      run(W, 3600);
      const ovt = p.procMean('ovotransferrin', 0), ova = p.procMean('ovalbumin', 0);
      return { pass: ovt > 0.9 && ova < 0.1, info: { ovotransferrin: r2(ovt, 3), ovalbumin: r2(ova, 3), core: r2(p.coreT()) } };
    },
  },
  {
    name: 'surface_pin_oven', tag: 'P',
    run() {
      // wet potato in 200 °C still air: surface held below boiling while wet; browns only once dry
      const W = new World();
      const p = W.add('potato'); W.place(p, 'board');
      p.envOverride = () => ({ air: { h: pv('h_oven_still'), T: 200, Trad: 200, eps: pv('eps_food'), w: 0.03 }, ins: { h: pv('h_oven_still'), T: 200 } });
      const g = p.grid;
      let wetMaxTs = -1e9, wetMaxBrown = 0, dryHot = false, sampled = 0;
      run(W, 3600, 10, () => {
        for (let s = 0; s < g.nSkin; s++) {
          const fr = g.skinFrac[s], X = g.skw[s] / (g.ms[g.skinCell[s]] * fr), X0 = g.skw0[s] / (g.ms[g.skinCell[s]] * fr);
          if (X / X0 > pv('dry_crit')) { wetMaxTs = Math.max(wetMaxTs, g.Ts[s]); wetMaxBrown = Math.max(wetMaxBrown, g.brown[s]); sampled++; }
          else if (g.Ts[s] > 140) dryHot = true;
        }
      });
      return { pass: wetMaxTs <= 100.5 && wetMaxBrown < 0.02 && dryHot, info: { wetMaxTs: r2(wetMaxTs), wetMaxBrown: r2(wetMaxBrown, 4), dryAbove140: dryHot, meanBrown: r2(p.skinMean(g.brown), 3), core: r2(p.coreT()) } };
    },
  },
  {
    name: 'boiled_potato', tag: 'P',
    run() {
      const W = new World(); W.pot.T = 100; W.burners[1].setting = 10;
      const p = W.add('potato'); W.place(p, 'pot');
      let maxT = -1e9;
      run(W, 1800, 5, () => { maxT = Math.max(maxT, p.maxT()); });
      const g = p.grid, starchCore = g.proc.starch[g.core], brown = p.skinMean(g.brown);
      return { pass: maxT <= 100.5 && brown < 0.01 && starchCore > 0.95, info: { maxT: r2(maxT), brown: r2(brown, 4), starchCore: r2(starchCore, 3), firmCore: r2(g.proc.firm[g.core], 3), core: r2(p.coreT()), doneness: p.doneness() } };
    },
  },
  {
    name: 'pectin_arrhenius', tag: 'P',
    run() {
      const spec = MATERIALS.potato.procs.find((x) => x.id === 'pectin');
      const soft = MATERIALS.potato.procs.find((x) => x.id === 'firm');
      const ratio = arrhK(spec, 100) / arrhK(spec, 90), rs = arrhK(soft, 95) / arrhK(spec, 95);
      return { pass: Math.abs(ratio - 3.56) < 0.1 && Math.abs(rs - 10) < 0.5, info: { k100_over_k90: r2(ratio, 3), soften_over_beta: r2(rs, 2) } };
    },
  },
  {
    name: 'usda_beef', tag: 'P',
    run() {
      const hold = (T) => {
        const W = new World();
        const p = W.add('t_beef', { L: 0.03, th: 0.02, cell: 0.003, T0: T }); W.place(p, 'board');
        p.moisture = false;
        p.envOverride = isoEnv({ air: { h: 1e4, T, Trad: T, eps: 0, w: 0 }, ins: { h: 1e4, T } });
        run(W, 175); const early = p.safe;
        run(W, 10); return { early, late: p.safe };
      };
      const a = hold(63), b = hold(62);
      return { pass: !a.early && a.late && !b.late, info: { at63: a, at62: b } };
    },
  },
  {
    name: 'steak_pan_sear', tag: 'F',
    run() {
      // 25 mm strip steak from the fridge into a cast-iron pan preheated 10 min on burner 6,
      // flipped every 60 s, pulled at 54 °C core. Loss target from the validated pan-cooking model
      // (19 mm steaks, 57 °C core: 11 ± 2 % water loss); ours is thicker so cooks longer.
      const W = new World(); W.burners[0].setting = 6;
      run(W, 600);
      const Tpan0 = W.pan.T;
      const p = W.add('steak', { T0: 4 }); W.place(p, 'pan');
      let t = 0;
      while (p.coreT() < 54 && t < 1800) { W.tick(1); t++; if (t % 60 === 0) flipPiece(W, p); }
      const pull = p.coreT(), lossPull = p.lossFrac();
      W.place(p, 'board');
      let peak = pull;
      run(W, 300, 1, () => { peak = Math.max(peak, p.coreT()); });
      const g = p.grid, my = g.proc.myoglobin;
      const ci = g.core % g.nx, ck = (g.core / (g.nx * g.ny)) | 0;
      let band = 0;
      for (let j = 0; j < g.ny; j++) { const c = g.idx(ci, j, ck); if (g.occ[c] && my[c] > 0.9) band++; }
      const bandMm = (band / 2) * g.dy * 1000;
      STEAK_RESULT = { pull, peak };
      const info = { pan_preheat: r2(Tpan0, 0), time_s: t, pull: r2(pull, 1), coreMyoglobin: r2(my[g.core], 3), greyBand_mm: r2(bandMm, 1), lossAtPull_pct: r2(lossPull * 100, 1), lossAfterRest_pct: r2(p.lossFrac() * 100, 1), brown: r2(p.skinMean(g.brown), 2), doneness: p.doneness() };
      return { pass: my[g.core] < 0.3 && bandMm >= 1.5 && bandMm <= 6 && lossPull <= 0.15, info };
    },
  },
  {
    name: 'steak_carryover', tag: 'P',
    run() {
      // sourced: small steaks typically rise 2–4 °C while resting (ThermoWorks); hard sears more
      if (!STEAK_RESULT) return { pass: false, info: 'needs steak_pan_sear' };
      const rise = STEAK_RESULT.peak - STEAK_RESULT.pull;
      return { pass: rise >= 1.5 && rise <= 5, info: { pull: r2(STEAK_RESULT.pull, 1), peak: r2(STEAK_RESULT.peak, 1), rise: r2(rise, 2), window: '1.5–5 °C' } };
    },
  },
  {
    name: 'steak_well_done_loss', tag: 'F',
    run() {
      const W = new World(); W.burners[0].setting = 6;
      run(W, 900);
      const p = W.add('steak', { T0: 4 }); W.place(p, 'pan');
      let t = 0;
      while (p.coreT() < 74 && t < 3600) { run(W, 60); t += 60; if (p.coreT() < 74) flipPiece(W, p); }
      W.place(p, 'board'); run(W, 300);
      const loss = p.lossFrac();
      return { pass: loss >= 0.2 && loss <= 0.3, info: { time_s: t, loss_pct: r2(loss * 100, 1), core: r2(p.coreT()), doneness: p.doneness() } };
    },
  },
  {
    name: 'maillard_threshold', tag: 'F',
    run() {
      const br = (T) => {
        const W = new World();
        const p = W.add('t_beef', { L: 0.03, th: 0.02, cell: 0.003, T0: T }); W.place(p, 'board');
        p.moisture = false;
        const g = p.grid; g.skw.fill(0); g.film.fill(0);
        p.envOverride = isoEnv({ air: { h: 1e4, T, Trad: T, eps: 0, w: 0 }, ins: { h: 1e4, T } });
        run(W, 600);
        return p.skinMean(g.brown);
      };
      const b130 = br(130), b160 = br(160);
      return { pass: b130 < 0.1 * b160, info: { b130: r2(b130, 4), b160: r2(b160, 3), ratio: r2(b130 / b160, 3) } };
    },
  },
];

export async function runAll(write, filter) {
  const results = [];
  for (const t of [...TESTS, ...TESTS_2A, ...TESTS_2B]) {
    if (filter && !filter.test(t.name)) continue;
    const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
    let r;
    try { r = await t.run(); } catch (e) { r = { pass: false, info: { error: String(e && e.stack || e) } }; }
    const ms = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
    results.push({ name: t.name, tag: t.tag, ...r, ms });
    write(`${r.pass ? 'PASS' : 'FAIL'} [${t.tag}] ${t.name} (${(ms / 1000).toFixed(1)} s) ${JSON.stringify(r.info)}`);
  }
  const nPass = results.filter((r) => r.pass).length;
  write(`SUMMARY ${nPass}/${results.length} passed`);
  return results;
}
