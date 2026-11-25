// Phase 2c foods: jelly dessert (ready or as a warm liquid in a mould), gummy bears, marshmallow,
// hard candy / lollipop. Gummy worms and spaghetti are chains (see chain.js).
// Gelatin: melts ~5 °C above where it sets (Gelita); 3 % gel melts 28–30 °C, gels 22–24 °C (TA);
// Young's modulus 1.6 kPa per % gelatin (arXiv 2308.10662, linear 4–8 %).
import { ellipsoid, len3 } from './shapes.js';

const C = (water, protein, fat, ash, carb, fiber = 0) => ({ water: water / 100, protein: protein / 100, fat: fat / 100, ash: ash / 100, carb: carb / 100, fiber: fiber / 100 });
const gel = (Tm, Ts, tauSet) => ({ id: 'liq', type: 'gel', Tm, Ts, tauMelt: 'gel_tau_melt', tauSet, init: 0 });
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const SWEET_MATS = {
  jelly: { name: 'Jelly (gelatin dessert)', comp: C(85.0, 1.6, 0, 0.3, 13.1), Tf: 'Tf_default', gelatin: 'jelly_gelatin',
    procs: [gel('jelly_melt', 'jelly_set', 'jelly_tau_set')], chan: { r: 'liq' }, flowAt: 0.9, puddleThick: 0.003,
    look: { c0: [0.86, 0.07, 0.13], c1: [0.80, 0.10, 0.15], c2: [0.80, 0.10, 0.15], rough: 0.06, trans: 1.2, kind: 19 } },
  gummy: { name: 'Gummy (gelatin 8 %)', comp: C(18.0, 8.0, 0, 0.2, 73.8), Tf: 'Tf_default', gelatin: 'gummy_gelatin',
    procs: [gel('gummy_melt', 'gummy_set', 'gummy_tau_set')], chan: { r: 'liq' }, flowAt: 0.92, puddleThick: 0.002, sugars: { glu: 20, suc: 35 },
    look: { c0: [0.98, 0.30, 0.10], c1: [0.95, 0.28, 0.10], c2: [0.95, 0.28, 0.10], rough: 0.45, trans: 0.6, kind: 19 } },
  gummy_b: { name: 'Gummy (gelatin 8 %), second colour', comp: C(18.0, 8.0, 0, 0.2, 73.8), Tf: 'Tf_default', gelatin: 'gummy_gelatin',
    procs: [gel('gummy_melt', 'gummy_set', 'gummy_tau_set')], chan: { r: 'liq' }, flowAt: 0.92, puddleThick: 0.002, sugars: { glu: 20, suc: 35 },
    look: { c0: [0.98, 0.82, 0.12], c1: [0.95, 0.78, 0.12], c2: [0.95, 0.78, 0.12], rough: 0.45, trans: 0.6, kind: 19 } },
  marshmallow: { name: 'Marshmallow', comp: C(16.4, 1.8, 0.2, 0.2, 81.3), Tf: 'Tf_default', porosity: 'mallow_porosity', sugars: { suc: 40, glu: 17 },
    procs: [gel('mallow_melt', 'mallow_set', 'gummy_tau_set')], chan: { r: 'liq' }, puffs: 1,
    look: { c0: [0.99, 0.98, 0.95], c1: [0.99, 0.97, 0.92], c2: [0.99, 0.97, 0.92], rough: 0.85, trans: 0.4, kind: 20 } },
  candy: { name: 'Hard candy (sugar glass)', comp: C(2.0, 0, 0, 0.1, 97.9), Tf: 'Tf_default', sugars: { suc: 60, glu: 30 },
    procs: [{ id: 'liq', type: 'melt', Tm: 'candy_flow_T', w: 4, init: 0 }, { id: 'sticky', type: 'melt', Tm: 'candy_Tg', w: 2, init: 0 }], chan: { g: 'sticky' }, flowAt: 0.9, puddleThick: 0.002,
    look: { c0: [0.95, 0.18, 0.22], c1: [0.95, 0.18, 0.22], c2: [0.90, 0.16, 0.20], rough: 0.03, trans: 1.0, kind: 21 } },
  stick: { name: 'Paper stick', comp: C(6, 0.5, 0.2, 0.5, 2, 90.8), Tf: 'Tf_default', procs: [], chan: {},
    look: { c0: [0.97, 0.96, 0.92], c1: [0.97, 0.96, 0.92], c2: [0.97, 0.96, 0.92], rough: 0.8, trans: 0, kind: 0 } },
};

