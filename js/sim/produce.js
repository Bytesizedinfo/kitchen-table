// Fruit & vegetables (phase 2a): shapes, USDA compositions (FDC SR Legacy, see params usda_fdc_produce),
// softening, enzymatic browning, sugars for caramelisation, peel. Sizes from FDC portion weights.
import { ellipsoid, len3 } from './shapes.js';
import { makeNoise } from './rng.js';

const mm = 0.001;
const soft = (kref, Ea) => ({ id: 'firm', type: 'arrh1', kref, Tref: 100, Ea, init: 1 });
const ppo = { id: 'ppo', type: 'arrh1', kref: 'ppo_k78', Tref: 78, Ea: 'ppo_Ea', init: 1 };
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// composition helper: g/100 g → fractions (carb excludes fibre)
const C = (water, protein, fat, ash, carb, fiber) => ({ water: water / 100, protein: protein / 100, fat: fat / 100, ash: ash / 100, carb: carb / 100, fiber: fiber / 100 });

export const PRODUCE_MATS = {
  onion: { name: 'Onion', comp: C(89.1, 1.10, 0.10, 0.35, 7.64, 1.7), sugars: { fru: 1.29, glu: 1.97, suc: 0.99 },
    procs: [soft('onion_k100', 100e3), { id: 'trans', type: 'eq', Tm: 'onion_trans_Tm', w: 3, tau: 150 }], chan: { r: 'trans' }, waterRelease: 1, waterFloor: 1.2,
    look: { c0: [0.94, 0.92, 0.86], c1: [0.86, 0.77, 0.50], c2: [0.86, 0.77, 0.50], skin: [0.74, 0.49, 0.24], rough: 0.3, trans: 0.4, kind: 4 } },
  carrot: { name: 'Carrot (outer cortex)', Tf: 'Tf_carrot', comp: C(88.3, 0.93, 0.24, 0.97, 6.17, 2.8), sugars: { fru: 0.55, glu: 0.59, suc: 3.59 },
    procs: [soft('carrot_k100', 'carrot_Ea')], chan: { r: '1-firm' },
    look: { c0: [0.93, 0.44, 0.08], c1: [0.96, 0.52, 0.12], c2: [0.96, 0.52, 0.12], skin: [0.84, 0.40, 0.10], rough: 0.4, trans: 0.3, kind: 11 } },
  carrot_core: { name: 'Carrot (core)', Tf: 'Tf_carrot', comp: C(88.3, 0.93, 0.24, 0.97, 6.17, 2.8), sugars: { fru: 0.55, glu: 0.59, suc: 3.59 },
    procs: [soft('carrot_k100', 'carrot_Ea')], chan: { r: '1-firm' },
    look: { c0: [0.97, 0.62, 0.22], c1: [0.97, 0.66, 0.26], c2: [0.97, 0.66, 0.26], skin: [0.84, 0.40, 0.10], rough: 0.4, trans: 0.3, kind: 11 } },
  tomato: { name: 'Tomato wall', comp: C(94.5, 0.88, 0.20, 0.50, 2.69, 1.2), sugars: { fru: 1.37, glu: 1.25, suc: 0 },
    procs: [soft('onion_k100', 90e3)], chan: { r: '1-firm' },
    look: { c0: [0.86, 0.13, 0.08], c1: [0.80, 0.16, 0.08], c2: [0.80, 0.16, 0.08], skin: [0.82, 0.10, 0.06], rough: 0.22, trans: 0.4, kind: 5 } },
  tomato_gel: { name: 'Tomato locule gel', comp: C(94.5, 0.88, 0.20, 0.50, 2.69, 1.2), sugars: { fru: 1.37, glu: 1.25, suc: 0 },
    procs: [soft('onion_k100', 90e3)], chan: { r: '1-firm' },
    look: { c0: [0.88, 0.42, 0.16], c1: [0.85, 0.36, 0.14], c2: [0.85, 0.36, 0.14], skin: [0.82, 0.10, 0.06], rough: 0.15, trans: 0.7, kind: 5 } },
  apple: { name: 'Apple flesh', comp: C(85.6, 0.26, 0.17, 0.19, 11.4, 2.4), sugars: { fru: 5.90, glu: 2.43, suc: 2.07 }, enz: 1.0,
    procs: [{ id: 'cooked', type: 'eq', Tm: 'apple_cook_Tm', w: 2, tau: 120 }, soft(2.2e-3, 'apple_Ea'), ppo], chan: { r: 'cooked' },
    look: { c0: [0.98, 0.95, 0.80], c1: [0.95, 0.86, 0.58], c2: [0.95, 0.86, 0.58], skin: [0.72, 0.09, 0.10], enzCol: [0.66, 0.47, 0.26], rough: 0.4, trans: 0.3, kind: 6 } },
  apple_core: { name: 'Apple core', comp: C(85.6, 0.26, 0.17, 0.19, 11.4, 2.4), sugars: { fru: 5.90, glu: 2.43, suc: 2.07 }, enz: 1.0,
    procs: [{ id: 'cooked', type: 'eq', Tm: 'apple_cook_Tm', w: 2, tau: 120 }, soft(2.2e-3, 'apple_Ea'), ppo], chan: { r: 'cooked' },
    look: { c0: [0.93, 0.89, 0.72], c1: [0.92, 0.84, 0.58], c2: [0.92, 0.84, 0.58], skin: [0.72, 0.09, 0.10], enzCol: [0.62, 0.44, 0.24], rough: 0.5, trans: 0.2, kind: 6 } },
  lemon: { name: 'Lemon pulp', comp: C(89.0, 1.10, 0.30, 0.30, 6.5, 2.8), sugars: { fru: 1.0, glu: 1.0, suc: 0.5 },
    procs: [soft('onion_k100', 90e3)], chan: { r: '1-firm' },
    look: { c0: [0.98, 0.88, 0.36], c1: [0.95, 0.82, 0.32], c2: [0.95, 0.82, 0.32], skin: [0.98, 0.84, 0.14], rough: 0.2, trans: 0.6, kind: 7 } },
  lemon_pith: { name: 'Lemon pith & zest', comp: C(81.6, 1.5, 0.3, 0.6, 5.4, 10.6),
    procs: [soft('onion_k100', 90e3)], chan: { r: '1-firm' },
    look: { c0: [0.97, 0.95, 0.85], c1: [0.95, 0.92, 0.78], c2: [0.95, 0.92, 0.78], skin: [0.98, 0.84, 0.14], rough: 0.45, trans: 0.2, kind: 7 } },
  banana: { name: 'Banana flesh', comp: C(74.9, 1.09, 0.33, 0.82, 20.2, 2.6), sugars: { fru: 4.85, glu: 4.98, suc: 2.39 }, enz: 1.4,
    procs: [soft(3e-3, 90e3), ppo], chan: { r: '1-firm' },
    look: { c0: [0.98, 0.94, 0.74], c1: [0.95, 0.85, 0.55], c2: [0.95, 0.85, 0.55], skin: [0.96, 0.84, 0.26], enzCol: [0.60, 0.42, 0.24], rough: 0.45, trans: 0.3, kind: 10 } },
  banana_peel: { name: 'Banana peel', comp: C(83.0, 1.0, 0.5, 1.5, 6.0, 8.0),
    procs: [{ id: 'chill', type: 'chill', Tc: 'banana_chill_T', days: 'banana_chill_days', init: 0 }], chan: { g: 'chill' },
    look: { c0: [0.96, 0.84, 0.26], c1: [0.96, 0.84, 0.26], c2: [0.22, 0.14, 0.07], skin: [0.96, 0.84, 0.26], inner: [0.94, 0.92, 0.80], rough: 0.5, trans: 0.1, kind: 10 } },
  strawberry: { name: 'Strawberry flesh', Tf: 'Tf_strawberry', comp: C(91.0, 0.67, 0.30, 0.40, 5.7, 2.0), sugars: { fru: 2.44, glu: 1.99, suc: 0.47 },
    procs: [soft(4e-3, 90e3)], chan: { r: '1-firm' },
    look: { c0: [0.86, 0.10, 0.14], c1: [0.70, 0.08, 0.12], c2: [0.70, 0.08, 0.12], skin: [0.80, 0.05, 0.10], rough: 0.25, trans: 0.4, kind: 8 } },
  strawberry_core: { name: 'Strawberry core', Tf: 'Tf_strawberry', comp: C(91.0, 0.67, 0.30, 0.40, 5.7, 2.0), sugars: { fru: 2.44, glu: 1.99, suc: 0.47 },
    procs: [soft(4e-3, 90e3)], chan: { r: '1-firm' },
    look: { c0: [0.98, 0.84, 0.84], c1: [0.85, 0.45, 0.48], c2: [0.85, 0.45, 0.48], skin: [0.80, 0.05, 0.10], rough: 0.3, trans: 0.3, kind: 8 } },
  avocado: { name: 'Avocado flesh', comp: C(73.2, 2.0, 14.7, 1.58, 1.83, 6.7), enz: 1.6,
    procs: [soft(3e-3, 90e3), ppo], chan: { r: '1-firm' },
    look: { c0: [0.86, 0.88, 0.48], c1: [0.78, 0.76, 0.40], c2: [0.78, 0.76, 0.40], skin: [0.14, 0.20, 0.08], enzCol: [0.48, 0.40, 0.20], rough: 0.4, trans: 0.2, kind: 9 } },
  avocado_outer: { name: 'Avocado flesh (outer)', comp: C(73.2, 2.0, 14.7, 1.58, 1.83, 6.7), enz: 1.6,
    procs: [soft(3e-3, 90e3), ppo], chan: { r: '1-firm' },
    look: { c0: [0.50, 0.66, 0.20], c1: [0.48, 0.55, 0.20], c2: [0.48, 0.55, 0.20], skin: [0.14, 0.20, 0.08], enzCol: [0.42, 0.36, 0.18], rough: 0.4, trans: 0.2, kind: 9 } },
  avocado_pit: { name: 'Avocado pit (seed)', comp: C(50, 2, 2, 2, 40, 4), procs: [], chan: {},
    look: { c0: [0.92, 0.80, 0.55], c1: [0.92, 0.80, 0.55], c2: [0.92, 0.80, 0.55], skin: [0.50, 0.30, 0.17], rough: 0.55, trans: 0, kind: 9 } },
  garlic: { name: 'Garlic', comp: C(58.6, 6.36, 0.50, 1.50, 31.0, 2.1), sugars: { fru: 0.5, glu: 0.3, suc: 0.2 },
    procs: [soft('onion_k100', 100e3)], chan: { r: '1-firm' },
    look: { c0: [0.97, 0.95, 0.84], c1: [0.95, 0.88, 0.62], c2: [0.95, 0.88, 0.62], skin: [0.93, 0.87, 0.76], rough: 0.4, trans: 0.3, kind: 13 } },
  pepper: { name: 'Red bell pepper', comp: C(92.2, 0.99, 0.30, 0.47, 4.2, 2.1), sugars: { fru: 2.26, glu: 1.94, suc: 0 },
    procs: [soft('onion_k100', 90e3)], chan: { r: '1-firm' },
    look: { c0: [0.82, 0.08, 0.05], c1: [0.72, 0.09, 0.05], c2: [0.72, 0.09, 0.05], skin: [0.80, 0.05, 0.04], inner: [0.88, 0.30, 0.20], rough: 0.15, trans: 0.3, kind: 12 } },
  pepper_rib: { name: 'Pepper ribs & seeds', comp: C(92.2, 0.99, 0.30, 0.47, 4.2, 2.1),
    procs: [soft('onion_k100', 90e3)], chan: { r: '1-firm' },
    look: { c0: [0.97, 0.94, 0.82], c1: [0.95, 0.90, 0.75], c2: [0.95, 0.90, 0.75], skin: [0.30, 0.45, 0.15], rough: 0.4, trans: 0.2, kind: 12 } },
};

