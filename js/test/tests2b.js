// Phase 2b tests: freezing and thawing, melting, puddles, chocolate temper.
import { World } from '../sim/world.js';
import { pv } from '../sim/params.js';
import { frozenFrac, T_MIN, NT } from '../sim/props.js';
import { getMaterial } from '../sim/piece.js';

const r2 = (x, d = 2) => +(+x).toFixed(d);
const Z = { h: 0, T: 0 };
const hold = (T, h = 1e4) => () => ({ con: { ...Z }, air: { h, T, Trad: T, eps: 0, w: 0 }, wat: { ...Z }, ins: { h, T }, oil: { ...Z } });

/** Cumulative enthalpy tables (J/kg) built from the bin-averaged apparent heat capacities. */
function enthalpyFns(m) {
  const Hs = new Float64Array(NT + 1), Hw = new Float64Array(NT + 1);
  for (let i = 0; i < NT; i++) { Hs[i + 1] = Hs[i] + m.cpS[i]; Hw[i + 1] = Hw[i] + m.cpW[i]; }
  const at = (H, T) => { const f = T - T_MIN + 0.5; let i = Math.floor(f); i = Math.max(0, Math.min(NT - 1, i)); return H[i] + (H[i + 1] - H[i]) * (f - i); };
  return { s: (T) => at(Hs, T), w: (T) => at(Hw, T) };
}
function pieceH(p) {
  const g = p.grid; let H = 0;
  const fns = p.mats.map(enthalpyFns);
  for (let c = 0; c < g.N; c++) if (g.occ[c]) { const f = fns[g.mat[c]]; H += g.ms[c] * f.s(g.T[c]) + g.mw[c] * f.w(g.T[c]); }
  return H;
}
function beefBlock(W, T0, L = 0.1, th = 0.025, cell = 0.004) {
  const p = W.add('t_beef', { L, th, cell, cellY: 0.0025, T0 });
  return p;
}

