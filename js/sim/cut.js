// Cutting a piece's state grid by a plane (rest space). Each occupied cell goes to exactly one
// child, so mass, water and heat are conserved by construction. Pure.
import { StateGrid } from './grid.js';
import { Piece } from './piece.js';

/** Split piece by plane n·p = d (rest space). Returns [{piece, side, centroid}] or null if it misses. */
export function splitGrid(piece, n, d, minCells = 4) {
  const g = piece.grid, { nx, ny, nz, N } = g;
  const side = new Int8Array(N).fill(-1);
  const q = [0, 0, 0];
  let cntP = 0, cntN = 0;
  for (let c = 0; c < N; c++) {
    if (!g.occ[c]) continue;
    g.center(c, q);
    const s = n[0] * q[0] + n[1] * q[1] + n[2] * q[2] - d > 0 ? 1 : 0;
    side[c] = s;
    if (s) cntP++; else cntN++;
  }
  if (!cntP || !cntN) return null;
  // connected components per side (6-neighbour)
  const comp = new Int32Array(N).fill(-1);
  const comps = [];
  const stride = [1, -1, nx, -nx, nx * ny, -nx * ny];
  for (let c0 = 0; c0 < N; c0++) {
    if (side[c0] < 0 || comp[c0] >= 0) continue;
    const id = comps.length, s = side[c0];
    const cells = [c0]; comp[c0] = id;
    for (let h = 0; h < cells.length; h++) {
      const c = cells[h];
      const i = c % nx, j = ((c / nx) | 0) % ny, k = (c / (nx * ny)) | 0;
      const ijk = [i, j, k];
      for (let dd = 0; dd < 6; dd++) {
        const a = dd >> 1, sg = dd & 1 ? -1 : 1, nn = ijk[a] + sg, lim = a === 0 ? nx : a === 1 ? ny : nz;
        if (nn < 0 || nn >= lim) continue;
        const c2 = c + stride[dd];
        if (side[c2] === s && comp[c2] < 0) { comp[c2] = id; cells.push(c2); }
      }
    }
    comps.push({ side: s, cells });
  }
  const parentMass = piece.mass();
  const out = [];
  let dropped = 0;
  for (const cp of comps) {
    if (cp.cells.length < minCells) { for (const c of cp.cells) dropped += g.ms[c] + g.mw[c]; continue; }
    let i0 = 1e9, j0 = 1e9, k0 = 1e9, i1 = -1, j1 = -1, k1 = -1;
    for (const c of cp.cells) {
      const i = c % nx, j = ((c / nx) | 0) % ny, k = (c / (nx * ny)) | 0;
      if (i < i0) i0 = i; if (j < j0) j0 = j; if (k < k0) k0 = k;
      if (i > i1) i1 = i; if (j > j1) j1 = j; if (k > k1) k1 = k;
    }
    // one empty cell of padding
    i0 = Math.max(0, i0 - 1); j0 = Math.max(0, j0 - 1); k0 = Math.max(0, k0 - 1);
    i1 = Math.min(nx - 1, i1 + 1); j1 = Math.min(ny - 1, j1 + 1); k1 = Math.min(nz - 1, k1 + 1);
    const mx = i1 - i0 + 1, my = j1 - j0 + 1, mz = k1 - k0 + 1;
    const origin = [g.origin[0] + i0 * g.dx, g.origin[1] + j0 * g.dy, g.origin[2] + k0 * g.dz];
    const ng = new StateGrid(mx, my, mz, g.dx, g.dy, g.dz, origin);
    for (const name in g.proc) ng.addProc(name, 0);
    const map = new Int32Array(ng.N).fill(-1);
    const member = new Uint8Array(N);
    for (const c of cp.cells) member[c] = 1;
    let cx = 0, cy = 0, cz = 0, n0 = 0;
    for (let k = 0; k < mz; k++) for (let j = 0; j < my; j++) for (let i = 0; i < mx; i++) {
      const oc = i + i0 + nx * (j + j0 + ny * (k + k0));
      const nc = i + mx * (j + my * k);
      map[nc] = oc;
      if (!member[oc]) continue;
      ng.occ[nc] = 1; ng.mat[nc] = g.mat[oc]; ng.T[nc] = g.T[oc];
      ng.ms[nc] = g.ms[oc]; ng.mw[nc] = g.mw[oc]; ng.mw0[nc] = g.mw0[oc];
      for (const name in g.proc) ng.proc[name][nc] = g.proc[name][oc];
      g.center(oc, q); cx += q[0]; cy += q[1]; cz += q[2]; n0++;
    }
    ng.buildSkin({ oldGrid: g, map: (c) => map[c] });
    ng.computeDist();
    ng.buildMatCells(piece.mats.length);
    const child = new Piece(piece.foodId, piece.def, piece.spec, piece.mats, ng);
    child.pos = piece.pos.slice(); child.quat = piece.quat.slice();
    child.support = piece.support;
    const mChild = child.mass();
    child.initMass = piece.initMass * (mChild / parentMass);
    child.coreMax = piece.coreMax; child.safe = piece.safe; child.safeTimer = piece.safeTimer;
    child.label = piece.label;
    child.cutFrom = piece.id;
    child.capNormals = (piece.capNormals || []).concat([[cp.side ? -n[0] : n[0], cp.side ? -n[1] : n[1], cp.side ? -n[2] : n[2]]]);
    out.push({ piece: child, side: cp.side, centroid: [cx / n0, cy / n0, cz / n0], cells: cp.cells.length });
  }
  return { parts: out, dropped };
}