// ---- shapes (rest space, metres; long axis along x where there is one) ----
function onionSDF() {
  const rx = 31 * mm, ry = 28 * mm;
  return (x, y, z) => {
    const s = 1 - 0.38 * Math.pow(sm(0, 1, y / ry), 2); // narrows into a neck on top
    return ellipsoid(x / s, y, z / s, rx, ry, rx) * Math.min(1, s + 0.2);
  };
}
function carrotSDF(L, R0) {
  return (x, y, z) => {
    const u = Math.max(0, Math.min(1, (x + L / 2) / L));
    const r = R0 * (1 - 0.72 * u) * (u < 0.04 ? Math.sqrt(u / 0.04) * 0.7 + 0.3 : 1);
    const rad = Math.hypot(y, z) - r;
    return Math.max(rad, Math.abs(x) - L / 2);
  };
}
function tomatoSDF(noise) {
  const R = 32 * mm, ry = 26 * mm;
  return (x, y, z) => {
    const ph = Math.atan2(z, x);
    const lobe = 1 + 0.035 * Math.cos(5 * ph) * sm(-0.2, 1, y / ry);
    return ellipsoid(x / lobe, y, z / lobe, R, ry, R) + (noise ? noise.n3(x * 60, y * 60, z * 60) * 0.0004 : 0);
  };
}
function appleSDF() {
  const R = 37 * mm, ry = 33 * mm;
  return (x, y, z) => {
    const r2 = x * x + z * z;
    const dimple = 0.0065 * Math.exp(-r2 / (14 * mm) ** 2) * (y > 0 ? 1 : 0.6);
    const s = 1 - 0.09 * sm(-1, -0.3, y / ry); // narrower at the base
    return ellipsoid(x / s, y, z / s, R, ry, R) + dimple;
  };
}
function lemonSDF() {
  const a = 34 * mm, b = 26 * mm;
  return (x, y, z) => {
    const e = ellipsoid(x, y, z, a, b, b);
    const tip = (sx) => len3(x - sx * (a + 2 * mm), y, z) - 6 * mm;
    return Math.min(e, tip(1) + 1 * mm, tip(-1) + 1 * mm);
  };
}
function bananaSDF() {
  const Rc = 0.16, th = 0.56, R0 = 17 * mm, C = [0, Rc - 0.012, 0];
  return (x, y, z) => {
    const vx = x - C[0], vy = y - C[1];
    let t = Math.atan2(vx, -vy);
    const tc = Math.max(-th, Math.min(th, t));
    const qx = C[0] + Rc * Math.sin(tc), qy = C[1] - Rc * Math.cos(tc);
    const d = Math.hypot(x - qx, y - qy, z);
    const u = Math.abs(tc) / th;
    const phi = Math.atan2(z, Math.hypot(x - C[0], y - C[1]) - Rc);
    const r = R0 * (1 - 0.55 * Math.pow(u, 3)) * (1 + 0.035 * Math.cos(5 * phi));
    let dist = d - r;
    if (Math.abs(t) > th) dist = Math.max(dist, (Math.abs(t) - th) * Rc);
    return dist;
  };
}
function strawberrySDF() {
  const L = 36 * mm, Rm = 15 * mm;
  return (x, y, z) => {
    const u = Math.max(0, Math.min(1, (L / 2 - y) / L)); // 0 at top (calyx), 1 at tip
    const r = Rm * Math.pow(Math.max(0, 1 - Math.pow(u, 1.8)), 0.55) * (0.78 + 0.22 * sm(0, 0.25, u));
    return Math.max(Math.hypot(x, z) - r, Math.abs(y) - L / 2);
  };
}
function avocadoSDF() {
  const a = 48 * mm, b = 33 * mm;
  return (x, y, z) => {
    const s = 1 - 0.2 * sm(-0.2, 1, x / a); // neck toward +x
    return ellipsoid(x, y / s, z / s, a, b, b) * Math.min(1, s + 0.15);
  };
}
function garlicSDF() {
  return (x, y, z) => {
    const bend = 0.004 * (y / 0.012) ** 2;
    const s = 1 - 0.5 * sm(0, 1, y / 0.012);
    return ellipsoid((x - bend) / s, y, z / s, 8 * mm, 12 * mm, 6.5 * mm) * Math.min(1, s + 0.3);
  };
}
function pepperSDF() {
  const R = 40 * mm, ry = 44 * mm, wall = 6 * mm;
  const outer = (x, y, z) => {
    const ph = Math.atan2(z, x);
    const lobe = 1 + 0.07 * Math.cos(4 * ph) * sm(-1, 0.3, -y / ry);
    return ellipsoid(x / lobe, y, z / lobe, R, ry, R);
  };
  return (x, y, z) => {
    const o = outer(x, y, z);
    const shell = Math.max(o, -(o + wall));
    const placenta = len3(x, y - 0.6 * ry, z) - 13 * mm; // ribs and seeds hang from the top
    const stem = Math.max(Math.hypot(x, z) - 5 * mm, Math.abs(y - ry - 4 * mm) - 7 * mm);
    return Math.min(shell, placenta, stem);
  };
}

