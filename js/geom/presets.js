// Knife presets (Rouxbe / CIA dimensions in params): slice, batonnet, julienne, dice, brunoise, mince.
// The state grid is partitioned by families of parallel planes (mass, water and heat conserved);
// large parts stay voxel pieces (re-meshed as shape ∩ their planes), small ones become bits.
import { splitByLabel } from '../sim/cut.js';
import { makeBit, newBatch } from '../sim/bits.js';
import { meshPiece } from './cutpiece.js';
import { qRot, qConj, qMul } from '../sim/math.js';
import { pv } from '../sim/params.js';

export const PRESETS = [
  { id: 'halve', name: 'Halve', fam: () => null },
  { id: 'slice', name: 'Slices', sub: '5 mm', fam: () => [['u', pv('cut_slice')]] },
  { id: 'batonnet', name: 'Batonnet', sub: '6×6×50 mm', fam: () => [['u', pv('cut_stick_len')], ['v', pv('cut_batonnet')], ['w', pv('cut_batonnet')]] },
  { id: 'julienne', name: 'Julienne', sub: '3×3×50 mm', fam: () => [['u', pv('cut_stick_len')], ['v', pv('cut_julienne')], ['w', pv('cut_julienne')]] },
  { id: 'dice_l', name: 'Large dice', sub: '19 mm', fam: () => [['u', pv('cut_dice_l')], ['v', pv('cut_dice_l')], ['w', pv('cut_dice_l')]] },
  { id: 'dice_m', name: 'Medium dice', sub: '12 mm', fam: () => [['u', pv('cut_dice_m')], ['v', pv('cut_dice_m')], ['w', pv('cut_dice_m')]] },
  { id: 'dice_s', name: 'Small dice', sub: '6 mm', fam: () => [['u', pv('cut_dice_s')], ['v', pv('cut_dice_s')], ['w', pv('cut_dice_s')]] },
  { id: 'brunoise', name: 'Brunoise', sub: '3 mm', fam: () => [['u', pv('cut_brunoise')], ['v', pv('cut_brunoise')], ['w', pv('cut_brunoise')]] },
];

/** World frame for a piece: u = its longest horizontal extent, v = other horizontal, w = up. */
export function pieceFrame(p) {
  const b = p.bounds();
  const u = b.hi[0] - b.lo[0] >= b.hi[2] - b.lo[2] ? [1, 0, 0] : [0, 0, 1];
  const v = [-u[2], 0, u[0]], w = [0, 1, 0];
  return { u, v, w };
}

function quatFromBasis(x, y, z) {
  // columns x, y, z → quaternion
  const m00 = x[0], m10 = x[1], m20 = x[2], m01 = y[0], m11 = y[1], m21 = y[2], m02 = z[0], m12 = z[1], m22 = z[2];
  const tr = m00 + m11 + m22;
  let qw, qx, qy, qz;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; qw = 0.25 * s; qx = (m21 - m12) / s; qy = (m02 - m20) / s; qz = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; qw = (m21 - m12) / s; qx = 0.25 * s; qy = (m01 + m10) / s; qz = (m02 + m20) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; qw = (m02 - m20) / s; qx = (m01 + m10) / s; qy = 0.25 * s; qz = (m12 + m21) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; qw = (m10 - m01) / s; qx = (m02 + m20) / s; qy = (m12 + m21) / s; qz = 0.25 * s; }
  return [qx, qy, qz, qw];
}

/**
 * Apply a preset to a piece. Returns { pieces:[{piece, mesh}], bits:[Bit] } (already added to the world).
 * opts.bitMax: largest dimension that becomes a bit (m); opts.spread: gap between parts (m).
 */
