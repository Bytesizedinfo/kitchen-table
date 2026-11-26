// Phase 2d tests: chicken, salmon, bacon, sausage, toast, cookie, layer cake.
import { World } from '../sim/world.js';
import { pv } from '../sim/params.js';
import { flipPiece, rollPiece } from '../sim/ops.js';
import { splitGrid } from '../sim/cut.js';

const r2 = (x, d = 2) => +(+x).toFixed(d);
const Z = { h: 0, T: 0 };
const hold = (T, h = 1e4) => () => ({ con: { ...Z }, air: { h, T, Trad: T, eps: 0, w: 0 }, wat: { ...Z }, ins: { h, T }, oil: { ...Z } });
const fatOf = (p) => p.mats.reduce((a, m, mi) => { let s = 0; const g = p.grid; for (let c = 0; c < g.N; c++) if (g.occ[c] && g.mat[c] === mi) s += g.ms[c] + g.mw[c]; return a + s * (m.comp.fat || 0); }, 0);

export const TESTS_2D = [
  {
    name: 'chicken_poached_yield_and_safe_74C', tag: 'P',
    run() {
      // poached in water just below a simmer until the coldest interior point reaches 74 °C (USDA)
      const W = new World(); W.pot.hold = 85;
      const p = W.add('chicken'); W.place(p, 'pot');
      const m0 = p.mass(); let t = 0, early = false;
      while (!p.safe && t < 4000) { W.tick(1); t++; if (p.safe && p.minInteriorT() < pv('safe_poultry')) early = true; }
      const y = p.mass() / m0;
      return { pass: p.safe && !early && y >= 0.70 && y <= 0.88, info: { mass_g: r2(m0 * 1000, 0), safe_after_min: r2(t / 60, 1), coldestInterior: r2(p.minInteriorT(), 1), yield: r2(y, 3), sourced: 'poached breast yield 77 % (70–88); safe at 74 °C' } };
    },
  },
  {
    name: 'chicken_sous_vide_60C_loss', tag: 'P',
    run() {
      const W = new World(); W.pot.hold = 60;
      const p = W.add('chicken'); W.place(p, 'pot');
      const m0 = p.mass();
      for (let t = 0; t < 3600; t++) W.tick(1);
      const loss = 1 - p.mass() / m0;
      return { pass: loss >= 0.04 && loss <= 0.095, info: { loss_after_1h: r2(loss, 3), core: r2(p.coreT(), 1), sourced: '6.6 % at 60 °C for 1 h' } };
    },
  },
  {
    name: 'salmon_loses_less_than_chicken', tag: 'P',
    run() {
      // Kong 2008: plateau cook loss chicken 30.6 % vs salmon 23.4 % (ratio 1.31); here 40 min in 95 °C water
      const loss = (id) => { const W = new World(); W.pot.hold = 95; const p = W.add(id); W.place(p, 'pot'); const m0 = p.mass(); for (let t = 0; t < 2400; t++) W.tick(1); return 1 - p.mass() / m0; };
      const c = loss('chicken'), s = loss('salmon'), ratio = c / s, want = pv('kong_loss_chicken') / pv('kong_loss_salmon');
      return { pass: s < c && Math.abs(ratio - want) < 0.25 && c < pv('kong_loss_chicken') + 0.03 && s < pv('kong_loss_salmon') + 0.03, info: { chicken: r2(c, 3), salmon: r2(s, 3), ratio: r2(ratio, 2), sourcedRatio: r2(want, 2) } };
    },
  },
  {
    name: 'salmon_safe_flag_62_8C', tag: 'V',
    run() {
      // seared, turned every minute: the safety flag flips exactly when the coldest interior point passes 62.8 °C
      const W = new World(); W.pan.hold = 180;
      const p = W.add('salmon'); W.place(p, 'pan');
      let t = 0, prev = -1e9, ok = true;
      while (!p.safe && t < 3000) { W.tick(1); t++; if (t % 60 === 0) flipPiece(W, p); const m = p.minInteriorT(); if (p.safe && !(m >= pv('safe_fish') && prev < pv('safe_fish') + 2)) ok = false; prev = m; }
      return { pass: p.safe && ok, info: { safe_after_min: r2(t / 60, 1), core: r2(p.coreT(), 1), doneness: p.doneness(), flakeAtCore: r2(p.grid.proc.flake[p.grid.core], 2) } };
    },
  },
  {
    name: 'bacon_pan_yield', tag: 'F',
    run() {
      // pan-fried at a steady medium heat, turned every 3 min, until crisp
      const W = new World(); W.pan.hold = 165;
      const p = W.add('bacon'); W.place(p, 'pan');
      const m0 = p.mass(), fat0 = fatOf(p);
      let t = 0;
      while (p.skinMean(p.grid.brown) < 1.0 && t < 1800) { W.tick(1); t++; if (t % 180 === 0) flipPiece(W, p); }
      const y = p.mass() / m0, fr = p.fatRendered / fat0;
      return { pass: y >= 0.28 && y <= 0.34 && fr > 0.85 && fr < 0.95 && t >= 240 && t <= 840 && Math.abs(W.pan.fat - p.fatRendered) < 1e-9, info: { crisp_after_min: r2(t / 60, 1), yield: r2(y, 3), fatRendered: r2(fr, 3), fatInPan_g: r2(W.pan.fat * 1000, 2), sourced: 'yield 31 % (30–31); 91 % of the fat renders' } };
    },
  },
  {
    name: 'sausage_pan_yield_71C', tag: 'F',
    run() {
      // griddle 149–163 °C, turned often, to 71 °C in the centre
      const W = new World(); W.pan.hold = 160;
      const p = W.add('sausage'); W.place(p, 'pan');
      const m0 = p.mass(); let t = 0;
      while (p.coreT() < pv('safe_ground') && t < 3000) { W.tick(1); t++; if (t % 45 === 0) rollPiece(W, p); }
      const y = p.mass() / m0;
      return { pass: y >= 0.77 && y <= 0.86 && t >= 600 && t <= 1500, info: { minutes: r2(t / 60, 1), yield: r2(y, 3), fat_g: r2(p.fatRendered * 1000, 2), casingSplit: p.skinSplit, sourced: 'yield 80 % (77–86) at 71 °C; 10–25 min' } };
    },
  },
  {
    name: 'toast_shades', tag: 'F',
    run() {
      const toast = (shade) => {
        const W = new World(); const p = W.add('bread_slice'); W.place(p, 'toaster'); W.toaster.shade = shade; W.toastStart();
        let t = 0, Tmax = 0; while (W.toaster.on && t < 600) { W.tick(1); t++; Tmax = Math.max(Tmax, p.surfaceT()); }
        return { b: p.faceBrown(), t, Tmax, popped: p.support.y === W.toaster.slotPos(0)[1] };
      };
      const a = toast(1), b = toast(4), c = toast(7);
      return { pass: a.b < 0.3 && b.b > 0.45 && b.b < 1.0 && c.b > 2.0 && b.Tmax > 100 && c.Tmax < 230 && b.popped, info: { light: r2(a.b, 2), medium: r2(b.b, 2), dark: r2(c.b, 2), medium_s: b.t, surfaceMax_medium: r2(b.Tmax, 0), surfaceMax_dark: r2(c.Tmax, 0), sourced: 'toast surface 100–200 °C (weak)' } };
    },
  },
  {
    name: 'cookie_chips_melt_in_place', tag: 'F',
    run() {
      const W = new World(); const p = W.add('cookie'); W.place(p, 'plate'); p.envOverride = hold(40);
      const m0 = p.mass();
      for (let i = 0; i < 600; i++) W.tick(1);
      const liq = p.procMean('liq', 1);
      return { pass: liq > 0.9 && W.pieces.includes(p) && W.puddles.length === 0 && Math.abs(p.mass() - m0) / m0 < 0.02, info: { chipsMelted: r2(liq, 3), puddles: W.puddles.length } };
    },
  },
  {
    name: 'layer_cake_slice_shows_layers', tag: 'V',
    run() {
      const W = new World(); const p = W.add('layer_cake'); W.place(p, 'plate');
      const m0 = p.mass();
      const r = splitGrid(p, [1, 0, 0], 0.03);
      const parts = r.parts.map((x) => x.piece);
      const m1 = parts.reduce((a, q) => a + q.mass(), 0);
      // materials on the new cut face of the smaller part
      const small = parts.reduce((a, q) => (q.mass() < a.mass() ? q : a));
      const g = small.grid, seen = new Set(), q = [0, 0, 0];
      for (let c = 0; c < g.N; c++) if (g.occ[c]) { g.center(c, q); if (q[0] < 0.03 + g.dx) seen.add(g.mat[c]); }
      return { pass: Math.abs(m1 - m0) < 1e-9 && seen.size === 3, info: { mass_g: r2(m0 * 1000, 0), slice_g: r2(small.mass() * 1000, 0), layersOnCut: [...seen].map((i) => p.mats[i].name) } };
    },
  },
];
