// Phase 2d foods: chicken breast, salmon (with skin), bacon, pork sausage; bread & toast, croissant,
// glazed donut, chocolate-chip cookie; ready-made layer cake and cheesecake.
// Compositions: USDA FDC SR Legacy (chicken 171077, salmon 175167, bacon 168277, white bread 174924,
// croissant 174987, donut 174992, cookie 172717, sponge cake 172706, cheesecake 172711);
// pork sausage from myfooddata 172934 (water by difference); frosting from happyforks 2915.
import { ellipsoid, boxSDF } from './shapes.js';
import { makeNoise } from './rng.js';

const C = (water, protein, fat, ash, carb, fiber = 0) => ({ water: water / 100, protein: protein / 100, fat: fat / 100, ash: ash / 100, carb: carb / 100, fiber: fiber / 100 });
const eq = (id, Tm, w = 2.5) => ({ id, type: 'eq', Tm, w, tau: 'protein_tau' });

export const MB_MATS = {
  chicken: { name: 'Chicken breast', comp: C(73.9, 22.5, 2.62, 1.13, 0), Tf: 'Tf_chicken',
    procs: [eq('myosin', 'ck_myosin_Tm'), eq('sarc', 'ck_sarc_Tm'), eq('collagen', 'ck_collagen_Tm'), eq('actin', 'ck_actin_Tm')],
    whc: [['myosin', 'ck_loss_myosin'], ['sarc', 'ck_loss_sarc'], ['actin', 'ck_loss_actin']], chan: { r: 'myosin', g: 'actin' },
    look: { c0: [0.88, 0.56, 0.54], c1: [0.89, 0.80, 0.71], c2: [0.90, 0.82, 0.73], rough: 0.45, trans: 0.3, fiber: 1, kind: 1 } },
  salmon: { name: 'Salmon (Atlantic, farmed)', comp: C(64.9, 20.4, 13.4, 1.13, 0), Tf: 'Tf_default',
    procs: [eq('opaque', 'sal_opaque_Tm', 2.5), eq('flake', 'sal_flake_Tm', 4)], whc: [['opaque', 'sal_loss_opaque'], ['flake', 'sal_loss_flake']], chan: { r: 'opaque', g: 'flake' },
    look: { c0: [0.96, 0.42, 0.28], c1: [0.98, 0.62, 0.48], c2: [0.97, 0.72, 0.60], rough: 0.4, trans: 0.45, kind: 22 } },
  salmon_skin: { name: 'Salmon skin', comp: C(55, 25, 18, 2, 0), Tf: 'Tf_default', procs: [], chan: {},
    look: { c0: [0.50, 0.52, 0.54], c1: [0.50, 0.52, 0.54], c2: [0.50, 0.52, 0.54], skin: [0.60, 0.63, 0.66], rough: 0.3, trans: 0.05, kind: 22 } },
  bacon_lean: { name: 'Bacon (lean streak)', comp: C(62, 19, 15, 3.5, 0.5), Tf: 'Tf_default', renderFat: 'bacon_render', boundWater: 'bacon_water_floor',
    procs: [eq('myosin', 'myosin_Tm'), eq('myoglobin', 'myoglobin_Tm', 3)], whc: [['myosin', 'meat_loss_myosin'], ['myoglobin', 'meat_loss_actin']], chan: { r: 'myosin', g: 'myoglobin' },
    look: { c0: [0.82, 0.32, 0.32], c1: [0.84, 0.44, 0.40], c2: [0.62, 0.34, 0.24], rough: 0.4, trans: 0.2, kind: 1 } },
  bacon_fat: { name: 'Bacon (fat)', comp: C(25, 6, 67, 1.6, 0.4), Tf: 'Tf_default', renderFat: 'bacon_render', boundWater: 'bacon_water_floor',
    procs: [{ id: 'render', type: 'eq', Tm: 'lard_Tm', w: 3, tau: 60 }], chan: { r: 'render' },
    look: { c0: [0.97, 0.92, 0.88], c1: [0.95, 0.84, 0.66], c2: [0.95, 0.84, 0.66], rough: 0.35, trans: 0.4, kind: 0 } },
  sausage: { name: 'Pork sausage', comp: C(56, 15.4, 24.8, 2.9, 0.9), Tf: 'Tf_default', renderFat: 'sausage_render',
    procs: [eq('myosin', 'myosin_Tm'), eq('myoglobin', 'myoglobin_Tm', 3)], whc: [['myosin', 'sg_loss_myosin'], ['myoglobin', 'sg_loss_myoglobin']], chan: { r: 'myosin', g: 'myoglobin' },
    look: { c0: [0.92, 0.66, 0.62], c1: [0.90, 0.70, 0.62], c2: [0.82, 0.68, 0.58], skin: [0.93, 0.72, 0.64], rough: 0.25, trans: 0.3, kind: 23 } },
  bread: { name: 'White bread', comp: C(36.4, 8.85, 3.33, 1.98, 46.7, 2.7), Tf: 'Tf_default', porosity: 'bread_porosity', sugars: { glu: 1.5, fru: 1.5, suc: 0.5 },
    procs: [], chan: {}, look: { c0: [0.96, 0.93, 0.84], c1: [0.96, 0.93, 0.84], c2: [0.96, 0.93, 0.84], rough: 0.9, trans: 0.1, kind: 25 } },
  pastry: { name: 'Croissant (laminated pastry)', comp: C(23.2, 8.2, 21.0, 1.6, 43.2, 2.6), Tf: 'Tf_default', porosity: 'pastry_porosity', sugars: { suc: 8, glu: 2 },
    fatMelt: { Tm: 'milkfat_Tm', w: 'milkfat_w', L: 'milkfat_L' }, procs: [], chan: {}, look: { c0: [0.97, 0.87, 0.64], c1: [0.97, 0.87, 0.64], c2: [0.97, 0.87, 0.64], rough: 0.6, trans: 0.15, kind: 24 } },
  donut: { name: 'Cake donut', comp: C(19.6, 5.2, 22.9, 1.5, 49.1, 1.7), Tf: 'Tf_default', porosity: 'donut_porosity', sugars: { suc: 15 },
    procs: [], chan: {}, look: { c0: [0.96, 0.85, 0.62], c1: [0.96, 0.85, 0.62], c2: [0.96, 0.85, 0.62], rough: 0.8, trans: 0.1, kind: 25 } },
  glaze: { name: 'Sugar glaze', comp: C(10, 0, 0.5, 0.1, 89.4), Tf: 'Tf_default', sugars: { suc: 80 },
    procs: [{ id: 'liq', type: 'melt', Tm: 'glaze_soft_T', w: 4, init: 0 }], chan: { r: 'liq' },
    look: { c0: [0.97, 0.95, 0.91], c1: [0.95, 0.93, 0.88], c2: [0.95, 0.93, 0.88], rough: 0.14, trans: 0.4, kind: 26 } },
  cookie: { name: 'Chocolate-chip cookie', comp: C(9.9, 3.6, 19.8, 0.97, 63.4, 2.4), Tf: 'Tf_default', porosity: 'cookie_porosity', sugars: { suc: 37 },
    procs: [], chan: {}, look: { c0: [0.86, 0.67, 0.42], c1: [0.86, 0.67, 0.42], c2: [0.86, 0.67, 0.42], rough: 0.85, trans: 0.05, kind: 25 } },
  sponge: { name: 'Sponge cake', comp: C(29.7, 5.4, 2.7, 1.2, 60.5, 0.5), Tf: 'Tf_default', porosity: 'cake_porosity', sugars: { suc: 30 },
    procs: [], chan: {}, look: { c0: [0.98, 0.89, 0.60], c1: [0.98, 0.89, 0.60], c2: [0.98, 0.89, 0.60], rough: 0.9, trans: 0.1, kind: 25 } },
  jam: { name: 'Strawberry jam', comp: C(30.4, 0.4, 0.1, 0.3, 67.7, 1.1), Tf: 'Tf_default', sugars: { suc: 25, glu: 20, fru: 20 },
    procs: [], chan: {}, look: { c0: [0.70, 0.06, 0.13], c1: [0.70, 0.06, 0.13], c2: [0.70, 0.06, 0.13], rough: 0.15, trans: 0.6, kind: 0 } },
  buttercream: { name: 'Buttercream frosting', comp: C(15.1, 0, 16.2, 0.4, 68.3), Tf: 'Tf_default', fatMelt: { Tm: 'milkfat_Tm', w: 'milkfat_w', L: 'milkfat_L' },
    procs: [{ id: 'liq', type: 'melt', Tm: 'milkfat_Tm', w: 'milkfat_w', init: 0 }], chan: { r: 'liq' }, flowAt: 0.97, puddleThick: 0.003,
    look: { c0: [0.99, 0.96, 0.89], c1: [0.99, 0.95, 0.84], c2: [0.99, 0.95, 0.84], rough: 0.5, trans: 0.2, kind: 0 } },
  cheesecake: { name: 'Cheesecake filling', comp: C(45.6, 5.5, 22.5, 0.9, 25.5), Tf: 'Tf_default', sugars: { suc: 21.8 },
    procs: [], chan: {}, look: { c0: [0.99, 0.95, 0.83], c1: [0.99, 0.95, 0.83], c2: [0.99, 0.95, 0.83], rough: 0.55, trans: 0.2, kind: 0 } },
  crust: { name: 'Biscuit crust', comp: C(5, 6, 22, 1.5, 63.5, 2), Tf: 'Tf_default', procs: [], chan: {},
    look: { c0: [0.76, 0.55, 0.32], c1: [0.76, 0.55, 0.32], c2: [0.76, 0.55, 0.32], rough: 0.95, trans: 0, kind: 25 } },
};

