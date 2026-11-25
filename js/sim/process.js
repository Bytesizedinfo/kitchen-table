// Chemical / physical processes per cell, from a registry. Each process has a temperature floor
// below which it is skipped, so cold cells cost nothing.
//   eq    – equilibrium-limited, irreversible: the extent approaches D_eq(T) = logistic((T−Tm)/w)
//           with time constant tau, never decreasing (protein denaturation, starch gelatinization)
//   arrh1 – first-order Arrhenius decay of a native fraction x: x *= exp(−k(T)·dt)  (pectin breakdown)
import { pv } from './params.js';
import { T_MIN, NT, frozenFrac } from './props.js';

const tables = new Map();

function table(spec, dt) {
  const key = JSON.stringify(spec) + '|' + dt;
  let t = tables.get(key);
  if (t) return t;
  if (spec.type === 'chill' || spec.type === 'melt' || spec.type === 'thaw') { t = { a: null, b: null, floor: -1e9 }; tables.set(key, t); return t; }
  const a = new Float32Array(NT), b = new Float32Array(NT);
  let floor = 1e9;
  for (let i = 0; i < NT; i++) {
    const T = T_MIN + i;
    if (spec.type === 'eq') {
      const Deq = 1 / (1 + Math.exp(-(T - spec.Tm) / spec.w));
      a[i] = Deq;
      b[i] = 1 - Math.exp(-dt / spec.tau);
      if (Deq > 0.002 && floor > 1e8) floor = T;
    } else if (spec.type === 'arrh1') {
      const k = spec.kref * Math.exp((-spec.Ea / pv('Rgas')) * (1 / (T + 273.15) - 1 / (spec.Tref + 273.15)));
      a[i] = Math.exp(-k * dt);
      b[i] = k;
      if (k * dt > 1e-7 && floor > 1e8) floor = T;
    }
  }
  t = { a, b, floor };
  tables.set(key, t);
  return t;
}

/** Resolve a material's process list into concrete specs (params looked up now). */
export function resolveProcs(list) {
  return list.map((p) => {
    const o = { ...p };
    for (const k of ['Tm', 'w', 'tau', 'kref', 'Ea', 'Tref', 'kmul', 'Tc', 'days']) if (typeof o[k] === 'string') o[k] = pv(o[k]);
    if (o.kmul) { o.kref *= o.kmul; delete o.kmul; }
    return o;
  });
}

/** Advance every process of every cell. */
export function processStep(piece, dt) {
  const g = piece.grid;
  const T = g.T;
  for (let mi = 0; mi < piece.mats.length; mi++) {
    const m = piece.mats[mi];
    const cells = g.matCells[mi];
    for (const spec of m.procSpecs) {
      const arr = g.proc[spec.id];
      if (!arr) continue;
      const tb = table(spec, dt);
      const fl = tb.floor;
      if (spec.type === 'eq') {
        const A = tb.a, B = tb.b;
        for (let q = 0; q < cells.length; q++) {
          const c = cells[q], t = T[c];
          if (t < fl) continue;
          let ti = (t - T_MIN + 0.5) | 0; ti = ti < 0 ? 0 : ti >= NT ? NT - 1 : ti;
          const Deq = A[ti];
          if (Deq > arr[c]) arr[c] += (Deq - arr[c]) * B[ti];
        }
      } else if (spec.type === 'melt') {
        // reversible equilibrium liquid fraction (fat melting, cheese softening)
        for (let q = 0; q < cells.length; q++) { const c = cells[q]; arr[c] = 1 / (1 + Math.exp(-(T[c] - spec.Tm) / spec.w)); }
      } else if (spec.type === 'thaw') {
        // liquid fraction of a frozen food from its ice fraction (ice cream)
        const r = 1 - m.rb;
        for (let q = 0; q < cells.length; q++) { const c = cells[q]; arr[c] = 1 - frozenFrac(T[c], m.Tf, m.rb) / r; }
      } else if (spec.type === 'chill') {
        // chilling injury dose: accumulates below Tc, reaching 1 after `days` at 5 °C (irreversible)
        const rate = 1 / (spec.days * 86400 * (spec.Tc - 5));
        for (let q = 0; q < cells.length; q++) {
          const c = cells[q], t = T[c];
          if (t < spec.Tc) arr[c] += rate * (spec.Tc - t) * dt;
        }
      } else if (spec.type === 'arrh1') {
        const K = tb.b;
        for (let q = 0; q < cells.length; q++) {
          const c = cells[q], t = T[c];
          if (t < fl) continue;
          const f = t - T_MIN; let i0 = f | 0; i0 = i0 < 0 ? 0 : i0 >= NT - 1 ? NT - 2 : i0;
          const u = f - i0;
          arr[c] *= Math.exp(-(K[i0] * (1 - u) + K[i0 + 1] * u) * dt);
        }
      }
    }
  }
}

/** Rate constant of an arrh1 spec at T (for tests/readouts). */
export function arrhK(spec, T) {
  const s = resolveProcs([spec])[0];
  return s.kref * Math.exp((-s.Ea / pv('Rgas')) * (1 / (T + 273.15) - 1 / (s.Tref + 273.15)));
}
