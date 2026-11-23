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
