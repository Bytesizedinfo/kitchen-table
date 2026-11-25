// Operations on pieces that both the UI and the tests use.
import { qMul, qAxis } from './math.js';

/** Flip a piece upside down where it lies (180° about its longest horizontal axis). */
export function flipPiece(W, p) {
  const kind = p.support ? p.support.kind : 'board';
  const b = p.bounds();
  const cx = (b.lo[0] + b.hi[0]) / 2, cz = (b.lo[2] + b.hi[2]) / 2;
  const axis = b.hi[0] - b.lo[0] >= b.hi[2] - b.lo[2] ? [1, 0, 0] : [0, 0, 1];
  p.quat = qMul(qAxis(axis, Math.PI), p.quat);
  W.place(p, kind === 'hand' ? 'board' : kind, [cx, cz]);
}

/** Peel a piece: remove its peel material (banana, lemon) or a thin outer layer (potato, carrot…).
 * The exposed flesh can now brown in air. Returns the peel mass removed (kg). */
export function peelPiece(W, p) {
  if (p.peeled || !(p.def.peel || p.def.peelMat != null)) return 0;
  const g = p.grid;
  const before = p.mass();
  if (p.def.peelMat != null) {
    for (let c = 0; c < g.N; c++) if (g.occ[c] && g.mat[c] === p.def.peelMat) { g.occ[c] = 0; g.ms[c] = g.mw[c] = g.mw0[c] = 0; }
    if (g.frac) for (let c = 0; c < g.N; c++) { g.frac[c * 4 + p.def.peelMat] = 0; if (g.occ[c]) g.frac[c * 4 + g.mat[c]] = Math.max(g.frac[c * 4 + g.mat[c]], 128); }
    const map = (c) => c;
    g.buildSkin({ oldGrid: snapshotSkin(g), map });
    g.computeDist(); g.buildMatCells(p.mats.length);
    for (let s = 0; s < g.nSkin; s++) g.cut[s] = 1;
  } else {
    const V = g.cellVol();
    for (let s = 0; s < g.nSkin; s++) {
      const c = g.skinCell[s];
      const f = Math.min(0.5, (p.def.peel * g.skinArea[s]) / V);
      g.ms[c] *= 1 - f; g.mw[c] *= 1 - f; g.mw0[c] *= 1 - f; g.skw[s] *= 1 - f; g.skw0[s] *= 1 - f;
      g.cut[s] = 1; g.brown[s] = 0;
    }
  }
  p.peelDepth = p.def.peel || 0;
  p.peeled = true;
  p.geomVersion++;
  p.initMass -= before - p.mass();
  p._bcKey = '';
  const kind = p.support ? p.support.kind : 'board';
  const b = p.bounds();
  W.place(p, kind === 'hand' ? 'board' : kind, [(b.lo[0] + b.hi[0]) / 2, (b.lo[2] + b.hi[2]) / 2]);
  return before - p.mass();
}
function snapshotSkin(g) {
  const o = { skinIdx: Int32Array.from(g.skinIdx), skinMask: Uint8Array.from(g.skinMask), skinFrac: Float32Array.from(g.skinFrac), skinArea: Float32Array.from(g.skinArea) };
  for (const k of ['Ts', 'skw', 'skw0', 'film', 'brown', 'char', 'enz', 'coat', 'cut']) o[k] = g[k].slice();
  return o;
}

/** Turn a set jelly out of its mould onto whatever it is on (upside down, dome up). */
export function unmould(W, p) {
  if (!p.mould) return false;
  p.mould = false;
  flipPiece(W, p);
  p.geomVersion++;
  return true;
}

/** Coat exposed (cut) surfaces with lemon juice (1) or ascorbic acid (2). */
export function coatPiece(p, kind) {
  const g = p.grid;
  for (let s = 0; s < g.nSkin; s++) if (g.cut[s]) g.coat[s] = Math.max(g.coat[s], kind);
  p.version++;
}

/** Turn a piece so a given rest-space direction points up (e.g. show a cut face). */
export function faceUp(W, p, restDir) {
  const kind = p.support ? p.support.kind : 'board';
  const b = p.bounds();
  const cx = (b.lo[0] + b.hi[0]) / 2, cz = (b.lo[2] + b.hi[2]) / 2;
  // rotation taking restDir to +y
  const d = restDir, l = Math.hypot(d[0], d[1], d[2]) || 1;
  const v = [d[0] / l, d[1] / l, d[2] / l];
  const ax = [-v[2], 0, v[0]]; // v × ŷ
  const s = Math.hypot(ax[0], ax[2]);
  const ang = Math.atan2(s, v[1]);
  p.quat = s < 1e-6 ? (v[1] > 0 ? [0, 0, 0, 1] : qAxis([1, 0, 0], Math.PI)) : qAxis(ax, ang);
  W.place(p, kind === 'hand' ? 'board' : kind, [cx, cz]);
}
