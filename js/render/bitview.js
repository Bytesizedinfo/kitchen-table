// Bits rendered as instanced rounded boxes, one InstancedMesh per batch; colour per instance from
// each bit's state (cooked / browned / enzymatic browning / char), same palette as the food shader.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { s2l } from './foodmaterial.js';

const GEO = new RoundedBoxGeometry(1, 1, 1, 2, 0.16);
const lin = (a) => a.map(s2l);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const BROWN = [[0.74, 0.50, 0.28], [0.52, 0.29, 0.13], [0.33, 0.16, 0.07], [0.17, 0.09, 0.045]].map(lin);
const CHAR = lin([0.07, 0.06, 0.055]);

export function bitColor(b) {
  const m = b.mats[b.mi], L = m.look || {}, ch = m.def.chan || {};
  const get = (n) => (!n ? 0 : n.startsWith('1-') ? 1 - (b.procs[n.slice(2)] ?? 1) : b.procs[n] ?? 0);
  let c = mix(lin(L.c0 || [1, 1, 1]), lin(L.c1 || L.c0 || [1, 1, 1]), ss(0, 1, get(ch.r)));
  c = mix(c, lin(L.c2 || L.c1 || [1, 1, 1]), ss(0, 1, get(ch.g)));
  c = mix(c, lin(L.enzCol || [0.6, 0.45, 0.3]), ss(0, 1.6, b.enz) * 0.85);
  const br = b.brown;
  c = mix(c, BROWN[0], ss(0, 0.45, br) * 0.9); c = mix(c, BROWN[1], ss(0.35, 1.2, br)); c = mix(c, BROWN[2], ss(1.2, 2.4, br)); c = mix(c, BROWN[3], ss(2.4, 4, br) * 0.9);
  c = mix(c, CHAR, ss(0.15, 1.1, b.char * 2));
  return c;
}

export class BitView {
  constructor(scene) {
    this.scene = scene;
    this.batches = new Map(); // batch -> { mesh, bits }
    this.mat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0 });
    this.dummy = new THREE.Object3D();
    this.col = new THREE.Color();
    this.t = 0;
  }
  rebuild(world, batch) {
    const old = this.batches.get(batch);
    if (old) { this.scene.remove(old.mesh); old.mesh.dispose(); this.batches.delete(batch); }
    const bits = world.bits.filter((b) => b.batch === batch);
    if (!bits.length) return;
    const mesh = new THREE.InstancedMesh(GEO, this.mat, bits.length);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.bits = bits;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.batches.set(batch, { mesh, bits });
    this.sync(true);
  }
  sync(force = false, rdt = 0) {
    this.t += rdt;
    const recolor = force || this.t > 0.2;
    if (recolor) this.t = 0;
    for (const { mesh, bits } of this.batches.values()) {
      for (let i = 0; i < bits.length; i++) {
        const b = bits[i];
        this.dummy.position.set(b.pos[0], b.pos[1], b.pos[2]);
        this.dummy.quaternion.set(...b.quat);
        this.dummy.scale.set(b.dims[0], b.dims[1], b.dims[2]);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
        if (recolor) { const c = bitColor(b); mesh.setColorAt(i, this.col.setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace)); }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (recolor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  meshes() { return [...this.batches.values()].map((x) => x.mesh); }
  clear() { for (const { mesh } of this.batches.values()) { this.scene.remove(mesh); mesh.dispose(); } this.batches.clear(); }
}
