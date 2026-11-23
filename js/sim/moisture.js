// Water movement: diffusion inside the food, supply to the drying skin,
// juice released by denaturing meat proteins (→ surface film → drip), and dripping.
import { pv } from './params.js';

/** Moisture diffusion on dry-basis moisture X = mw/ms between neighbouring cells, and core→skin supply. */
export function moistureStep(piece, dt) {
  const g = piece.grid;
  const { nx, ny, nz, occ, ms, mw } = g;
  const D = pv('moist_D');
  const V = g.cellVol();
  const ax = (g.dy * g.dz) / g.dx, ay = (g.dx * g.dz) / g.dy, az = (g.dx * g.dy) / g.dz;
  const sy = nx, sz = nx * ny;
  // interior (every pair once, flux limited to keep it stable for any dt)
  const Dv = (D * dt) / V;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) {
    let c = nx * (j + ny * k);
    for (let i = 0; i < nx; i++, c++) {
      if (!occ[c]) continue;
      const msc = ms[c], Xc = mw[c] / msc;
      for (let a = 0; a < 3; a++) {
        let c2, ar;
        if (a === 0) { if (i + 1 >= nx) continue; c2 = c + 1; ar = ax; }
        else if (a === 1) { if (j + 1 >= ny) continue; c2 = c + sy; ar = ay; }
        else { if (k + 1 >= nz) continue; c2 = c + sz; ar = az; }
        if (!occ[c2]) continue;
        let f = Dv * 0.5 * (msc + ms[c2]) * (mw[c2] / ms[c2] - Xc) * ar;
        const lim = 0.2 * (mw[c] < mw[c2] ? mw[c] : mw[c2]);
        if (f > lim) f = lim; else if (f < -lim) f = -lim;
        mw[c] += f; mw[c2] -= f;
      }
    }
  }
  // core of each skin cell → its skin layer
  for (let s = 0; s < g.nSkin; s++) {
    const c = g.skinCell[s];
    const fr = g.skinFrac[s];
    const coreDry = ms[c] * (1 - fr), skinDry = ms[c] * fr;
    const coreW = mw[c] - g.skw[s];
    if (coreW < 0) { g.skw[s] = mw[c]; continue; }
    const Xc = coreW / coreDry, Xs = g.skw[s] / skinDry;
    const rd = ms[c] / V;
    let f = D * rd * (Xc - Xs) * g.skinG[s] * dt;
    const lim = 0.5 * (f > 0 ? coreW : g.skw[s]);
    if (f > lim) f = lim; else if (f < -lim) f = -lim;
    g.skw[s] += f; // stays inside the cell's mw
  }
}

/**
 * Meat: proteins that have set hold less water. Water above the holding capacity travels to the
 * nearest surface as juice (film); film above what can cling drips off. Returns dripped mass (kg).
 */
export function juiceStep(piece, dt) {
  const g = piece.grid, mats = piece.mats;
  const { ms, mw, mw0, T } = g;
  const tau = pv('expel_tau');
  const frac = 1 - Math.exp(-dt / tau);
  let moved = false;
  for (let mi = 0; mi < mats.length; mi++) {
    const whc = mats[mi].def.whc;
    if (!whc) continue;
    const procs = whc.map(([pid, loss]) => [g.proc[pid], loss]).filter((x) => x[0]);
    if (!procs.length) continue;
    const first = procs[0][0];
    const cells = g.matCells[mi];
    for (let q = 0; q < cells.length; q++) {
      const c = cells[q];
      if (first[c] < 1e-4) continue; // nothing has denatured here yet
      let rel = 0;
      for (let p = 0; p < procs.length; p++) rel += procs[p][0][c] * procs[p][1];
      const free = mw[c] - (mw0[c] - (ms[c] + mw0[c]) * rel);
      if (free <= 1e-12) continue;
      const s = g.nearSkin[c];
      if (s < 0) continue;
      const dm = free * frac;
      const cs = g.skinCell[s];
      mw[c] -= dm;
      // juice carries its sensible heat to the surface cell
      if (cs !== c && g._C) {
        const Cs = g._C[cs];
        if (Cs > 0) T[cs] = (Cs * T[cs] + dm * 4180 * T[c]) / (Cs + dm * 4180);
      }
      g.film[s] += dm;
      moved = true;
    }
  }
  // keep skin water inside the cell water
  for (let s = 0; s < g.nSkin; s++) { const c = g.skinCell[s]; if (g.skw[s] > mw[c]) g.skw[s] = mw[c]; }
  return moved;
}

/** Film beyond what clings drips off (or dissolves into surrounding water). Returns kg. */
export function dripStep(piece, submergedDissolve = false) {
  const g = piece.grid;
  const cap = pv('film_max');
  let drip = 0;
  for (let s = 0; s < g.nSkin; s++) {
    const lim = submergedDissolve && g.Awat[s] > 0 ? 0 : cap * g.skinArea[s];
    if (g.film[s] > lim) { drip += g.film[s] - lim; g.film[s] = lim; }
  }
  return drip;
}