const cyl = (R, H) => (x, y, z) => { const r = Math.hypot(x, z) - R, h = Math.abs(y) - H / 2; return Math.min(Math.max(r, h), 0) + Math.hypot(Math.max(r, 0), Math.max(h, 0)); };
const roundCyl = (R, H, e) => (x, y, z) => cyl(R - e, H - 2 * e)(x, y, z) - e;

/** A chicken breast: teardrop outline, thick at one end, flat underneath, domed on top. */
function breastSDF() {
  return (x, y, z) => {
    const u = Math.max(0, Math.min(1, (x + 0.09) / 0.18)); // 0 at the thick end, 1 at the tip
    const end = Math.sqrt(Math.max(0, 1 - ((x - 0.004) / 0.094) ** 2));
    const w = 0.046 * (1 - 0.5 * u ** 1.4) * end ** 0.55 + 1e-4, t = 0.012 * (1 - 0.5 * u ** 1.2) * end ** 0.45 + 1e-4;
    // soft muscle slumps: flat underneath (y = −12 mm), a flattish top, rounded sides (superellipse)
    const yc = -0.012 + t;
    const f = Math.pow(Math.abs((y - yc) / t) ** 4 + Math.abs(z / w) ** 2.2, 0.25) - 1;
    return Math.max(f * Math.min(t, w) * 0.8, -0.012 - y);
  };
}
/** Croissant: a tapered tube bent into a crescent. */
function croissantSDF() {
  const Rc = 0.05;
  return (x, y, z) => {
    const a = Math.atan2(z, x + 0.02), ang = Math.max(-1.25, Math.min(1.25, a));
    const qx = Rc * Math.cos(ang) - 0.02, qz = Rc * Math.sin(ang);
    // rolled layers show as ridges across the crescent
    const r = 0.022 * (1 - 0.62 * Math.abs(ang / 1.25) ** 2) * (1 + 0.07 * Math.cos(ang * 11));
    return (Math.hypot(x - qx, (y + 0.002) * 1.3, z - qz) - r) * 0.85;
  };
}
const torus = (R, r, sy) => (x, y, z) => Math.hypot(Math.hypot(x, z) - R, y * sy) - r;