export const TESTS_2B = [
  {
    name: 'freeze_energy', tag: 'V',
    run() {
      // freezing a beef block: heat removed at the surface = enthalpy lost (latent heat included)
      const W = new World();
      const p = beefBlock(W, 10, 0.04, 0.02, 0.003); W.place(p, 'board');
      p.moisture = false; p.envOverride = hold(-25, 25);
      const H0 = pieceH(p);
      let Q = 0;
      for (let t = 0; t < 4 * 3600; t++) { W.tick(1); const o = p.lastOut || { Qair: 0, Qins: 0 }; Q += (o.Qair + o.Qins + (o.Qcon || 0)) * 1; }
      const dH = pieceH(p) - H0;
      const err = Math.abs(dH - Q) / Math.abs(Q);
      return { pass: err < 0.01, info: { heatOut_kJ: r2(-Q / 1000), enthalpyDrop_kJ: r2(-dH / 1000), relErr: r2(err, 5), coreT: r2(p.coreT(), 1) } };
    },
  },
  {
    name: 'icecream_freezing_curve', tag: 'P',
    run() {
      // one fitted parameter (unfreezable water) must reproduce all three of Goff's points
      const m = getMaterial('icecream');
      const f = (T) => frozenFrac(T, m.Tf, m.rb);
      const pts = [[-5.9, 0.5], [-10.8, 0.7], [-16.6, 0.8]].map(([T, want]) => ({ T, model: r2(f(T), 3), goff: want }));
      return { pass: pts.every((x) => Math.abs(x.model - x.goff) <= 0.03), info: pts };
    },
  },
  {
    name: 'beef_freezing_plateau', tag: 'P',
    run() {
      // a 25 mm beef block in a −18 °C freezer: the centre lingers just below the initial freezing point (−1.7 °C)
      const W = new World({ dt: 2 });
      const p = beefBlock(W, 4); W.place(p, 'freezer');
      let tTot = 0, tPlat = 0;
      while (p.coreT() > -10 && tTot < 12 * 3600) { W.tick(2); tTot += 2; const T = p.coreT(); if (T < -1.2 && T > -3) tPlat += 2; }
      return { pass: tPlat / tTot > 0.25, info: { hours_to_minus10: r2(tTot / 3600, 2), plateau_h: r2(tPlat / 3600, 2), plateauShare: r2(tPlat / tTot, 2), band: '−3 to −1.2 °C' } };
    },
  },
  {
    name: 'fridge_thaw_time', tag: 'P',
    run() {
      // 450 g (≈1 lb) frozen beef, 25 mm thick, thawed in a 4 °C fridge: FSIS says about a day for a small package
      const W = new World({ dt: 5 });
      const p = beefBlock(W, -18, 0.13, 0.025, 0.005); W.place(p, 'fridge');
      const m = p.mass();
      let t = 0;
      while (p.minT() < -1 && t < 72 * 3600) { W.tick(5); t += 5; }
      return { pass: t >= 8 * 3600 && t <= 36 * 3600, info: { mass_g: r2(m * 1000, 0), thawed_after_h: r2(t / 3600, 1), sourced: '≈1 day per 1 lb package' } };
    },
  },
  {
    name: 'chocolate_melts_at_form_V', tag: 'P',
    run() {
      const at = (T) => { const W = new World(); const p = W.add('choc_dark', { T0: T }); W.place(p, 'board'); p.envOverride = hold(T); p.moisture = false; p.noDrain = true; for (let i = 0; i < 300; i++) W.tick(1); return p.procMean('liq'); };
      const a = at(30), b = at(35);
      return { pass: a < 0.1 && b > 0.9, info: { liquid_at_30C: r2(a, 3), liquid_at_35C: r2(b, 3), sourced: 'Form V melts at 33.8 °C' } };
    },
  },
  {
    name: 'butter_melting_range', tag: 'P',
    run() {
      const at = (T) => { const W = new World(); const p = W.add('butter', { T0: T }); W.place(p, 'board'); p.envOverride = hold(T); p.moisture = false; p.noDrain = true; for (let i = 0; i < 300; i++) W.tick(1); return p.procMean('liq'); };
      const a = at(20), b = at(37);
      return { pass: a < 0.15 && b > 0.95, info: { liquid_at_20C: r2(a, 3), liquid_at_37C: r2(b, 3), sourced: 'spreadable 16–24 °C; fully melted ≈37 °C' } };
    },
  },
  {
    name: 'cheese_flow_order', tag: 'P',
    run() {
      const onset = (id) => { const m = getMaterial(id); const sp = m.procSpecs.find((s) => s.id === 'liq'); for (let T = 30; T < 90; T += 0.1) if (1 / (1 + Math.exp(-(T - sp.Tm) / sp.w)) >= 0.5) return r2(T, 1); return null; };
      const mz = onset('mozzarella'), cd = onset('cheddar');
      return { pass: mz < cd && Math.abs(mz - 53) <= 2 && Math.abs(cd - 59) <= 2, info: { mozzarella_flows_C: mz, cheddar_flows_C: cd, sourced: '≈53 / ≈59 °C' } };
    },
  },
  {
    name: 'puddle_conservation', tag: 'V',
    run() {
      // chocolate on a 45 °C plate melts into a puddle: solid + puddle mass is conserved
      const W = new World();
      const p = W.add('choc_dark', { T0: 20 }); W.place(p, 'plate');
      p.envOverride = () => ({ ins: { h: 300, T: 45 }, air: { h: 10, T: 30, Trad: 30, eps: 0.9, w: 0.01 } });
      const solids = () => { let ms = 0; if (W.pieces.includes(p)) { const g = p.grid; for (let c = 0; c < g.N; c++) if (g.occ[c]) ms += g.ms[c]; } return ms + W.puddles.reduce((a, x) => a + x.ms, 0); };
      const m0 = p.mass(), s0 = solids();
      for (let i = 0; i < 1800; i++) W.tick(1);
      const solid = W.pieces.includes(p) ? p.mass() : 0, pud = W.puddles.reduce((a, x) => a + x.mass(), 0);
      // dry matter can't evaporate: it must all be in the piece or the puddle; total loss ≤ the water it had
      const err = Math.abs(solids() - s0) / s0, lost = (m0 - solid - pud) / m0;
      return { pass: pud > 0.3 * m0 && err < 1e-6 && lost >= 0 && lost <= 0.0145, info: { start_g: r2(m0 * 1000, 1), solid_g: r2(solid * 1000, 1), puddle_g: r2(pud * 1000, 1), drySolidsErr: err, waterEvaporated_pct: r2(lost * 100, 2) } };
    },
  },
  {
    name: 'butter_foams_then_browns', tag: 'F',
    run() {
      const W = new World(); W.burners[0].setting = 5; W.pan.oil = 'none'; W.pan.oiled = false; W.pan.smokePoint = null;
      for (let i = 0; i < 300; i++) W.tick(1);
      const p = W.add('butter', { T0: 4 }); W.place(p, 'pan');
      let tFoam = null, tBrown = null, tSmoke = null;
      for (let t = 1; t <= 1800 && tSmoke == null; t++) {
        W.tick(1);
        const pd = W.pan.butter;
        if (!pd) continue;
        if (tFoam == null && pd.foam > 0.05) tFoam = t;
        if (tBrown == null && pd.brown > 0.4) tBrown = t;
        if (tSmoke == null && pd.smoking()) tSmoke = t;
      }
      return { pass: tFoam != null && tBrown != null && tFoam < tBrown && (tSmoke == null || tBrown < tSmoke), info: { foam_s: tFoam, brownButter_s: tBrown, smoke_s: tSmoke } };
    },
  },
  {
    name: 'chocolate_bloom_vs_temper', tag: 'F',
    run() {
      const runPath = (temps) => {
        const W = new World();
        const p = W.add('choc_dark', { T0: 20 }); W.place(p, 'board'); p.moisture = false; p.noDrain = true; // in a bowl
        for (const [T, sec] of temps) { p.envOverride = hold(T); for (let i = 0; i < sec; i++) W.tick(1); }
        return { bloom: r2(p.bloom || 0, 2), temper: p.temper };
      };
      const careless = runPath([[45, 900], [20, 1800]]);
      const tempered = runPath([[45, 900], [27, 900], [31, 900], [20, 1800]]);
      return { pass: careless.bloom > 0.5 && tempered.bloom < 0.1, info: { meltedThenCooled: careless, tempered } };
    },
  },
];
