// StateGrid: the hidden 3D state of one food piece (rest/object space, metres).
// Cells: material, temperature, solid & water mass, one value per chemical process.
// Skin: one record per boundary cell (its exposed faces share one thin surface layer).
import { pv } from './params.js';

export const DIRS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

export class StateGrid {
  constructor(nx, ny, nz, dx, dy, dz, origin) {
    this.nx = nx; this.ny = ny; this.nz = nz;
    this.dx = dx; this.dy = dy; this.dz = dz;
    this.origin = origin.slice(); // rest-space position of cell (0,0,0)'s min corner
    const N = (this.N = nx * ny * nz);
    this.occ = new Uint8Array(N);
    this.mat = new Uint8Array(N);
    this.T = new Float32Array(N);
    this.ms = new Float32Array(N);
    this.mw = new Float32Array(N);
    this.mw0 = new Float32Array(N); // initial water (for water-holding / readouts)
    this.proc = {};
    this.dist = null; // distance to surface (cells), for core finding
    this.skinIdx = new Int32Array(N).fill(-1);
    this.nSkin = 0;
  }
  idx(i, j, k) { return i + this.nx * (j + this.ny * k); }
  /** Rest-space centre of a cell. */
  center(c, out = [0, 0, 0]) {
    const nx = this.nx, ny = this.ny;
    const i = c % nx, j = ((c / nx) | 0) % ny, k = (c / (nx * ny)) | 0;
    out[0] = this.origin[0] + (i + 0.5) * this.dx;
    out[1] = this.origin[1] + (j + 0.5) * this.dy;
    out[2] = this.origin[2] + (k + 0.5) * this.dz;
    return out;
  }
  cellVol() { return this.dx * this.dy * this.dz; }
  addProc(name, init = 0) { this.proc[name] = new Float32Array(this.N).fill(init); return this.proc[name]; }

