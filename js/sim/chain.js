// Chains: long soft foods (gummy worms; spaghetti later) as XPBD node chains, ported from
// body-sim/js/core/softbody.js (StoolPiece: integrate, distance constraints, finish, checkTear,
// splitAt) without the rendering. Heat lives on a 1-D state grid (one cell per node), so the
// ordinary heat / process / melting code runs unchanged. Pure.
import { StateGrid } from './grid.js';
import { Piece, getMaterial } from './piece.js';
import { pv } from './params.js';
import { supportAt } from './bits.js';

const G = -9.81;

export class Chain {
  constructor(nodes, segLen, R) {
    this.n = nodes.length / 3;
    this.x = Float32Array.from(nodes); this.p = Float32Array.from(nodes); this.v = new Float32Array(nodes.length);
    this.w = new Float32Array(this.n).fill(1);
    this.contact = new Uint8Array(this.n);
    this.segLen = segLen; this.R = R;
    this.pin = -1; this.target = null;
  }
  integrate(h) {
    for (let i = 0; i < this.n; i++) {
      this.contact[i] = 0;
      if (i === this.pin) {
        // the hand moves the grabbed node toward the pointer at up to 0.4 m/s
        const dx = this.target[0] - this.x[i * 3], dy = this.target[1] - this.x[i * 3 + 1], dz = this.target[2] - this.x[i * 3 + 2], d = Math.hypot(dx, dy, dz), mx = 0.4 * h;
        const k = d > mx ? mx / d : 1;
        this.p[i * 3] = this.x[i * 3] + dx * k; this.p[i * 3 + 1] = this.x[i * 3 + 1] + dy * k; this.p[i * 3 + 2] = this.x[i * 3 + 2] + dz * k;
        this.x[i * 3] = this.p[i * 3]; this.x[i * 3 + 1] = this.p[i * 3 + 1]; this.x[i * 3 + 2] = this.p[i * 3 + 2];
        continue;
      }
      this.v[i * 3 + 1] += G * h;
      const d = Math.exp(-0.5 * h);
      for (let a = 0; a < 3; a++) { this.v[i * 3 + a] *= d; this.p[i * 3 + a] = this.x[i * 3 + a] + this.v[i * 3 + a] * h; }
    }
  }
  distance(i, j, rest, alpha) {
    const p = this.p, wi = i === this.pin ? 0 : this.w[i], wj = j === this.pin ? 0 : this.w[j];
    if (wi + wj === 0) return;
    const dx = p[j * 3] - p[i * 3], dy = p[j * 3 + 1] - p[i * 3 + 1], dz = p[j * 3 + 2] - p[i * 3 + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9;
    const dl = -(d - rest) / (wi + wj + alpha);
    const nx = dx / d, ny = dy / d, nz = dz / d;
    p[i * 3] -= nx * dl * wi; p[i * 3 + 1] -= ny * dl * wi; p[i * 3 + 2] -= nz * dl * wi;
    p[j * 3] += nx * dl * wj; p[j * 3 + 1] += ny * dl * wj; p[j * 3 + 2] += nz * dl * wj;
  }
  solve(h, compStretch, compBend) {
    const a1 = compStretch / (h * h), a2 = compBend / (h * h), L = this.segLen;
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < this.n - 1; i++) this.distance(i, i + 1, L, a1);
      // bending only: the skip-one rest length follows the current segment lengths, so it never resists stretching
      const p = this.p;
      for (let i = 0; i < this.n - 2; i++) {
        const d1 = Math.hypot(p[i * 3 + 3] - p[i * 3], p[i * 3 + 4] - p[i * 3 + 1], p[i * 3 + 5] - p[i * 3 + 2]);
        const d2 = Math.hypot(p[i * 3 + 6] - p[i * 3 + 3], p[i * 3 + 7] - p[i * 3 + 4], p[i * 3 + 8] - p[i * 3 + 5]);
        this.distance(i, i + 2, (d1 + d2) * 0.995, a2);
      }
    }
  }
  collide(world) {
    for (let i = 0; i < this.n; i++) {
      if (i === this.pin) continue;
      const x = this.p[i * 3], z = this.p[i * 3 + 2];
      const sp = supportAt(world, x, z);
      const floor = sp.y + this.R;
      if (this.p[i * 3 + 1] < floor) { this.p[i * 3 + 1] = floor; this.contact[i] = 1; }
      if (sp.wallR) {
        const dx = x - sp.cx, dz = z - sp.cz, d = Math.hypot(dx, dz), lim = sp.wallR - this.R;
        if (d > lim) { this.p[i * 3] = sp.cx + (dx / d) * lim; this.p[i * 3 + 2] = sp.cz + (dz / d) * lim; }
      }
    }
  }
  finish(h) {
    const inv = 1 / h;
    // sticky contact: a resting gummy grips the board (positional friction), so pulling one end stretches it
    // static friction: a node in contact stays put unless pulled harder than it grips, then slides
    const grip = pv('gummy_grip') * h * 600;
    for (let i = 0; i < this.n; i++) if (this.contact[i] && i !== this.pin) {
      const dx = this.p[i * 3] - this.x[i * 3], dz = this.p[i * 3 + 2] - this.x[i * 3 + 2], d = Math.hypot(dx, dz);
      const k = d <= grip ? 0 : (d - grip) / d * 0.5;
      this.p[i * 3] = this.x[i * 3] + dx * k; this.p[i * 3 + 2] = this.x[i * 3 + 2] + dz * k;
    }
    for (let i = 0; i < this.n; i++) {
      let vx = (this.p[i * 3] - this.x[i * 3]) * inv, vy = (this.p[i * 3 + 1] - this.x[i * 3 + 1]) * inv, vz = (this.p[i * 3 + 2] - this.x[i * 3 + 2]) * inv;
      if (this.contact[i]) { const f = Math.exp(-18 * h); vx *= f; vz *= f; if (vy < 0) vy = 0; }
      this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
      this.x[i * 3] = this.p[i * 3]; this.x[i * 3 + 1] = this.p[i * 3 + 1]; this.x[i * 3 + 2] = this.p[i * 3 + 2];
    }
  }
  /** First interior segment stretched past the tear strain, or -1. */
  tearAt(strain) {
    for (let i = 1; i < this.n - 2; i++) {
      const dx = this.x[(i + 1) * 3] - this.x[i * 3], dy = this.x[(i + 1) * 3 + 1] - this.x[i * 3 + 1], dz = this.x[(i + 1) * 3 + 2] - this.x[i * 3 + 2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) / this.segLen > strain) return i;
    }
    return -1;
  }
  length() { let L = 0; for (let i = 0; i < this.n - 1; i++) L += Math.hypot(this.x[(i + 1) * 3] - this.x[i * 3], this.x[(i + 1) * 3 + 1] - this.x[i * 3 + 1], this.x[(i + 1) * 3 + 2] - this.x[i * 3 + 2]); return L; }
}

