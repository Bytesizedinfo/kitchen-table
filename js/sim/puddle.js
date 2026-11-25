// Puddles: melted food that has run off a piece (butter, chocolate, ice cream, cheese; jelly later).
// A puddle is a lumped thermal body lying on a support: it keeps the material's apparent heat
// capacity (so it can set or freeze again), boils off water (butter foaming), browns once dry
// (brown butter) and smokes. Pure.
import { pv } from './params.js';
import { T_MIN, NT } from './props.js';
import { evapDrive } from './heat.js';

let PID = 1;
export class Puddle {
  constructor(kind, x, z, y, mat, foodId) {
    this.id = PID++;
    this.kind = kind; this.x = x; this.z = z; this.y = y;
    this.mat = mat; this.foodId = foodId;
    this.ms = 0; this.mw = 0; this.T = 20;
    this.brown = 0; this.char = 0; this.foam = 0; this.liq = 1;
    this.thick = mat.def.puddleThick || 0.002;
    this.maxR = kind === 'pan' ? 0.1 : kind === 'pot' ? 0.09 : kind === 'plate' ? 0.1 : kind === 'fridge' || kind === 'freezer' ? 0.07 : 0.2;
  }
  mass() { return this.ms + this.mw; }
  C(T = this.T) { let ti = (T - T_MIN + 0.5) | 0; ti = ti < 0 ? 0 : ti >= NT ? NT - 1 : ti; return this.ms * this.mat.cpS[ti] + this.mw * this.mat.cpW[ti]; }
  /** Spread area: a film of the material's thickness, but never wider than what it lies in (it pools deeper). */
  area() { return Math.min(Math.PI * this.maxR * this.maxR, Math.max(1e-6, (this.mass() / this.mat.rho0) / this.thick)); }
  radius() { return Math.sqrt(this.area() / Math.PI); }
  depth() { return (this.mass() / this.mat.rho0) / this.area(); }
  /** Add melted mass at temperature T (enthalpy-weighted mixing). */
  add(ms, mw, T, x, z) {
    const m0 = this.mass(), C0 = this.C(), w = ms + mw;
    this.ms += ms; this.mw += mw;
    const Ca = this.C(T) * (w / Math.max(1e-12, this.mass()));
    this.T = m0 > 0 ? (C0 * this.T + Ca * T) / (C0 + Ca) : T;
    if (x != null) { this.x = (this.x * m0 + x * w) / (m0 + w); this.z = (this.z * m0 + z * w) / (m0 + w); }
  }
  /** One tick: heat from the support and air, evaporation / boiling, browning. Returns heat taken from the support (W). */
  step(env, dt) {
    const A = this.area(), Lv = pv('Lv');
    const hs = env.con.h > 0 ? env.con.h : env.ins.h, Tsup = env.con.h > 0 ? env.con.T : env.ins.T;
    const air = env.air;
    const qSup = hs * A * (Tsup - this.T);
    const tk = this.T + 273.15, rad = air.eps * pv('sigma') * A * ((air.Trad + 273.15) ** 4 - tk ** 4);
    const qAir = air.h * A * (air.T - this.T) + rad;
    let E = 0;
    if (this.mw > 1e-7) {
      if (this.T >= 100) E = Math.min(this.mw / dt, Math.max(0, qSup + qAir) / Lv); // water boils off: butter foams
      else E = Math.min(this.mw / dt, ((air.h * A) / 1006) * evapDrive(this.T, air.w));
    }
    this.foam = this.T >= 99 && this.mw > 1e-6 ? Math.min(1, E * 2e4) : Math.max(0, this.foam - dt * 0.05);
    const C = this.C();
    this.T += (dt * (qSup + qAir - Lv * E)) / Math.max(1e-6, C);
    if (this.T > 100 && this.mw > 1e-7) this.T = 100; // pinned while water is boiling off
    this.mw = Math.max(0, this.mw - E * dt);
    // milk solids / sugars brown once the water has gone (brown butter, caramelised chocolate edges)
    if (this.mw < 1e-6 && this.T > 110) {
      const iT = 1 / (this.T + 273.15);
      this.brown = Math.min(10, this.brown + dt * pv('maillard_rate140') * Math.exp((-pv('maillard_Ea') / pv('Rgas')) * (iT - 1 / (pv('maillard_T0') + 273.15))));
      if (this.T > 200) this.char = Math.min(10, this.char + dt * pv('char_rate200') * Math.exp((-pv('char_Ea') / pv('Rgas')) * (iT - 1 / (pv('char_T0') + 273.15))));
    }
    // liquid fraction for display / setting again (same material model as the solid)
    const sp = this.mat.procSpecs.find((s) => s.id === 'liq');
    if (sp && sp.type === 'melt') this.liq = 1 / (1 + Math.exp(-(this.T - sp.Tm) / sp.w));
    else if (sp && sp.type === 'thaw') this.liq = this.T > this.mat.Tf ? 1 : 0.3;
    else if (sp && sp.type === 'gel') { const melt = 1 / sp.tauMelt / (1 + Math.exp(-(this.T - sp.Tm) / 0.3)), set = 1 / sp.tauSet / (1 + Math.exp(-(sp.Ts - this.T) / 1.0)); const r = melt + set; if (r > 1e-9) { const eq = melt / r; this.liq = eq + (this.liq - eq) * Math.exp(-r * dt); } }
    return { q: qSup, evap: E };
  }
  smoking() { const s = this.mat.def.smoke; return !!s && this.mw < 1e-6 && this.T > pv(s); }
}