export const MB_FOODS = {
  chicken: { name: 'Chicken breast (≈190 g)', kind: 'meat', cat: 'meat', safe: 'poultry', done: 'poultry', mats: ['chicken'], storeT: 4,
    shrink: { by: ['myosin', 'actin'], len: 'ck_shrink_len', wid: 'ck_shrink_wid' },
    build: (o = {}) => ({ dims: [0.19, 0.034, 0.104], cell: [0.003, 0.0015, 0.003], meshCell: 0.0015, sdf: breastSDF(), mat: () => 0, T0: o.T0 ?? 4 }) },
  salmon: { name: 'Salmon fillet, skin on (≈245 g)', kind: 'meat', cat: 'meat', safe: 'fish', done: 'fish', mats: ['salmon', 'salmon_skin'], storeT: 4,
    shrink: { by: ['flake'], len: 'sal_shrink_len', wid: 'sal_shrink_wid' },
    build: (o = {}) => ({ dims: [0.134, 0.025, 0.074], cell: [0.003, 0.0013, 0.003], meshCell: 0.0013,
      sdf: (x, y, z) => Math.max(boxSDF(0.064, 0.0105, 0.034)(x, y, z) - 0.002, y - 0.0125 + 0.003 * Math.abs(z / 0.036) ** 6), mat: (x, y) => (y < -0.0113 ? 1 : 0), T0: o.T0 ?? 4 }) },
  bacon: { name: 'Bacon rasher (≈22 g)', kind: 'meat', cat: 'meat', safe: null, done: 'bacon', mats: ['bacon_lean', 'bacon_fat'], storeT: 4,
    shrink: { by: ['myosin'], len: 'bacon_shrink', wid: 0.08 },
    build: (o = {}) => ({ dims: [0.2, 0.0034, 0.03], cell: [0.003, 0.0008, 0.002], meshCell: 0.0008,
      sdf: (x, y, z) => boxSDF(0.098, 0.0014, 0.0135 + 0.0012 * Math.sin(x * 60))(x, y, z) - 0.0003,
      mat: (x, y, z) => ((Math.sin(z * 380 + Math.sin(x * 40) * 1.2) > 0.65 || z > 0.008) ? 1 : 0), T0: o.T0 ?? 4 }) },
  sausage: { name: 'Pork sausage (≈48 g)', kind: 'meat', cat: 'meat', safe: 'ground', done: 'sausage', mats: ['sausage'], storeT: 4, casing: 1, roll: 1,
    build: (o = {}) => ({ dims: [0.124, 0.025, 0.025], cell: [0.003, 0.0018, 0.0018], meshCell: 0.0011,
      sdf: (x, y, z) => { const ex = Math.max(0, Math.abs(x) - 0.05); return Math.hypot(ex, y, z) - 0.0115; }, mat: () => 0, T0: o.T0 ?? 4 }) },
  bread_slice: { name: 'White bread slice (≈28 g)', kind: 'bakery', cat: 'bakery', done: 'toast', mats: ['bread'], storeT: 22, initBrown: 0.9, crust: 'edge', toastable: 1,
    build: (o = {}) => ({ dims: [0.112, 0.013, 0.108], cell: [0.003, 0.0016, 0.003], meshCell: 0.0013,
      sdf: (x, y, z) => { const top = z > 0.025 ? Math.hypot(x / 1.12, (z - 0.025) * 1.75) - 0.05 : Math.abs(x) - 0.05; return Math.max(Math.max(top, -z - 0.052), Math.abs(y) - 0.006) - 0.0005; }, mat: () => 0, T0: o.T0 ?? 22 }) },
  croissant: { name: 'Croissant (≈54 g)', kind: 'bakery', cat: 'bakery', mats: ['pastry'], storeT: 22, initBrown: 0.75,
    build: (o = {}) => ({ dims: [0.11, 0.04, 0.12], cell: [0.0025, 0.0025, 0.0025], meshCell: 0.0013, sdf: croissantSDF(), mat: () => 0, T0: o.T0 ?? 22 }) },
  donut: { name: 'Glazed cake donut (≈52 g)', kind: 'bakery', cat: 'bakery', mats: ['donut', 'glaze'], storeT: 22, initBrown: 1.0,
    build: (o = {}) => { const sd = torus(0.026, 0.0155, 1.15); return { dims: [0.086, 0.032, 0.086], cell: [0.0025, 0.0016, 0.0025], meshCell: 0.0011, sdf: sd,
      mat: (x, y, z) => (y > 0.001 + 0.0018 * Math.sin(Math.atan2(z, x) * 7) && sd(x, y, z) > -0.0011 ? 1 : 0), T0: o.T0 ?? 22 }; } },
  cookie: { name: 'Chocolate-chip cookie (≈44 g)', kind: 'bakery', cat: 'bakery', mats: ['cookie', 'choc_milk'], storeT: 22, initBrown: 0.9, noDrain: 1,
    build: (o = {}) => { const nz = makeNoise(9), base = roundCyl(0.036, 0.011, 0.003); return { dims: [0.078, 0.014, 0.078], cell: [0.002, 0.0012, 0.002], meshCell: 0.001,
      sdf: (x, y, z) => base(x, y, z) + nz.n3(x * 110, y * 110, z * 110) * 0.001, mat: (x, y, z) => (nz.n3(x * 85 + 5, y * 85, z * 85) > 0.36 ? 1 : 0), T0: o.T0 ?? 22 }; } },
  layer_cake: { name: 'Layer cake (16 cm, ≈1 kg)', kind: 'bakery', cat: 'bakery', mats: ['sponge', 'jam', 'buttercream'], storeT: 4,
    build: (o = {}) => ({ dims: [0.164, 0.084, 0.164], cell: [0.004, 0.0025, 0.004], meshCell: 0.0016, sdf: roundCyl(0.08, 0.08, 0.004),
      mat: (x, y, z) => {
        const r = Math.hypot(x, z), yy = y + 0.04;
        if (r > 0.076 || yy > 0.075) return 2; // frosting: sides and top
        if (yy > 0.021 && yy < 0.0245) return 1; // jam
        if (yy > 0.0455 && yy < 0.049) return 2; // buttercream filling
        return 0;
      }, T0: o.T0 ?? 4 }) },
  cheesecake: { name: 'Cheesecake (16 cm, ≈1 kg)', kind: 'bakery', cat: 'bakery', mats: ['cheesecake', 'crust'], storeT: 4, initBrown: 0.55, crust: 'top',
    build: (o = {}) => ({ dims: [0.164, 0.049, 0.164], cell: [0.004, 0.0022, 0.004], meshCell: 0.0016, sdf: roundCyl(0.08, 0.045, 0.003), mat: (x, y) => (y < -0.0145 ? 1 : 0), T0: o.T0 ?? 4 }) },
};