/** A piece whose shape is a chain. Its grid is n × 1 × 1 (one cell per node, square cross-section of equal area). */
export function makeChainPiece(foodId, def, opts = {}) {
  const R = def.chain.R, seg = def.chain.seg;
  const n = opts.nodes ? opts.nodes.length / 3 : Math.round(def.chain.L / seg) + 1;
  const mats = def.mats.map(getMaterial);
  const side = R * Math.sqrt(Math.PI);
  const g = new StateGrid(n, 1, 1, seg, side, side, [0, -side / 2, -side / 2]);
  const V = g.cellVol();
  for (let c = 0; c < n; c++) {
    const mi = opts.matOf ? opts.matOf(c) : def.chain.matOf ? def.chain.matOf(c / (n - 1)) : 0;
    const m = mats[mi];
    g.occ[c] = 1; g.mat[c] = mi; g.T[c] = opts.T0 ?? 22;
    const mass = V * m.rho0;
    g.ms[c] = mass * (1 - m.xw0); g.mw[c] = g.mw0[c] = mass * m.xw0;
  }
  for (const m of mats) for (const ps of m.procSpecs) if (!g.proc[ps.id]) g.addProc(ps.id, ps.init ?? 0);
  g.buildSkin(); g.computeDist(); g.buildMatCells(mats.length);
  const spec = { dims: [n * seg, side, side], cell: [seg, side, side], sdf: () => 1, mat: () => 0, T0: opts.T0 ?? 22 };
  const p = new Piece(foodId, def, spec, mats, g);
  let nodes = opts.nodes;
  if (!nodes) { nodes = new Float32Array(n * 3); for (let i = 0; i < n; i++) { nodes[i * 3] = (i - (n - 1) / 2) * seg; nodes[i * 3 + 1] = R; } }
  p.chain = new Chain(nodes, seg, R);
  if (opts.vel) p.chain.v.set(opts.vel);
  // geometry helpers in terms of nodes
  p.toWorld = (q, out = [0, 0, 0]) => { const i = Math.max(0, Math.min(n - 1, Math.round(q[0] / seg - 0.5))); out[0] = p.chain.x[i * 3]; out[1] = p.chain.x[i * 3 + 1] + q[1]; out[2] = p.chain.x[i * 3 + 2] + q[2]; return out; };
  p.forFaces = (fn) => {
    const ch = p.chain, w = [0, 0, 0];
    for (let s = 0; s < g.nSkin; s++) {
      const i = g.skinCell[s], m = g.skinMask[s];
      const x = ch.x[i * 3], y = ch.x[i * 3 + 1], z = ch.x[i * 3 + 2];
      for (let d = 0; d < 6; d++) {
        if (!(m & (1 << d))) continue;
        // lateral faces: up / down / sideways; end faces along the chain
        const n3 = d === 2 ? [0, 1, 0] : d === 3 ? [0, -1, 0] : d === 4 ? [0, 0, 1] : d === 5 ? [0, 0, -1] : [d === 0 ? 1 : -1, 0, 0];
        w[0] = x + n3[0] * ch.R; w[1] = y + n3[1] * ch.R; w[2] = z + n3[2] * ch.R;
        fn(s, d, w, n3);
      }
    }
  };
  p.minY = () => { let y = 1e9; for (let i = 0; i < n; i++) y = Math.min(y, p.chain.x[i * 3 + 1] - R); return y; };
  p.bounds = () => { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p.chain.x[i * 3 + a] - R); hi[a] = Math.max(hi[a], p.chain.x[i * 3 + a] + R); } return { lo, hi }; };
  p.restOn = (y) => { const dy = y - p.minY(); for (let i = 0; i < n; i++) { p.chain.x[i * 3 + 1] += dy; p.chain.p[i * 3 + 1] += dy; } p._bcKey = ''; };
  p.translate = (dx, dz) => { for (let i = 0; i < n; i++) { p.chain.x[i * 3] += dx; p.chain.x[i * 3 + 2] += dz; p.chain.p[i * 3] += dx; p.chain.p[i * 3 + 2] += dz; } p._bcKey = ''; };
  p.toRest = (q) => { let bi = 0, bd = 1e9; for (let i = 0; i < n; i++) { const d = (p.chain.x[i * 3] - q[0]) ** 2 + (p.chain.x[i * 3 + 1] - q[1]) ** 2 + (p.chain.x[i * 3 + 2] - q[2]) ** 2; if (d < bd) { bd = d; bi = i; } } return [(bi + 0.5) * seg, 0, 0]; };
  p.nearestNode = (q) => Math.round(p.toRest(q)[0] / seg - 0.5);
  p.pos = [0, 0, 0]; p.quat = [0, 0, 0, 1];
  p.initMass = p.mass();
  return p;
}

