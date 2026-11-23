// Pointer tools: hand (drag food between board, pan, pot, plate), tongs (flip), probe (thermometer
// to the centre) and knife (drag a line to cut). Follows Pore Pressure's select/down/move/up model.
import * as THREE from 'three';
import { LAYOUT as L } from '../sim/layout.js';
import { flipPiece } from '../sim/ops.js';
import { qRot, qConj } from '../sim/math.js';

export const TOOLS = [
  { id: 'hand', name: 'Hand', key: 'H', tip: 'Hand: drag food to the pan, pot, board or plate',
    svg: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5a1.5 1.5 0 0 1 3 0v8M17 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L3.5 15.6a1.6 1.6 0 0 1 2.4-2.1L8 15.5"/>' },
  { id: 'tongs', name: 'Tongs', key: 'T', tip: 'Tongs: click food to flip it',
    svg: '<path d="M4 20 15 4M8 21 19 5M15 4l2.5-1M19 5l1.5 2M4 20l-1 1M8 21l-1 .5"/>' },
  { id: 'probe', name: 'Probe', key: 'P', tip: 'Thermometer: click food to probe its centre',
    svg: '<path d="M14 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M16 9v7"/><path d="M4 20l7-7"/>' },
  { id: 'knife', name: 'Knife', key: 'K', tip: 'Knife: drag a line across food to cut it',
    svg: '<path d="M3 21 15.5 8.5"/><path d="M14 10l6-6a2.8 2.8 0 0 1 0 4l-6 6z"/>' },
];

export class Tools {
  constructor(app) {
    this.app = app;
    this.tool = 'hand';
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.drag = null; this.cut = null; this.hover = null;
    const el = app.stage.renderer.domElement;
    this.el = el;
    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  select(id) { this.tool = id; this.app.onTool?.(id); this.app.stage.controls.enableRotate = true; }
  setRay(e) {
    const r = this.el.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.app.stage.camera);
  }
  pickFood(e) {
    this.setRay(e);
    const meshes = [...this.app.views.values()].map((v) => v.mesh);
    const hit = this.ray.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    return { piece: hit.object.userData.piece, point: hit.point.clone(), dir: this.ray.ray.direction.clone() };
  }
  planeHit(y) {
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), p) ? p : null;
  }
  down(e) {
    if (e.button !== 0) return;
    const app = this.app, W = app.world;
    app.audio?.start();
    const hit = this.pickFood(e);
    if (this.tool === 'knife') {
      if (!hit && !e.shiftKey) { /* allow cutting lines that start off the food */ }
      const r = this.el.getBoundingClientRect();
      this.cut = { x0: e.clientX - r.left, y0: e.clientY - r.top, x1: e.clientX - r.left, y1: e.clientY - r.top, e0: { clientX: e.clientX, clientY: e.clientY } };
      app.stage.controls.enabled = false;
      app.showCutLine(this.cut);
      return;
    }
    if (!hit) return;
    app.selectPiece(hit.piece);
    if (this.tool === 'hand') {
      const p = hit.piece;
      const carryY = 0.16;
      const b = p.bounds();
      this.drag = { piece: p, offX: (b.lo[0] + b.hi[0]) / 2 - hit.point.x, offZ: (b.lo[2] + b.hi[2]) / 2 - hit.point.z, carryY, from: p.support ? p.support.kind : 'board' };
      W.place(p, 'hand');
      p.restOn(carryY);
      app.stage.controls.enabled = false;
      app.hint('Drop it on the pan, in the pot, on the board or on the plate');
    } else if (this.tool === 'tongs') {
      flipPiece(W, hit.piece);
      app.audio?.tick();
    } else if (this.tool === 'probe') {
      this.insertProbe(hit);
    }
  }
  move(e) {
    const app = this.app;
    if (this.drag) {
      this.setRay(e);
      const p = this.drag.piece;
      const hp = this.planeHit(this.drag.carryY);
      if (!hp) return;
      const b = p.bounds();
      const cx = (b.lo[0] + b.hi[0]) / 2, cz = (b.lo[2] + b.hi[2]) / 2;
      p.pos[0] += hp.x + this.drag.offX - cx; p.pos[2] += hp.z + this.drag.offZ - cz;
      p._bcKey = '';
      app.dropPreview(this.dropTarget(hp.x + this.drag.offX, hp.z + this.drag.offZ));
      return;
    }
    if (this.cut) {
      const r = this.el.getBoundingClientRect();
      this.cut.x1 = e.clientX - r.left; this.cut.y1 = e.clientY - r.top;
      app.showCutLine(this.cut);
      return;
    }
    // hover highlight
    if (e.buttons) return;
    const hit = this.pickFood(e);
    const p = hit ? hit.piece : null;
    if (p !== this.hover) { this.hover = p; app.setHover(p); }
  }
  up(e) {
    const app = this.app, W = app.world;
    if (this.drag) {
      const p = this.drag.piece;
      const b = p.bounds();
      const x = (b.lo[0] + b.hi[0]) / 2, z = (b.lo[2] + b.hi[2]) / 2;
      const t = this.dropTarget(x, z);
      W.place(p, t.kind, t.xz);
      if (t.kind === 'pan' && W.pan.T > 120) app.audio?.sizzleBurst();
      if (t.kind === 'pot') app.audio?.splash();
      this.drag = null;
      app.dropPreview(null);
      app.stage.controls.enabled = true;
      app.hint('');
      app.selectPiece(p);
      return;
    }
    if (this.cut) {
      const c = this.cut;
      this.cut = null;
      app.hideCutLine();
      app.stage.controls.enabled = true;
      if (Math.hypot(c.x1 - c.x0, c.y1 - c.y0) < 12) return;
      app.cutAlongScreenLine(c);
    }
  }
  /** Where would a piece centred at (x,z) land? */
  dropTarget(x, z) {
    const W = this.app.world;
    const dp = Math.hypot(x - W.pan.x, z - W.pan.z), dq = Math.hypot(x - W.pot.x, z - W.pot.z);
    if (dp < L.pan.rTop + 0.02) { const k = Math.min(1, (L.pan.r - 0.035) / Math.max(dp, 1e-6)); return { kind: 'pan', xz: [W.pan.x + (x - W.pan.x) * k, W.pan.z + (z - W.pan.z) * k] }; }
    if (dq < L.pot.r + 0.02) { const k = Math.min(1, (L.pot.r - 0.03) / Math.max(dq, 1e-6)); return { kind: 'pot', xz: [W.pot.x + (x - W.pot.x) * k, W.pot.z + (z - W.pot.z) * k] }; }
    if (Math.hypot(x - L.plate.x, z - L.plate.z) < L.plate.r) return { kind: 'plate', xz: [x, z] };
    if (Math.abs(x - L.board.x) < L.board.w / 2 && Math.abs(z - L.board.z) < L.board.d / 2) return { kind: 'board', xz: [x, z] };
    const tx = Math.max(-L.table.w / 2 + 0.05, Math.min(L.table.w / 2 - 0.05, x)), tz = Math.max(-L.table.d / 2 + 0.05, Math.min(L.table.d / 2 - 0.05, z));
    return { kind: 'table', xz: [tx, tz] };
  }
  /** Push the probe in along the view ray and stop at the deepest point (thermal centre). */
  insertProbe(hit) {
    const p = hit.piece, g = p.grid;
    const o = p.toRest([hit.point.x, hit.point.y, hit.point.z]);
    const d = qRot(qConj(p.quat), [hit.dir.x, hit.dir.y, hit.dir.z]);
    let best = null, bestD = -1;
    for (let s = 0; s < 0.2; s += 0.0005) {
      const q = [o[0] + d[0] * s, o[1] + d[1] * s, o[2] + d[2] * s];
      const c = g.cellAt(q);
      if (c < 0) { if (s > 0.01) break; continue; }
      if (!g.occ[c]) { if (best && s > 0.004) break; continue; }
      if (g.dist[c] > bestD) { bestD = g.dist[c]; best = q; }
    }
    if (!best) return;
    this.app.world.insertProbe(p, best);
    this.app.onProbe(p, best, o);
    this.app.audio?.tick();
  }
}
