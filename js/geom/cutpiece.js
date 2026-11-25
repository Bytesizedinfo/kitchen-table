// Cut a piece (state grid + render mesh) with a world-space plane. Shared by the UI and the tests.
// Geometry is constructive: a piece's shape = original analytic shape ∩ the half-spaces of all the
// cuts that made it, re-meshed with surface nets. Watertight by construction; caps are flat.
import { splitGrid } from '../sim/cut.js';
import { surfaceNets } from './surfacenets.js';
import { qRot, qConj } from '../sim/math.js';

/** Signed distance of a cut piece (rest space). */
export function cutSDF(piece) {
  const sdf0 = piece.spec.sdf, pd = piece.peelDepth || 0, cuts = piece.cuts || [];
  const base = pd ? (x, y, z) => sdf0(x, y, z) + pd : sdf0;
  const g = piece.grid;
  // keep only the region near this piece's own cells (separates same-side components)
  const near = dilatedOcc(g);
  return (x, y, z) => {
    let d = base(x, y, z);
    for (const c of cuts) {
      const s = c.n[0] * x + c.n[1] * y + c.n[2] * z - c.d;
      const t = c.side ? -s : s;
      if (t > d) d = t;
    }
    const i = Math.floor((x - g.origin[0]) / g.dx), j = Math.floor((y - g.origin[1]) / g.dy), k = Math.floor((z - g.origin[2]) / g.dz);
    if (i < 0 || j < 0 || k < 0 || i >= g.nx || j >= g.ny || k >= g.nz || !near[i + g.nx * (j + g.ny * k)]) d = Math.max(d, 1e-4);
    if (piece.melted) d = Math.max(d, occSDF(g, x, y, z));
    return d;
  };
}
/** Signed distance-like field from the trilinear-filtered occupancy (melted, rounded shapes). */
function occSDF(g, x, y, z) {
  const occ = g._occBlur || blurOcc(g);
  const fx = (x - g.origin[0]) / g.dx - 0.5, fy = (y - g.origin[1]) / g.dy - 0.5, fz = (z - g.origin[2]) / g.dz - 0.5;
  const i0 = Math.floor(fx), j0 = Math.floor(fy), k0 = Math.floor(fz);
  let o = 0;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) {
    const i = i0 + a, j = j0 + b, k = k0 + c;
    if (i < 0 || j < 0 || k < 0 || i >= g.nx || j >= g.ny || k >= g.nz) continue;
    o += occ[i + g.nx * (j + g.ny * k)] * (a ? fx - i0 : 1 - (fx - i0)) * (b ? fy - j0 : 1 - (fy - j0)) * (c ? fz - k0 : 1 - (fz - k0));
  }
  return (0.5 - o) * 2 * Math.min(g.dx, g.dy, g.dz);
}
/** Occupancy smoothed by two 6-neighbour averaging passes (rounded melted shapes, no voxel terraces). */
function blurOcc(g) {
  const { nx, ny, nz, N } = g;
  let a = new Float32Array(N); for (let c = 0; c < N; c++) a[c] = g.occ[c];
  for (let pass = 0; pass < 2; pass++) {
    const b = new Float32Array(N);
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const c = i + nx * (j + ny * k); let s = 2 * a[c], w = 2;
      if (i > 0) { s += a[c - 1]; w++; } if (i < nx - 1) { s += a[c + 1]; w++; }
      if (j > 0) { s += a[c - nx]; w++; } if (j < ny - 1) { s += a[c + nx]; w++; }
      if (k > 0) { s += a[c - nx * ny]; w++; } if (k < nz - 1) { s += a[c + nx * ny]; w++; }
      b[c] = s / w;
    }
    a = b;
  }
  g._occBlur = a;
  return a;
}
function dilatedOcc(g) {
  const out = new Uint8Array(g.N);
  for (let k = 0; k < g.nz; k++) for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    if (!g.occ[i + g.nx * (j + g.ny * k)]) continue;
    for (let c = -1; c <= 1; c++) for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const ii = i + a, jj = j + b, kk = k + c;
      if (ii >= 0 && jj >= 0 && kk >= 0 && ii < g.nx && jj < g.ny && kk < g.nz) out[ii + g.nx * (jj + g.ny * kk)] = 1;
    }
  }
  return out;
}

