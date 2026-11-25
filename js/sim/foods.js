// Food definitions: composition (USDA FoodData Central), shape, materials, processes, look.
// Texture channel mapping per material: r = first process extent, g = second (for the shader).
import { steakSDF, eggSDF, potatoSDF, sphereSDF, boxSDF } from './shapes.js';
import { makeNoise } from './rng.js';
import { pv } from './params.js';
import { PRODUCE_MATS, PRODUCE_FOODS } from './produce.js';
import { DAIRY_MATS, DAIRY_FOODS } from './dairy.js';

// ---- materials -------------------------------------------------------------------------------
const meatProcs = [
  { id: 'myosin', type: 'eq', Tm: 'myosin_Tm', w: 2.5, tau: 'protein_tau' },
  { id: 'actin', type: 'eq', Tm: 'actin_Tm', w: 2.5, tau: 'protein_tau' },
  { id: 'collagen', type: 'eq', Tm: 'collagen_Tm', w: 4, tau: 'protein_tau' },
  { id: 'myoglobin', type: 'eq', Tm: 'myoglobin_Tm', w: 'myoglobin_w', tau: 'protein_tau' },
];
export const MATERIALS = {
  beef_lean: {
    name: 'Beef (lean, strip loin)', Tf: 'Tf_beef',
    comp: { water: 0.716, protein: 0.224, fat: 0.048, ash: 0.012 },
    // Choi–Okos over-predicts lean beef k; scale to the measured 0.43–0.48 W/m·K (79 % water, 7 °C)
    kMeasured: { k: 0.455, T: 7, comp: { water: 0.79, protein: 0.19, fat: 0.01, ash: 0.01 }, src: 'etb_food_k' },
    procs: meatProcs,
    whc: [['myosin', 'meat_loss_myosin'], ['actin', 'meat_loss_actin'], ['collagen', 'meat_loss_collagen']],
    chan: { r: 'myosin', g: 'myoglobin' },
    look: { c0: [0.40, 0.045, 0.06], c1: [0.80, 0.30, 0.31], c2: [0.53, 0.39, 0.30], skin: null, rough: 0.55, trans: 0.25, fiber: 1 },
  },
  beef_fat: {
    name: 'Beef fat', Tf: 'Tf_beef',
    comp: { water: 0.2, fat: 0.75, protein: 0.05 },
    procs: [{ id: 'render', type: 'eq', Tm: 52, w: 6, tau: 90 }],
    chan: { r: 'render', g: null },
    look: { c0: [0.93, 0.87, 0.77], c1: [0.96, 0.84, 0.6], c2: [0.96, 0.84, 0.6], rough: 0.45, trans: 0.3 },
  },
  egg_white: {
    name: 'Egg white',
    comp: { water: 0.876, protein: 0.109, carb: 0.007, ash: 0.006, fat: 0.002 },
    procs: [
      { id: 'ovotransferrin', type: 'eq', Tm: 'ovotransferrin_Tm', w: 1.2, tau: 60 },
      { id: 'ovalbumin', type: 'eq', Tm: 'ovalbumin_Tm', w: 2.0, tau: 60 },
    ],
    chan: { r: 'ovotransferrin', g: 'ovalbumin' },
    look: { c0: [0.62, 0.62, 0.50], c1: [0.90, 0.90, 0.86], c2: [0.985, 0.985, 0.97], skin: [0.93, 0.89, 0.82], rough: 0.25, trans: 0.6 },
  },
  egg_yolk: {
    name: 'Egg yolk',
    comp: { water: 0.52, protein: 0.16, fat: 0.27, carb: 0.036, ash: 0.011 },
    procs: [
      { id: 'yolkThick', type: 'eq', Tm: 64, w: 1.5, tau: 60 },
      { id: 'yolkSet', type: 'eq', Tm: 70, w: 1.8, tau: 60 },
    ],
    chan: { r: 'yolkThick', g: 'yolkSet' },
    look: { c0: [0.97, 0.50, 0.04], c1: [0.97, 0.56, 0.08], c2: [0.97, 0.80, 0.33], skin: [0.93, 0.89, 0.82], rough: 0.3, trans: 0.2 },
  },
  potato: {
    name: 'Potato (russet flesh)',
    comp: { water: 0.7925, carb: 0.154, fiber: 0.021, protein: 0.0205, fat: 0.001, ash: 0.0113 },
    procs: [
      { id: 'starch', type: 'eq', Tm: 'pot_starch_Tm', w: 'pot_starch_w', tau: 90 },
      { id: 'pectin', type: 'arrh1', kref: 'pectin_k100', Tref: 100, Ea: 'pectin_Ea', init: 1 },
      { id: 'firm', type: 'arrh1', kref: 'pectin_k100', kmul: 'soften_ratio', Tref: 100, Ea: 'potato_Ea', init: 1 },
      { id: 'ppo', type: 'arrh1', kref: 'ppo_k78', Tref: 78, Ea: 'ppo_Ea', init: 1 },
    ],
    enz: 0.8, sugars: { fru: 0.26, glu: 0.31, suc: 0.17 },
    chan: { r: 'starch', g: '1-firm' },
    look: { c0: [0.93, 0.88, 0.70], c1: [0.94, 0.85, 0.58], c2: [0.95, 0.82, 0.50], skin: [0.58, 0.42, 0.26], enzCol: [0.62, 0.50, 0.42], rough: 0.5, trans: 0.3, peelNoise: 1, kind: 2 },
  },
  ...PRODUCE_MATS,
  ...DAIRY_MATS,
  test_beef79: { name: 'Beef 79 % water (test)', comp: { water: 0.79, protein: 0.19, fat: 0.01, ash: 0.01 }, procs: [], chan: {}, look: {} },
  // Williams' homogeneous egg: c = 3.7 J/gK, ρ = 1.038 g/cm³, K = 0.54 W/mK
  test_williams: { name: 'Williams egg (test)', fixed: { k: 0.54, rho: 1038, cp: 3700 }, comp: { water: 0.75, protein: 0.25 }, procs: [], chan: {}, look: {} },
};