/** Remove melted surface cells of a piece into puddles. Returns { drained mass, cells } (and marks the piece for re-meshing). */
export function drainPiece(world, p) {
  const g = p.grid, mats = p.mats;
  const liq = g.proc.liq;
  if (!liq || p.noDrain || p.mould) return null;
  const sup = p.support ? p.support.kind : 'table';
  if (sup === 'hand') return null;
  let cells = [];
  if (p.chain) {
    // a chain melts as a whole once most of it is liquid
    if (p.procMean('liq') < 0.85) return null;
    for (let c = 0; c < g.N; c++) if (g.occ[c]) cells.push(c);
  } else for (let s = 0; s < g.nSkin; s++) {
    const c = g.skinCell[s];
    const m = mats[g.mat[c]];
    if (m.def.flowAt != null && liq[c] >= m.def.flowAt) cells.push(c);
  }
  if (!cells.length) return null;
  const q = [0, 0, 0], w = [0, 0, 0];
  let ms = 0, mw = 0, H = 0, x = 0, z = 0;
  for (const c of cells) {
    const si = g.skinIdx[c];
    const cm = g.ms[c], cw = g.mw[c] + (si >= 0 ? g.film[si] : 0);
    ms += cm; mw += cw; H += cm + cw;
    g.center(c, q); p.toWorld(q, w);
    x += w[0] * (cm + cw); z += w[2] * (cm + cw);
    g.occ[c] = 0;
  }
  const Tm = cells.reduce((a, c) => a + g.T[c] * (g.ms[c] + g.mw[c]), 0) / Math.max(1e-12, H);
  x /= H; z /= H;
  for (const c of cells) { g.ms[c] = g.mw[c] = g.mw0[c] = 0; }
  const puddle = world.puddleAt(sup, x, z, mats[g.mat[cells[0]]], p.foodId);
  puddle.add(ms, mw, Tm, x, z);
  // rebuild the piece's boundary (snapshot the old skin so surviving surface state carries over)
  const snap = { skinIdx: Int32Array.from(g.skinIdx), skinMask: Uint8Array.from(g.skinMask), skinFrac: Float32Array.from(g.skinFrac), skinArea: Float32Array.from(g.skinArea) };
  for (const k of ['Ts', 'skw', 'skw0', 'film', 'brown', 'char', 'enz', 'coat', 'cut']) snap[k] = g[k].slice();
  if (g.occupiedCount() === 0) { world.remove(p); return { mass: ms + mw, cells: cells.length, gone: true }; }
  g.buildSkin({ oldGrid: snap, map: (c) => c });
  for (let s = 0; s < g.nSkin; s++) g.cut[s] = 0;
  g.computeDist(); g.buildMatCells(mats.length);
  p.melted = true;
  p.geomVersion++;
  p._bcKey = '';
  return { mass: ms + mw, cells: cells.length };
}
