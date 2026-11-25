// A chain piece (gummy worm) drawn as a tube along a Catmull-Rom curve through its nodes. Each vertex
// carries its rest-space position (arc length, ring offset) in `aRest`, so the ordinary food shader
// reads the right cell of the 1-D state grid.
import * as THREE from 'three';
import { FoodView } from './foodview.js';

const RAD = 14, PER = 3;

export class TubeView extends FoodView {
  constructor(piece, scene) {
    const ch = piece.chain, n = ch.n, rings = (n - 1) * PER + 1;
    const nv = rings * RAD + 2;
    const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), rest = new Float32Array(nv * 3), cap = new Float32Array(nv);
    const idx = [];
    for (let k = 0; k < rings - 1; k++) for (let j = 0; j < RAD; j++) {
      const a = k * RAD + j, b = k * RAD + ((j + 1) % RAD), c = a + RAD, d = b + RAD;
      idx.push(a, c, b, b, c, d);
    }
    const c0 = rings * RAD, c1 = c0 + 1;
    for (let j = 0; j < RAD; j++) { idx.push(c0, j, (j + 1) % RAD); const o = (rings - 1) * RAD; idx.push(c1, o + ((j + 1) % RAD), o + j); }
    for (let k = 0; k < rings; k++) for (let j = 0; j < RAD; j++) {
      const v = k * RAD + j, th = (j / RAD) * Math.PI * 2;
      rest[v * 3] = (k / PER) * ch.segLen + ch.segLen / 2; rest[v * 3 + 1] = Math.cos(th) * ch.R * 0.85; rest[v * 3 + 2] = Math.sin(th) * ch.R * 0.85;
    }
    rest[c0 * 3] = ch.segLen / 2; rest[c1 * 3] = (n - 0.5) * ch.segLen;
    super(piece, { pos, nrm, idx: Uint32Array.from(idx), cap }, scene);
    this.mesh.geometry.setAttribute('aRest', new THREE.BufferAttribute(rest, 3));
    this.material.defines = { ...(this.material.defines || {}), USE_AREST: '' };
    this.material.needsUpdate = true;
    this.rings = rings;
    this.mesh.frustumCulled = false;
    this.updateTube();
  }
  centre(t, out) {
    const ch = this.piece.chain, x = ch.x, n = ch.n;
    const tt = Math.max(0, Math.min(n - 1.0001, t)), i = Math.floor(tt), f = tt - i;
    const i0 = Math.max(0, i - 1), i2 = Math.min(n - 1, i + 1), i3 = Math.min(n - 1, i + 2);
    for (let c = 0; c < 3; c++) {
      const p0 = x[i0 * 3 + c], p1 = x[i * 3 + c], p2 = x[i2 * 3 + c], p3 = x[i3 * 3 + c];
      out[c] = 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    }
    return out;
  }
  updateTube() {
    const ch = this.piece.chain, g = this.mesh.geometry, P = g.attributes.position.array, N = g.attributes.normal.array;
    const C = [0, 0, 0], C2 = [0, 0, 0];
    let nPrev = null;
    const R = ch.R;
    for (let k = 0; k < this.rings; k++) {
      const t = k / PER;
      this.centre(t, C); this.centre(Math.min(ch.n - 1, t + 0.05), C2);
      let T = [C2[0] - C[0], C2[1] - C[1], C2[2] - C[2]];
      if (t + 0.05 > ch.n - 1) { this.centre(t - 0.05, C2); T = [C[0] - C2[0], C[1] - C2[1], C[2] - C2[2]]; }
      let l = Math.hypot(...T) || 1; T = T.map((x) => x / l);
      // parallel-transport a normal along the curve
      let Nn = nPrev || (Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
      const dp = Nn[0] * T[0] + Nn[1] * T[1] + Nn[2] * T[2];
      Nn = [Nn[0] - dp * T[0], Nn[1] - dp * T[1], Nn[2] - dp * T[2]]; l = Math.hypot(...Nn) || 1; Nn = Nn.map((x) => x / l);
      const B = [T[1] * Nn[2] - T[2] * Nn[1], T[2] * Nn[0] - T[0] * Nn[2], T[0] * Nn[1] - T[1] * Nn[0]];
      nPrev = Nn;
      // thinner where stretched (volume roughly kept)
      const seg = Math.max(1, Math.floor(t)), dx = ch.x[Math.min(ch.n - 1, seg) * 3] - ch.x[(seg - 1) * 3], dy = ch.x[Math.min(ch.n - 1, seg) * 3 + 1] - ch.x[(seg - 1) * 3 + 1], dz = ch.x[Math.min(ch.n - 1, seg) * 3 + 2] - ch.x[(seg - 1) * 3 + 2];
      const str = Math.max(0.5, Math.hypot(dx, dy, dz) / ch.segLen), r = (R / Math.sqrt(str)) * (k === 0 || k === this.rings - 1 ? 0.92 : 1);
      for (let j = 0; j < RAD; j++) {
        const th = (j / RAD) * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
        const nx = Nn[0] * cs + B[0] * sn, ny = Nn[1] * cs + B[1] * sn, nz = Nn[2] * cs + B[2] * sn;
        const v = (k * RAD + j) * 3;
        P[v] = C[0] + nx * r; P[v + 1] = C[1] + ny * r; P[v + 2] = C[2] + nz * r;
        N[v] = nx; N[v + 1] = ny; N[v + 2] = nz;
      }
      if (k === 0 || k === this.rings - 1) {
        const v = (this.rings * RAD + (k === 0 ? 0 : 1)) * 3, s = k === 0 ? -1 : 1;
        P[v] = C[0] + T[0] * R * 0.6 * s; P[v + 1] = C[1] + T[1] * R * 0.6 * s; P[v + 2] = C[2] + T[2] * R * 0.6 * s;
        N[v] = T[0] * s; N[v + 1] = T[1] * s; N[v + 2] = T[2] * s;
      }
    }
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
    g.computeBoundingSphere();
  }
  sync(now, force = false) {
    this.updateTube();
    super.sync(now, force);
  }
}