// ---- foods -----------------------------------------------------------------------------------
export const FOODS = {
  ...PRODUCE_FOODS,
  ...DAIRY_FOODS,
  steak: {
    name: 'Strip steak', kind: 'meat', cat: 'meat', safe: 'beef', icon: 'steak', storeT: 4,
    mats: ['beef_lean', 'beef_fat'],
    build(o = {}) {
      const th = o.thickness || 0.025, L = o.length || 0.17, W = o.width || 0.105;
      const sdf = steakSDF(L / 2, th / 2, W / 2, o.seed || 1);
      const fatW = 0.009;
      return {
        dims: [L, th, W], cell: [0.003, Math.min(0.001, th / 20), 0.003], meshCell: 0.0016,
        sdf, mat: (x, y, z) => (z > W / 2 - fatW - 0.002 * Math.sin(x * 40) ? 1 : 0),
        T0: o.T0 ?? 4,
      };
    },
  },
  egg: {
    name: 'Egg (large, 57 g)', kind: 'egg', cat: 'dairy', safe: 'egg', icon: 'egg', storeT: 4,
    mats: ['egg_white', 'egg_yolk'],
    build(o = {}) {
      const M = o.mass || 57; // grams, whole egg incl. shell
      const s = Math.cbrt(M / 57);
      const L = 0.057 * s, B = 0.0432 * s, ry = 0.0152 * s;
      const sdf = eggSDF(L, B);
      return {
        dims: [L * 1.04, B * 1.1, B * 1.1], cell: [0.002 * s, 0.002 * s, 0.002 * s], meshCell: 0.0012,
        sdf, mat: (x, y, z) => ((x - 0.0025 * s) ** 2 + y * y + z * z < ry * ry ? 1 : 0),
        T0: o.T0 ?? pv('Tfridge'), shellFrac: 0.1, nominalMass: M / 1000,
      };
    },
  },
  potato: {
    name: 'Potato (russet, ~210 g)', kind: 'veg', cat: 'veg', safe: null, icon: 'potato', peel: 0.0015,
    mats: ['potato'],
    build(o = {}) {
      const noise = makeNoise(o.seed || 7);
      const rx = 0.052, ry = 0.029, rz = 0.033;
      return {
        dims: [rx * 2.2, ry * 2.4, rz * 2.6], cell: [0.0025, 0.0025, 0.0025], meshCell: 0.0016,
        sdf: potatoSDF(rx, ry, rz, noise), mat: () => 0, T0: o.T0 ?? pv('Tamb'),
      };
    },
  },
  // ---- test-only shapes ----
  t_sphere: {
    name: 'Test sphere', kind: 'test', mats: ['test_williams'],
    build(o) {
      const R = o.R, h = o.cell || R / 12;
      return { dims: [2 * R, 2 * R, 2 * R], cell: [h, h, h], sdf: sphereSDF(R), mat: () => 0, T0: o.T0 ?? 4 };
    },
  },
  t_slab: {
    name: 'Test slab', kind: 'test', mats: ['test_williams'],
    build(o) {
      return { dims: [o.Lx, o.Ly, o.Lz], cell: o.cell, sdf: boxSDF(o.Lx / 2, o.Ly / 2, o.Lz / 2), mat: () => 0, T0: o.T0 ?? 20 };
    },
  },
  t_beef: {
    name: 'Test beef block', kind: 'meat', safe: 'beef', mats: ['beef_lean'],
    build(o) {
      return { dims: [o.L, o.th, o.L], cell: [o.cell, o.cellY || o.cell, o.cell], sdf: boxSDF(o.L / 2, o.th / 2, o.L / 2), mat: () => 0, T0: o.T0 ?? 4 };
    },
  },
};