  /** Build boundary faces + skin records. keep: optional {oldGrid, map(newCell)->oldCell} to carry skin state. */
  buildSkin(keep) {
    const { nx, ny, nz, occ, dx, dy, dz } = this;
    const area = [dy * dz, dy * dz, dx * dz, dx * dz, dx * dy, dx * dy];
    const half = [dx / 2, dx / 2, dy / 2, dy / 2, dz / 2, dz / 2];
    const cells = [], masks = [];
    const stride = [1, -1, nx, -nx, nx * ny, -nx * ny];
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const c = i + nx * (j + ny * k);
      if (!occ[c]) continue;
      let m = 0;
      const ijk = [i, j, k];
      for (let d = 0; d < 6; d++) {
        const a = d >> 1, s = d & 1 ? -1 : 1;
        const n = ijk[a] + s;
        const lim = a === 0 ? nx : a === 1 ? ny : nz;
        if (n < 0 || n >= lim || !occ[c + stride[d]]) m |= 1 << d;
      }
      if (m) { cells.push(c); masks.push(m); }
    }
    const S = (this.nSkin = cells.length);
    this.skinIdx.fill(-1);
    this.skinCell = Int32Array.from(cells);
    this.skinMask = Uint8Array.from(masks);
    this.skinArea = new Float32Array(S);
    this.skinG = new Float32Array(S); // Σ A/(d/2) : multiply by k for skin↔cell conductance
    this.skinFrac = new Float32Array(S); // fraction of the cell volume that is skin layer
    this.Ts = new Float32Array(S);
    this.skw = new Float32Array(S); // skin water kg (part of the cell's mw)
    this.skw0 = new Float32Array(S); // skin water at creation (dry-basis reference)
    this.film = new Float32Array(S); // liquid film on the surface, kg (in addition to mw)
    this.brown = new Float32Array(S);
    this.char = new Float32Array(S);
    this.evap = new Float32Array(S); // last evaporation rate kg/s (for sizzle / readouts)
    // per-skin area by boundary-condition class (filled by classify)
    this.Acon = new Float32Array(S); this.Aair = new Float32Array(S);
    this.Awat = new Float32Array(S); this.Ains = new Float32Array(S); this.Aoil = new Float32Array(S);
    const delta = pv('skin_depth'), V = this.cellVol();
    const oldG = keep && keep.oldGrid;
    for (let s = 0; s < S; s++) {
      const c = cells[s], m = masks[s];
      this.skinIdx[c] = s;
      let A = 0, G = 0, Vs = 0;
      for (let d = 0; d < 6; d++) if (m & (1 << d)) { A += area[d]; G += area[d] / half[d]; Vs += area[d] * delta; }
      this.skinArea[s] = A; this.skinG[s] = G;
      this.skinFrac[s] = Math.min(0.5, Vs / V);
      let carried = false;
      if (oldG) {
        const oc = keep.map(c);
        const os = oc >= 0 ? oldG.skinIdx[oc] : -1;
        if (os >= 0) {
          // carry surface state; scale water by new/old skin fraction
          const r = this.skinFrac[s] / Math.max(1e-9, oldG.skinFrac[os]);
          this.Ts[s] = oldG.Ts[os];
          this.skw0[s] = oldG.skw0[os] * r;
          this.skw[s] = Math.min(this.mw[c], oldG.skw[os] * r);
          this.film[s] = oldG.film[os] * Math.min(1, A / Math.max(1e-12, oldG.skinArea[os]));
          this.brown[s] = oldG.brown[os];
          this.char[s] = oldG.char[os];
          carried = true;
        }
      }
      if (!carried) {
        this.Ts[s] = this.T[c];
        this.skw[s] = this.mw[c] * this.skinFrac[s];
        this.skw0[s] = this.mw0[c] * this.skinFrac[s];
      }
    }
  }

  /** Chamfer-ish distance to the outside (in cells, 6-neighbour BFS). */
  computeDist() {
    const { nx, ny, nz, occ, N } = this;
    const d = (this.dist = new Float32Array(N).fill(-1));
    // scale steps by cell size so anisotropic grids measure true distance
    const stepLen = [this.dx, this.dx, this.dy, this.dy, this.dz, this.dz];
    const stride = [1, -1, nx, -nx, nx * ny, -nx * ny];
    const q = [];
    for (let s = 0; s < this.nSkin; s++) {
      const c = this.skinCell[s];
      const m = this.skinMask[s];
      let best = 1e9;
      for (let k = 0; k < 6; k++) if (m & (1 << k)) best = Math.min(best, stepLen[k] / 2);
      d[c] = best; q.push(c);
    }
    // Dijkstra-light: repeated relaxation sweeps (grids are small)
    let changed = true, guard = 0;
    while (changed && guard++ < 400) {
      changed = false;
      for (let c = 0; c < N; c++) {
        if (!occ[c]) continue;
        const i = c % nx, j = ((c / nx) | 0) % ny, k = (c / (nx * ny)) | 0;
        const ijk = [i, j, k];
        for (let dd = 0; dd < 6; dd++) {
          const a = dd >> 1, s = dd & 1 ? -1 : 1, nn = ijk[a] + s;
          const lim = a === 0 ? nx : a === 1 ? ny : nz;
          if (nn < 0 || nn >= lim) continue;
          const c2 = c + stride[dd];
          if (!occ[c2] || d[c2] < 0) continue;
          const v = d[c2] + stepLen[dd];
          if (d[c] < 0 || v < d[c] - 1e-9) { d[c] = v; changed = true; }
        }
      }
    }
    // core = deepest cell; nearest skin (for expelled juice) by gradient walk is approximated by BFS parent
    let core = -1, best = -1;
    for (let c = 0; c < N; c++) if (occ[c] && d[c] > best) { best = d[c]; core = c; }
    this.core = core;
    this.coreDepth = best;
    this.buildNearestSkin();
  }

  /** For each cell, the skin record its released juice travels to (multi-source BFS). */
  buildNearestSkin() {
    const { nx, ny, nz, occ, N } = this;
    const near = (this.nearSkin = new Int32Array(N).fill(-1));
    const stride = [1, -1, nx, -nx, nx * ny, -nx * ny];
    let front = [];
    for (let s = 0; s < this.nSkin; s++) { near[this.skinCell[s]] = s; front.push(this.skinCell[s]); }
    while (front.length) {
      const next = [];
      for (const c of front) {
        const i = c % nx, j = ((c / nx) | 0) % ny, k = (c / (nx * ny)) | 0;
        const ijk = [i, j, k];
        for (let dd = 0; dd < 6; dd++) {
          const a = dd >> 1, s = dd & 1 ? -1 : 1, nn = ijk[a] + s;
          const lim = a === 0 ? nx : a === 1 ? ny : nz;
          if (nn < 0 || nn >= lim) continue;
          const c2 = c + stride[dd];
          if (occ[c2] && near[c2] < 0) { near[c2] = near[c]; next.push(c2); }
        }
      }
      front = next;
    }
  }

  /** Trilinear temperature sample at a rest-space point (only occupied cells contribute). */
  sampleT(p) {
    const fx = (p[0] - this.origin[0]) / this.dx - 0.5;
    const fy = (p[1] - this.origin[1]) / this.dy - 0.5;
    const fz = (p[2] - this.origin[2]) / this.dz - 0.5;
    const i0 = Math.floor(fx), j0 = Math.floor(fy), k0 = Math.floor(fz);
    let sw = 0, sv = 0;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) {
      const i = i0 + a, j = j0 + b, k = k0 + c;
      if (i < 0 || j < 0 || k < 0 || i >= this.nx || j >= this.ny || k >= this.nz) continue;
      const id = this.idx(i, j, k);
      if (!this.occ[id]) continue;
      const w = (a ? fx - i0 : 1 - (fx - i0)) * (b ? fy - j0 : 1 - (fy - j0)) * (c ? fz - k0 : 1 - (fz - k0));
      sw += w; sv += w * this.T[id];
    }
    if (sw > 1e-6) return sv / sw;
    // fallback: nearest occupied cell
    const id = this.nearestOcc(p);
    return id >= 0 ? this.T[id] : NaN;
  }
  cellAt(p) {
    const i = Math.floor((p[0] - this.origin[0]) / this.dx);
    const j = Math.floor((p[1] - this.origin[1]) / this.dy);
    const k = Math.floor((p[2] - this.origin[2]) / this.dz);
    if (i < 0 || j < 0 || k < 0 || i >= this.nx || j >= this.ny || k >= this.nz) return -1;
    return this.idx(i, j, k);
  }
  nearestOcc(p) {
    let best = -1, bd = 1e9; const q = [0, 0, 0];
    for (let c = 0; c < this.N; c++) {
      if (!this.occ[c]) continue;
      this.center(c, q);
      const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  /** Per-material lists of occupied cells (processes iterate these instead of the whole grid). */
  buildMatCells(nMats) {
    const lists = Array.from({ length: nMats }, () => []);
    for (let c = 0; c < this.N; c++) if (this.occ[c]) lists[this.mat[c]].push(c);
    this.matCells = lists.map((l) => Int32Array.from(l));
  }
  occupiedCount() { let n = 0; for (let c = 0; c < this.N; c++) n += this.occ[c]; return n; }
}