/** Stiffness from the gel state: a warm gummy droops and stretches, a melted one can't hold its shape. */
function compliances(p) {
  const liq = p.grid.proc.liq ? p.procMean('liq') : 0;
  return { stretch: pv('gummy_stretch_comp') * (1 + 40 * liq), bend: pv('gummy_bend_comp') * (1 + 400 * liq) };
}

/** Real-time physics for every chain piece; returns pieces that tore: [{ piece, at }]. */
export function stepChains(world, rdt) {
  const torn = [];
  const sub = 10, h = Math.min(rdt, 1 / 30) / sub;
  for (const p of world.pieces) {
    if (!p.chain) continue;
    const ch = p.chain, cmp = compliances(p);
    for (let s = 0; s < sub; s++) { ch.integrate(h); ch.solve(h, cmp.stretch, cmp.bend); ch.collide(world); ch.finish(h); }
    p._bcKey = 'moved';
    const at = ch.tearAt(pv('gummy_tear_strain'));
    if (at >= 0) torn.push({ piece: p, at });
  }
  return torn;
}

/** Split a chain piece between nodes i and i+1 (tearing, or the knife). Mass, water and heat are conserved. */
export function splitChain(world, p, i) {
  const ch = p.chain, g = p.grid, n = ch.n;
  if (i < 0 || i >= n - 1) return null;
  const parts = [[0, i], [i + 1, n - 1]].map(([a, b]) => {
    const q = makeChainPiece(p.foodId, p.def, { nodes: ch.x.slice(a * 3, (b + 1) * 3), vel: ch.v.slice(a * 3, (b + 1) * 3), matOf: (c) => g.mat[a + c] });
    const qg = q.grid;
    for (let c = 0; c <= b - a; c++) {
      qg.T[c] = g.T[a + c]; qg.ms[c] = g.ms[a + c]; qg.mw[c] = g.mw[a + c]; qg.mw0[c] = g.mw0[a + c];
      for (const name in g.proc) qg.proc[name][c] = g.proc[name][a + c];
    }
    q.initMass = p.initMass * (q.mass() / p.mass());
    q.support = p.support; q.label = p.label;
    return q;
  });
  world.remove(p);
  for (const q of parts) world.addPiece(q);
  return parts;
}
