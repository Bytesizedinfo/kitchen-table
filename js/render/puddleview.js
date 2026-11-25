// Puddles of melted food: flat, glossy blobs whose colour follows the material and its state
// (liquid / set again, foaming butter, brown butter, char).
import * as THREE from 'three';
import { s2l } from './foodmaterial.js';

const lin = (a) => a.map(s2l);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function blobGeometry(seed) {
  const g = new THREE.CircleGeometry(1, 64);
  const p = g.attributes.position;
  for (let i = 1; i < p.count; i++) {
    const a = Math.atan2(p.getY(i), p.getX(i));
    const r = 1 + 0.08 * Math.sin(3 * a + seed) + 0.05 * Math.sin(5 * a + 2 * seed) + 0.03 * Math.sin(9 * a + seed * 3);
    p.setXY(i, p.getX(i) * r, p.getY(i) * r);
  }
  g.rotateX(-Math.PI / 2);
  return g;
}

export class PuddleView {
  constructor(scene) { this.scene = scene; this.meshes = new Map(); }
  sync(world) {
    const live = new Set(world.puddles);
    for (const [pd, m] of this.meshes) if (!live.has(pd)) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); this.meshes.delete(pd); }
    for (const pd of world.puddles) {
      let m = this.meshes.get(pd);
      if (!m) {
        m = new THREE.Mesh(blobGeometry(pd.id * 1.7), new THREE.MeshPhysicalMaterial({ roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true }));
        m.receiveShadow = true;
        this.scene.add(m);
        this.meshes.set(pd, m);
      }
      const L = pd.mat.look || {};
      let c = mix(lin(L.c0 || [1, 1, 1]), lin(L.c1 || L.c0 || [1, 1, 1]), pd.liq);
      if (pd.foam > 0.02) c = mix(c, lin([0.98, 0.95, 0.85]), Math.min(0.7, pd.foam));
      const b = pd.brown;
      c = mix(c, lin([0.62, 0.38, 0.14]), Math.min(1, b / 0.8) * 0.85);
      c = mix(c, lin([0.33, 0.17, 0.07]), Math.max(0, Math.min(1, (b - 0.8) / 1.5)));
      c = mix(c, lin([0.07, 0.06, 0.05]), Math.min(1, pd.char));
      m.material.color.setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace);
      m.material.opacity = pd.mat.def.smoke ? 0.88 : 0.97;
      m.material.roughness = pd.liq > 0.5 ? 0.1 : 0.5;
      const r = pd.radius();
      m.scale.set(r, 1, r);
      // pooled puddles sit centred in their vessel
      const cx = pd.kind === 'pan' ? world.pan.x : pd.kind === 'pot' ? world.pot.x : pd.x, cz = pd.kind === 'pan' ? world.pan.z : pd.kind === 'pot' ? world.pot.z : pd.z;
      const full = pd.radius() >= pd.maxR * 0.98;
      m.position.set(full ? cx : pd.x, pd.y + 0.0004 + Math.min(0.004, pd.depth() * 0.8), full ? cz : pd.z);
    }
  }
  clear() { for (const [, m] of this.meshes) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } this.meshes.clear(); }
}