function jellySDF(R, H) {
  // fluted dome as it comes out of a classic jelly mould (flat base down)
  return (x, y, z) => {
    const yy = y + H / 2;
    const th = Math.atan2(z, x);
    const prof = R * (1 + 0.07 * Math.cos(8 * th)) * Math.sqrt(Math.max(0, 1 - (yy / H) ** 2)) * (0.75 + 0.25 * sm(0, 0.25, 1 - yy / H));
    const d = Math.hypot(x, z) - prof;
    return Math.max(d * 0.85, -yy, yy - H);
  };
}
function bearSDF(s) {
  // a little bear: body, head, ears, arms, legs (metres, scale s)
  const P = (cx, cy, cz, rx, ry, rz) => (x, y, z) => ellipsoid(x - cx * s, y - cy * s, z - cz * s, rx * s, ry * s, rz * s);
  const parts = [P(0, -0.002, 0, 0.0055, 0.0065, 0.0035), P(0, 0.0068, 0, 0.0045, 0.004, 0.0033), P(-0.0035, 0.0105, 0, 0.0016, 0.0016, 0.0015), P(0.0035, 0.0105, 0, 0.0016, 0.0016, 0.0015),
    P(-0.0055, 0.0005, 0, 0.0022, 0.0028, 0.0022), P(0.0055, 0.0005, 0, 0.0022, 0.0028, 0.0022), P(-0.003, -0.0085, 0, 0.0026, 0.0026, 0.0026), P(0.003, -0.0085, 0, 0.0026, 0.0026, 0.0026)];
  return (x, y, z) => { let d = 1; for (const f of parts) d = Math.min(d, f(x, y, z)); return d; };
}

export const SWEET_FOODS = {
  gummy_worm: { name: 'Gummy worm (≈5 g)', kind: 'sweet', cat: 'sweets', mats: ['gummy', 'gummy_b'], storeT: 22,
    chain: { L: 0.075, R: 0.004, seg: 0.004, matOf: (u) => (u < 0.5 ? 0 : 1) } },
  jelly: { name: 'Jelly dessert (≈350 g)', kind: 'sweet', cat: 'sweets', mats: ['jelly'], storeT: 4, wobble: 1,
    build: (o = {}) => ({ dims: [0.11, 0.06, 0.11], cell: [0.004, 0.003, 0.004], meshCell: 0.0016, sdf: jellySDF(0.05, 0.055), mat: () => 0, T0: o.T0 ?? 4 }) },
  jelly_mix: { name: 'Jelly mix in a mould (warm liquid)', kind: 'sweet', cat: 'sweets', mats: ['jelly'], storeT: 60, wobble: 1, mould: 1, liquidStart: 1,
    build: (o = {}) => ({ dims: [0.11, 0.06, 0.11], cell: [0.004, 0.003, 0.004], meshCell: 0.0016, sdf: (x, y, z) => jellySDF(0.05, 0.055)(x, -y, z), mat: () => 0, T0: o.T0 ?? 60 }) },
  gummy_bear: { name: 'Gummy bear (≈2 g)', kind: 'sweet', cat: 'sweets', mats: ['gummy'], storeT: 22, wobble: 1,
    build: (o = {}) => ({ dims: [0.016, 0.022, 0.009], cell: [0.001, 0.001, 0.001], meshCell: 0.0006, sdf: bearSDF(1), mat: () => 0, T0: o.T0 ?? 22 }) },
  marshmallow: { name: 'Marshmallow (≈7 g)', kind: 'sweet', cat: 'sweets', mats: ['marshmallow'], storeT: 22,
    build: (o = {}) => ({ dims: [0.03, 0.03, 0.03], cell: [0.0015, 0.0015, 0.0015], meshCell: 0.0009,
      sdf: (x, y, z) => { const r = Math.hypot(x, z) - 0.0125, h = Math.abs(y) - 0.0125; return Math.min(Math.max(r, h), 0) + Math.hypot(Math.max(r + 0.003, 0), Math.max(h + 0.003, 0)) - 0.003; }, mat: () => 0, T0: o.T0 ?? 22 }) },
  lollipop: { name: 'Lollipop (≈12 g)', kind: 'sweet', cat: 'sweets', mats: ['candy', 'stick'], storeT: 22,
    build: (o = {}) => ({ dims: [0.034, 0.09, 0.012], cell: [0.0012, 0.0015, 0.0012], meshCell: 0.0007,
      sdf: (x, y, z) => Math.min(ellipsoid(x, y - 0.026, z, 0.016, 0.016, 0.0055), Math.max(Math.hypot(x, z) - 0.002, Math.abs(y + 0.012) - 0.032)),
      mat: (x, y, z) => (y < 0.012 && Math.hypot(x, z) < 0.0025 ? 1 : 0), T0: o.T0 ?? 22 }) },
};