export const PRODUCE_FOODS = {
  onion: { name: 'Onion (≈110 g)', kind: 'veg', cat: 'veg', mats: ['onion'], peel: 0.001, ringCenter: [0, -0.01, 0], layer: 0.0033,
    build: (o = {}) => ({ dims: [0.066, 0.06, 0.066], cell: [0.002, 0.002, 0.002], meshCell: 0.0012, sdf: onionSDF(), mat: () => 0, T0: o.T0 ?? 22 }) },
  carrot: { name: 'Carrot (≈60 g)', kind: 'veg', cat: 'veg', mats: ['carrot', 'carrot_core'], peel: 0.0008,
    build: (o = {}) => { const L = 0.16, R0 = 0.0155; return { dims: [L + 0.004, 2 * R0 + 0.004, 2 * R0 + 0.004], cell: [0.002, 0.002, 0.002], meshCell: 0.0012, sdf: carrotSDF(L, R0),
      mat: (x, y, z) => { const u = Math.max(0, Math.min(1, (x + L / 2) / L)); return Math.hypot(y, z) < 0.42 * R0 * (1 - 0.72 * u) ? 1 : 0; }, T0: o.T0 ?? 22 }; } },
  tomato: { name: 'Tomato (≈125 g)', kind: 'veg', cat: 'veg', mats: ['tomato', 'tomato_gel'], peel: 0.0005, skinSplit: 'tomato_split_s',
    build: (o = {}) => ({ dims: [0.07, 0.056, 0.07], cell: [0.002, 0.002, 0.002], meshCell: 0.0012, sdf: tomatoSDF(makeNoise(4)),
      // seed cavities: rounded lobes between radial walls around a central column
      mat: (x, y, z) => { const r = Math.hypot(x, z), ph = Math.atan2(z, x); const sep = Math.min(...[0.52, 2.62, 4.71].map((a) => (Math.cos(ph - a) > 0 ? Math.abs(Math.sin(ph - a)) * r : 1))); const e = ((r - 0.0135) / 0.0075) ** 2 + (y / 0.0155) ** 2; return e < 1 && sep > 2.2e-3 ? 1 : 0; }, T0: o.T0 ?? 22 }) },
  apple: { name: 'Apple (≈180 g)', kind: 'veg', cat: 'veg', mats: ['apple', 'apple_core'], peel: 0.0012,
    build: (o = {}) => ({ dims: [0.078, 0.07, 0.078], cell: [0.0025, 0.0025, 0.0025], meshCell: 0.0014, sdf: appleSDF(), mat: (x, y, z) => { const ph = Math.atan2(z, x), star = 1 + 0.35 * Math.cos(5 * ph); return (x * x + z * z) / (0.0085 * star) ** 2 + (y / 0.019) ** 2 < 1 ? 1 : 0; }, T0: o.T0 ?? 22 }) },
  lemon: { name: 'Lemon (≈100 g)', kind: 'veg', cat: 'veg', mats: ['lemon', 'lemon_pith'], peelMat: 1, peel: 0.0045,
    build: (o = {}) => { const sdf = lemonSDF(); return { dims: [0.086, 0.056, 0.056], cell: [0.002, 0.002, 0.002], meshCell: 0.0012, sdf, mat: (x, y, z) => (sdf(x, y, z) > -0.0045 ? 1 : 0), T0: o.T0 ?? 22 }; } },
  banana: { name: 'Banana (≈120 g flesh)', kind: 'veg', cat: 'veg', mats: ['banana', 'banana_peel'], peelMat: 1, peel: 0.003,
    build: (o = {}) => { const sdf = bananaSDF(); return { dims: [0.19, 0.075, 0.04], cell: [0.0025, 0.0025, 0.0025], meshCell: 0.0015, sdf, mat: (x, y, z) => (sdf(x, y, z) > -0.003 ? 1 : 0), T0: o.T0 ?? 22 }; } },
  strawberry: { name: 'Strawberry (≈12 g)', kind: 'veg', cat: 'veg', mats: ['strawberry', 'strawberry_core'],
    build: (o = {}) => ({ dims: [0.032, 0.038, 0.032], cell: [0.0015, 0.0015, 0.0015], meshCell: 0.0009, sdf: strawberrySDF(), mat: (x, y, z) => (Math.hypot(x, z) < 0.0045 - 0.06 * Math.max(0, -y) ? 1 : 0), T0: o.T0 ?? 22 }) },
  avocado: { name: 'Avocado (≈200 g)', kind: 'veg', cat: 'veg', mats: ['avocado', 'avocado_outer', 'avocado_pit'], peel: 0.0015,
    build: (o = {}) => { const sdf = avocadoSDF(); return { dims: [0.1, 0.07, 0.07], cell: [0.0025, 0.0025, 0.0025], meshCell: 0.0014, sdf,
      mat: (x, y, z) => (len3(x + 0.009, y, z) < 0.0195 ? 2 : sdf(x, y, z) > -0.004 ? 1 : 0), T0: o.T0 ?? 22 }; } },
  garlic: { name: 'Garlic clove (≈4 g)', kind: 'veg', cat: 'veg', mats: ['garlic'], peel: 0.0004,
    build: (o = {}) => ({ dims: [0.02, 0.026, 0.015], cell: [0.001, 0.001, 0.001], meshCell: 0.0007, sdf: garlicSDF(), mat: () => 0, T0: o.T0 ?? 22 }) },
  pepper: { name: 'Red bell pepper (≈160 g)', kind: 'veg', cat: 'veg', mats: ['pepper', 'pepper_rib'],
    build: (o = {}) => ({ dims: [0.09, 0.11, 0.09], cell: [0.002, 0.002, 0.002], meshCell: 0.0013, sdf: pepperSDF(),
      mat: (x, y, z) => (len3(x, y - 0.026, z) < 0.016 || y > 0.044 ? 1 : 0), T0: o.T0 ?? 22 }) },
};