/** Mesh a (possibly cut) piece; aCap = 1 on vertices that lie on a cut face. */
export function meshPiece(piece) {
  const g = piece.grid, sp = piece.spec;
  g._occBlur = null; // recompute the smoothed occupancy for this shape
  const h = sp.meshCell || Math.min(g.dx, g.dy, g.dz);
  const sdf = (piece.cuts && piece.cuts.length) || piece.peelDepth || piece.melted ? cutSDF(piece) : sp.sdf;
  let lo, hi;
  if ((piece.cuts && piece.cuts.length) || piece.melted) {
    lo = [g.origin[0] - h, g.origin[1] - h, g.origin[2] - h];
    hi = [g.origin[0] + g.nx * g.dx + h, g.origin[1] + g.ny * g.dy + h, g.origin[2] + g.nz * g.dz + h];
  } else {
    const d = sp.dims.map((x) => x / 2 + 3 * h);
    lo = d.map((x) => -x); hi = d;
  }
  const m = surfaceNets(sdf, lo, hi, h);
  const cap = new Float32Array(m.pos.length / 3);
  const cuts = piece.cuts || [];
  if (cuts.length) {
    for (let v = 0; v < cap.length; v++) {
      const x = m.pos[3 * v], y = m.pos[3 * v + 1], z = m.pos[3 * v + 2];
      const b = sp.sdf(x, y, z) + (piece.peelDepth || 0);
      for (const c of cuts) {
        const s = c.n[0] * x + c.n[1] * y + c.n[2] * z - c.d;
        const t = c.side ? -s : s;
        if (t > b - 0.35 * h && Math.abs(t) < 0.6 * h) {
          cap[v] = 1;
          // flat shading on the cut face: use the plane normal
          const sg = c.side ? -1 : 1;
          m.nrm[3 * v] = c.n[0] * sg; m.nrm[3 * v + 1] = c.n[1] * sg; m.nrm[3 * v + 2] = c.n[2] * sg;
          break;
        }
      }
    }
  }
  return { pos: m.pos, nrm: m.nrm, idx: m.idx, cap };
}

/**
 * nW: world plane normal (unit), pW: a world point on the plane.
 * Returns [{ piece, mesh }] (children, already positioned) or null if the plane misses.
 */
export function cutPiece(world, piece, mesh, nW, pW, gap = 0.004) {
  const nR = qRot(qConj(piece.quat), nW);
  const pR = piece.toRest(pW);
  const d = nR[0] * pR[0] + nR[1] * pR[1] + nR[2] * pR[2];
  const gs = splitGrid(piece, nR, d);
  if (!gs || gs.parts.length < 2) return null;
  const probe = world.probe && world.probe.piece === piece ? world.probe : null;
  world.remove(piece);
  const result = [];
  for (const part of gs.parts) {
    const child = part.piece;
    child.cuts = [...(piece.cuts || []), { n: nR.slice(), d, side: part.side }];
    const m = meshPiece(child);
    const s = part.side ? 1 : -1;
    child.pos[0] += nW[0] * gap * s; child.pos[2] += nW[2] * gap * s;
    world.addPiece(child);
    const sup = piece.support ? piece.support.kind : 'board';
    const b = child.bounds();
    world.place(child, sup === 'hand' ? 'board' : sup, [(b.lo[0] + b.hi[0]) / 2, (b.lo[2] + b.hi[2]) / 2]);
    if (probe) {
      // keep the probe in whichever child now contains its tip
      const c = child.grid.cellAt(probe.rest);
      if (c >= 0 && child.grid.occ[c]) { probe.piece = child; world.probe = probe; }
    }
    result.push({ piece: child, mesh: m, side: part.side });
  }
  return result;
}
