// Phase 2b foods: butter, chocolate (dark, milk), ice cream, cheddar, mozzarella.
// Compositions USDA FDC (params usda_dairy); melting from sourced melting points (params).
import { ellipsoid, boxSDF } from './shapes.js';

const C = (water, protein, fat, ash, carb, fiber = 0) => ({ water: water / 100, protein: protein / 100, fat: fat / 100, ash: ash / 100, carb: carb / 100, fiber: fiber / 100 });
const melt = (Tm, w) => ({ id: 'liq', type: 'melt', Tm, w, init: 0 });

export const DAIRY_MATS = {
  butter: { name: 'Butter (salted)', comp: C(16.2, 0.85, 81.1, 2.11, 0.06), Tf: 'Tf_default',
    fatMelt: { Tm: 'milkfat_Tm', w: 'milkfat_w', L: 'milkfat_L' }, procs: [melt('milkfat_Tm', 'milkfat_w')], chan: { r: 'liq' },
    flowAt: 0.93, puddleThick: 0.0015, smoke: 'smoke_butter',
    look: { c0: [0.98, 0.90, 0.58], c1: [0.97, 0.80, 0.30], c2: [0.97, 0.80, 0.30], rough: 0.4, trans: 0.35, kind: 15 } },
  choc_dark: { name: 'Dark chocolate 70–85 %', comp: C(1.4, 7.8, 42.6, 2.3, 34.9, 11), Tf: 'Tf_default',
    fatMelt: { Tm: 'cocoa_Tm', w: 'cocoa_w', L: 'cocoa_L' }, procs: [melt('cocoa_Tm', 'cocoa_w')], chan: { r: 'liq' },
    flowAt: 0.95, puddleThick: 0.003, chocolate: 1,
    look: { c0: [0.29, 0.16, 0.09], c1: [0.24, 0.12, 0.06], c2: [0.24, 0.12, 0.06], bloom: [0.58, 0.50, 0.43], rough: 0.25, trans: 0.05, kind: 16 } },
  choc_milk: { name: 'Milk chocolate', comp: C(1.43, 7.7, 29.7, 1.7, 56, 3.4), Tf: 'Tf_default',
    fatMelt: { Tm: 'cocoa_Tm', w: 'cocoa_w', L: 'cocoa_L' }, procs: [melt('cocoa_Tm', 'cocoa_w')], chan: { r: 'liq' },
    flowAt: 0.95, puddleThick: 0.003, chocolate: 1,
    look: { c0: [0.50, 0.31, 0.18], c1: [0.44, 0.26, 0.14], c2: [0.44, 0.26, 0.14], bloom: [0.70, 0.60, 0.50], rough: 0.28, trans: 0.05, kind: 16 } },
  icecream: { name: 'Vanilla ice cream', comp: C(61.0, 3.5, 11.0, 0.9, 23.6), Tf: 'Tf_icecream', boundFrac: 'ic_bound', porosity: 0.4,
    procs: [{ id: 'liq', type: 'thaw', init: 0 }], chan: { r: 'liq' }, flowAt: 0.8, puddleThick: 0.003,
    look: { c0: [0.98, 0.95, 0.84], c1: [0.97, 0.92, 0.78], c2: [0.97, 0.92, 0.78], rough: 0.7, trans: 0.4, kind: 17 } },
  cheddar: { name: 'Cheddar', comp: C(36.8, 22.9, 33.3, 3.71, 3.4), Tf: 'Tf_default',
    procs: [melt('cheddar_flow', 'flow_w')], chan: { r: 'liq' }, flowAt: 0.97, puddleThick: 0.004,
    look: { c0: [0.97, 0.72, 0.28], c1: [0.98, 0.64, 0.18], c2: [0.98, 0.64, 0.18], rough: 0.45, trans: 0.25, kind: 18 } },
  mozzarella: { name: 'Mozzarella', comp: C(50.0, 22.2, 22.1, 3.28, 2.4), Tf: 'Tf_default', blister: 1,
    procs: [melt('mozz_flow', 'flow_w')], chan: { r: 'liq' }, flowAt: 0.97, puddleThick: 0.004,
    look: { c0: [0.97, 0.96, 0.92], c1: [0.98, 0.95, 0.86], c2: [0.98, 0.95, 0.86], rough: 0.35, trans: 0.35, kind: 18 } },
};

export const DAIRY_FOODS = {
  butter: { name: 'Butter stick (113 g)', kind: 'dairy', cat: 'dairy', mats: ['butter'], storeT: 4,
    build: (o = {}) => ({ dims: [0.122, 0.032, 0.032], cell: [0.003, 0.0025, 0.0025], meshCell: 0.0014, sdf: boxSDF(0.0605, 0.0158, 0.0158), mat: () => 0, T0: o.T0 ?? 4 }) },
  cheddar: { name: 'Cheddar block (200 g)', kind: 'dairy', cat: 'dairy', mats: ['cheddar'], storeT: 4,
    build: (o = {}) => ({ dims: [0.092, 0.038, 0.056], cell: [0.003, 0.0025, 0.003], meshCell: 0.0014, sdf: boxSDF(0.045, 0.0185, 0.0275), mat: () => 0, T0: o.T0 ?? 4 }) },
  mozzarella: { name: 'Mozzarella ball (125 g)', kind: 'dairy', cat: 'dairy', mats: ['mozzarella'], storeT: 4,
    build: (o = {}) => ({ dims: [0.064, 0.054, 0.064], cell: [0.0025, 0.0025, 0.0025], meshCell: 0.0013, sdf: (x, y, z) => ellipsoid(x, y, z, 0.031, 0.026, 0.031), mat: () => 0, T0: o.T0 ?? 4 }) },
  icecream: { name: 'Ice cream scoop (≈75 g)', kind: 'dairy', cat: 'sweets', mats: ['icecream'], storeT: -15,
    build: (o = {}) => ({ dims: [0.066, 0.06, 0.066], cell: [0.0025, 0.0025, 0.0025], meshCell: 0.0012,
      // a scoop: folds dragged by the scoop on top, flatter base
      sdf: (x, y, z) => ellipsoid(x, y + 0.004, z, 0.031, 0.026, 0.031) + 0.0012 * Math.sin(Math.atan2(z, x) * 2 + y * 120) * Math.max(0, (y + 0.004) / 0.026) + Math.max(0, -0.016 - y), mat: () => 0, T0: o.T0 ?? -15 }) },
  choc_dark: { name: 'Dark chocolate bar (100 g)', kind: 'sweet', cat: 'sweets', mats: ['choc_dark'], storeT: 20,
    build: (o = {}) => ({ dims: [0.152, 0.008, 0.077], cell: [0.003, 0.0011, 0.003], meshCell: 0.001, sdf: (x, y, z) => boxSDF(0.0745, 0.0029, 0.037)(x, y, z) - 0.0006, mat: () => 0, T0: o.T0 ?? 20 }) },
  choc_milk: { name: 'Milk chocolate bar (100 g)', kind: 'sweet', cat: 'sweets', mats: ['choc_milk'], storeT: 20,
    build: (o = {}) => ({ dims: [0.152, 0.008, 0.077], cell: [0.003, 0.0011, 0.003], meshCell: 0.001, sdf: (x, y, z) => boxSDF(0.0745, 0.0029, 0.037)(x, y, z) - 0.0006, mat: () => 0, T0: o.T0 ?? 20 }) },
};