export function applyPreset(world, piece, presetId, opts = {}) {
  const preset = PRESETS.find((x) => x.id === presetId);
  const famDef = preset.fam();
  if (!famDef) return null;
  const F = pieceFrame(piece);
  const conj = qConj(piece.quat);
  const fams = famDef.map(([ax, s]) => ({ nW: F[ax], n: qRot(conj, F[ax]), s }));
  // offsets: start each family at the piece's lowest projection
  const g = piece.grid, q = [0, 0, 0];
  for (const f of fams) {
    let lo = 1e9, hi = -1e9;
    for (let c = 0; c < g.N; c++) { if (!g.occ[c]) continue; g.center(c, q); const d = f.n[0] * q[0] + f.n[1] * q[1] + f.n[2] * q[2]; if (d < lo) lo = d; if (d > hi) hi = d; }
    const half = 0.5 * (Math.abs(f.n[0]) * g.dx + Math.abs(f.n[1]) * g.dy + Math.abs(f.n[2]) * g.dz);
    f.lo = lo - half; f.hi = hi + half;
    // sticks/dice: centre the pattern across v and w so both edges trim evenly; slices start at one end
    const span = f.hi - f.lo, nK = Math.max(1, Math.round(span / f.s));
    f.off = presetId === 'slice' ? f.lo + 0.003 : f.lo + (span - nK * f.s) / 2;
  }
  const M = 4096;
  const idxOf = (f, d) => Math.floor((d - f.off) / f.s);
  const label = (p) => fams.reduce((acc, f, i) => acc + (idxOf(f, f.n[0] * p[0] + f.n[1] * p[1] + f.n[2] * p[2]) + 64) * Math.pow(M, i), 0);
  const res = splitByLabel(piece, label, 1);
  if (!res) return null;
  const batch = newBatch();
  const bitMax = opts.bitMax ?? 0.016;
  const out = { pieces: [], bits: [], batch, dropped: res.dropped };
  const spread = opts.spread ?? 0.0015;
  world.remove(piece);
  const sup = piece.support ? piece.support.kind : 'board';
  for (const part of res.parts) {
    // decode family indices and the part's extent along each family
    let L = part.label;
    const idx = fams.map(() => { const v = (L % M) - 64; L = Math.floor(L / M); return v; });
    const cg = part.piece.grid;
    const ext = fams.map((f) => {
      let lo = 1e9, hi = -1e9;
      for (let c = 0; c < cg.N; c++) { if (!cg.occ[c]) continue; cg.center(c, q); const d = f.n[0] * q[0] + f.n[1] * q[1] + f.n[2] * q[2]; if (d < lo) lo = d; if (d > hi) hi = d; }
      const half = 0.5 * (Math.abs(f.n[0]) * cg.dx + Math.abs(f.n[1]) * cg.dy + Math.abs(f.n[2]) * cg.dz);
      const e = hi - lo + 2 * half;
      // a part spanning (almost) a whole slab is the full cut size; grid cells only quantise the edges
      return e >= f.s - 2.02 * half ? f.s : Math.min(f.s, e);
    });
    // dimensions along the three frame axes (unsliced axes use the piece's own extent)
    const dimsUVW = ['u', 'v', 'w'].map((ax) => {
      const i = fams.findIndex((f) => f.nW === F[ax]);
      if (i >= 0) return ext[i];
      const n = qRot(conj, F[ax]);
      let lo = 1e9, hi = -1e9;
      for (let c = 0; c < cg.N; c++) { if (!cg.occ[c]) continue; cg.center(c, q); const d = n[0] * q[0] + n[1] * q[1] + n[2] * q[2]; if (d < lo) lo = d; if (d > hi) hi = d; }
      return hi - lo + Math.min(cg.dx, cg.dy, cg.dz);
    });
    const vol = part.piece.mass() / part.piece.mats[0].rho0;
    // spread parts apart a little along each sliced direction
    const shift = [0, 0, 0];
    fams.forEach((f, i) => { if (f.nW[1] === 0) for (let a = 0; a < 3; a++) shift[a] += f.nW[a] * spread * idx[i]; });
    if (Math.max(...dimsUVW) <= bitMax || vol < 2e-6) {
      const cw = piece.toWorld(part.centroid);
      const qb = quatFromBasis(F.u, F.w, F.v); // box axes: x=u (length), y=w (up), z=v
      const bit = makeBit(piece, part, [dimsUVW[0], dimsUVW[2], dimsUVW[1]], [cw[0] + shift[0], cw[1], cw[2] + shift[2]], qb, batch);
      bit.cutIdx = idx;
      world.addBit(bit);
      out.bits.push(bit);
    } else {
      const child = part.piece;
      child.cuts = [...(piece.cuts || [])];
      fams.forEach((f, i) => {
        const d0 = f.off + idx[i] * f.s, d1 = d0 + f.s;
        if (d0 > f.lo + 1e-4) child.cuts.push({ n: f.n.slice(), d: d0, side: 1 });
        if (d1 < f.hi - 1e-4) child.cuts.push({ n: f.n.slice(), d: d1, side: 0 });
      });
      child.capNormals = child.cuts.map((c) => (c.side ? c.n.map((x) => -x) : c.n.slice()));
      child.pos[0] += shift[0]; child.pos[2] += shift[2];
      child.batch = batch;
      child.presetDims = dimsUVW;
      world.addPiece(child);
      const b = child.bounds();
      world.place(child, sup === 'hand' ? 'board' : sup, [(b.lo[0] + b.hi[0]) / 2, (b.lo[2] + b.hi[2]) / 2]);
      out.pieces.push({ piece: child, mesh: opts.noMesh ? null : meshPiece(child) });
    }
  }
  if (world.probe && world.probe.piece === piece) world.probe = null;
  return out;
}

export { qMul };
