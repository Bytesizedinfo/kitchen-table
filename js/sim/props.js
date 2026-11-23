// Food thermal properties from composition (Choi & Okos 1986), valid −40…150 °C.
// Coefficients as reproduced in the ASHRAE Handbook (Thermal properties of foods) and Singh & Heldman.
// T in °C. k in W/m·K, ρ in kg/m³, cp in J/kg·K.

const CO = {
  water: { k: [5.7109e-1, 1.7625e-3, -6.7036e-6], rho: [9.9718e2, 3.1439e-3, -3.7574e-3], cp: [4.1762, -9.0864e-5, 5.4731e-6] },
  protein: { k: [1.7881e-1, 1.1958e-3, -2.7178e-6], rho: [1.3299e3, -5.1840e-1, 0], cp: [2.0082, 1.2089e-3, -1.3129e-6] },
  fat: { k: [1.8071e-1, -2.7604e-4, -1.7749e-7], rho: [9.2559e2, -4.1757e-1, 0], cp: [1.9842, 1.4733e-3, -4.8008e-6] },
  carb: { k: [2.0141e-1, 1.3874e-3, -4.3312e-6], rho: [1.5991e3, -3.1046e-1, 0], cp: [1.5488, 1.9625e-3, -5.9399e-6] },
  fiber: { k: [1.8331e-1, 1.2497e-3, -3.1683e-6], rho: [1.3115e3, -3.6589e-1, 0], cp: [1.8459, 1.8306e-3, -4.6509e-6] },
  ash: { k: [3.2962e-1, 1.4011e-3, -2.9069e-6], rho: [2.4238e3, -2.8063e-1, 0], cp: [1.0926, 1.8896e-3, -3.6817e-6] },
};
export const COMPONENTS = Object.keys(CO);
const poly = (c, T) => c[0] + c[1] * T + c[2] * T * T;

/** Properties of one pure component at T. */
export function component(name, T) {
  const c = CO[name], t = Math.max(-40, Math.min(150, T));
  return { k: poly(c.k, t), rho: poly(c.rho, t), cp: poly(c.cp, t) * 1000 };
}

/** Properties of a mixture given mass fractions {water, protein, fat, carb, fiber, ash} (normalised). */
export function mixture(comp, T) {
  let sum = 0;
  for (const n of COMPONENTS) sum += comp[n] || 0;
  let invRho = 0, cp = 0;
  const vol = {};
  for (const n of COMPONENTS) {
    const x = (comp[n] || 0) / sum;
    if (!x) continue;
    const p = component(n, T);
    invRho += x / p.rho;
    cp += x * p.cp;
    vol[n] = x / p.rho;
  }
  const rho = 1 / invRho;
  // parallel model with volume fractions (Choi & Okos)
  let k = 0;
  for (const n in vol) k += (vol[n] / invRho) * component(n, T).k;
  return { k, rho, cp, alpha: k / (rho * cp) };
}

/**
 * A food material: fixed dry-solids composition, variable water content.
 * Builds 1 °C lookup tables so the solver never evaluates polynomials per cell.
 */
export const T_MIN = -20, T_MAX = 320, NT = T_MAX - T_MIN + 1, NX = 41;
export class Material {
  constructor(id, def) {
    this.id = id;
    this.name = def.name || id;
    this.comp = def.comp; // mass fractions including water (raw)
    this.kScale = 1;
    const solids = {};
    let s = 0;
    for (const n of COMPONENTS) if (n !== 'water') { solids[n] = def.comp[n] || 0; s += solids[n]; }
    for (const n in solids) solids[n] /= s || 1;
    this.solids = solids;
    this.xw0 = def.comp.water || 0;
    this.rho0 = mixture(def.comp, 20).rho;
    // per-kg specific heats of solids and water
    this.cpS = new Float32Array(NT);
    this.cpW = new Float32Array(NT);
    this.kTab = new Float32Array(NT * NX); // [xw index][T]
    for (let i = 0; i < NT; i++) {
      const T = T_MIN + i;
      this.cpS[i] = mixture({ ...solids, water: 0 }, T).cp;
      this.cpW[i] = component('water', T).cp;
      for (let j = 0; j < NX; j++) {
        const xw = j / (NX - 1);
        const c = { water: xw };
        for (const n in solids) c[n] = solids[n] * (1 - xw);
        this.kTab[j * NT + i] = mixture(c, T).k;
      }
    }
    if (def.fixed) {
      // fixed properties (verification tests against analytic solutions)
      const f = def.fixed;
      this.cpS.fill(f.cp); this.cpW.fill(f.cp); this.kTab.fill(f.k);
      this.rho0 = f.rho;
    }
    if (def.kMeasured) {
      // measured override: scale the model so k at the measured composition matches the measurement
      const ref = mixture(def.kMeasured.comp || def.comp, def.kMeasured.T).k;
      this.kScale = def.kMeasured.k / ref;
      this.kModel = ref;
      for (let i = 0; i < this.kTab.length; i++) this.kTab[i] *= this.kScale;
    }
    this.procs = def.procs || [];
    this.look = def.look || {};
    this.def = def;
  }
  /** k at water mass fraction xw and temperature T. */
  k(xw, T) {
    const ti = Math.max(0, Math.min(NT - 1, Math.round(T - T_MIN)));
    const xj = Math.max(0, Math.min(NX - 1, Math.round(xw * (NX - 1))));
    return this.kTab[xj * NT + ti];
  }
  /** Raw-state properties (for tests / readouts). */
  raw(T = 20) {
    if (this.def.fixed) { const f = this.def.fixed; return { ...f, alpha: f.k / (f.rho * f.cp) }; }
    const m = mixture(this.comp, T);
    return { ...m, k: m.k * this.kScale };
  }
}
