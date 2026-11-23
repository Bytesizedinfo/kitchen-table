// FoodView: the three.js mesh for one Piece, plus its two 3D state textures.
import * as THREE from 'three';
import { surfaceNets } from '../geom/surfacenets.js';
import { makeFoodMaterial, paletteFor } from './foodmaterial.js';

/** Build a closed mesh for a freshly created piece from its analytic shape. */
export function meshForPiece(piece) {
  const sp = piece.spec, h = sp.meshCell || Math.min(sp.cell[0], sp.cell[1], sp.cell[2]);
  const d = sp.dims.map((x) => x / 2 + 3 * h);
  const m = surfaceNets(sp.sdf, d.map((x) => -x), d, h);
  return { pos: m.pos, nrm: m.nrm, idx: m.idx, cap: new Float32Array(m.pos.length / 3) };
}

export function toGeometry(m) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3));
  g.setAttribute('aCap', new THREE.BufferAttribute(m.cap, 1));
  g.setIndex(new THREE.BufferAttribute(m.idx, 1));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

export class FoodView {
  constructor(piece, mesh, scene) {
    this.piece = piece;
    this.meshData = mesh;
    this.material = makeFoodMaterial(paletteFor(piece));
    this.mesh = new THREE.Mesh(toGeometry(mesh), this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.piece = piece;
    scene.add(this.mesh);
    this.scene = scene;
    this.lastUpload = -1e9;
    this.uploadedVersion = -1;
    this.thermal = false;
    this.allocTextures();
    this.sync(0, true);
  }
  allocTextures() {
    const g = this.piece.grid;
    this.tex?.dispose(); this.mtex?.dispose();
    const n = g.N * 4;
    this.sdata = new Uint8Array(n);
    this.mdata = new Uint8Array(n);
    const mk = (data) => {
      const t = new THREE.Data3DTexture(data, g.nx, g.ny, g.nz);
      t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
      t.minFilter = t.magFilter = THREE.LinearFilter;
      t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
      t.unpackAlignment = 1;
      t.needsUpdate = true;
      return t;
    };
    this.tex = mk(this.sdata);
    this.mtex = mk(this.mdata);
    const u = this.material.userData.u;
    u.uState.value = this.tex; u.uMat.value = this.mtex;
    u.uOrigin.value.set(...g.origin);
    u.uSize.value.set(g.nx * g.dx, g.ny * g.dy, g.nz * g.dz);
    u.uDims.value.set(g.nx, g.ny, g.nz);
  }
  /** Pack the piece's state into the textures; empty cells next to food copy their neighbour. */
  upload() {
    const p = this.piece, g = p.grid, S = this.sdata, M = this.mdata;
    const chans = p.mats.map((m) => {
      const ch = m.def.chan || {};
      const get = (name) => {
        if (!name) return null;
        if (name.startsWith('1-')) { const a = g.proc[name.slice(2)]; return a ? { a, inv: true } : null; }
        const a = g.proc[name]; return a ? { a, inv: false } : null;
      };
      return { r: get(ch.r), g: get(ch.g) };
    });
    const filled = (this._filled ||= new Uint8Array(g.N));
    filled.fill(0);
    for (let c = 0; c < g.N; c++) {
      if (!g.occ[c]) continue;
      const mi = g.mat[c], ch = chans[mi], o = c * 4;
      const rv = ch.r ? (ch.r.inv ? 1 - ch.r.a[c] : ch.r.a[c]) : 0;
      const gv = ch.g ? (ch.g.inv ? 1 - ch.g.a[c] : ch.g.a[c]) : 0;
      const s = g.skinIdx[c];
      let br = 0, chr = 0, wet;
      if (s >= 0) {
        br = g.brown[s]; chr = g.char[s];
        const fr = g.skinFrac[s], dry = g.ms[c] * fr;
        const ratio = g.skw0[s] > 0 ? g.skw[s] / g.skw0[s] : 0;
        wet = g.film[s] > 1e-7 ? 1 : Math.min(1, Math.max(0, (ratio - 0.3) / 0.7)) * 0.6;
        void dry;
      } else {
        wet = Math.min(1, g.mw0[c] > 0 ? g.mw[c] / g.mw0[c] : 0) * 0.5;
      }
      S[o] = rv * 255; S[o + 1] = gv * 255; S[o + 2] = Math.min(255, br * 63.75); S[o + 3] = Math.min(255, chr * 127.5);
      M[o] = mi; M[o + 1] = wet * 255; M[o + 2] = Math.max(0, Math.min(255, ((g.T[c] + 20) / 320) * 255)); M[o + 3] = mi === 1 ? 255 : 0;
      filled[c] = 1;
    }
    // dilate two rings so linear filtering at the surface never blends with empty texels
    const { nx, ny, nz } = g, stride = [1, -1, nx, -nx, nx * ny, -nx * ny];
    for (let pass = 0; pass < 2; pass++) {
      const add = [];
      for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const c = i + nx * (j + ny * k);
        if (filled[c]) continue;
        const ijk = [i, j, k];
        for (let d = 0; d < 6; d++) {
          const a = d >> 1, sgn = d & 1 ? -1 : 1, n = ijk[a] + sgn, lim = a === 0 ? nx : a === 1 ? ny : nz;
          if (n < 0 || n >= lim) continue;
          const c2 = c + stride[d];
          if (filled[c2]) { add.push(c, c2); break; }
        }
      }
      for (let q = 0; q < add.length; q += 2) {
        const c = add[q], c2 = add[q + 1], o = c * 4, o2 = c2 * 4;
        for (let e = 0; e < 4; e++) { S[o + e] = S[o2 + e]; M[o + e] = M[o2 + e]; }
        filled[c] = 2;
      }
    }
    this.tex.needsUpdate = true;
    this.mtex.needsUpdate = true;
  }
  sync(now, force = false) {
    const p = this.piece;
    this.mesh.position.set(...p.pos);
    this.mesh.quaternion.set(...p.quat);
    if (p.geomVersion !== this._geomVersion) { this._geomVersion = p.geomVersion; }
    if (force || (p.version !== this.uploadedVersion && now - this.lastUpload > 150)) {
      this.upload();
      this.uploadedVersion = p.version;
      this.lastUpload = now;
    }
  }
  setThermal(on) { this.material.userData.u.uThermal.value = on ? 1 : 0; }
  setHighlight(v) { this.material.userData.u.uHighlight.value = v; }
  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.tex?.dispose(); this.mtex?.dispose();
  }
}
