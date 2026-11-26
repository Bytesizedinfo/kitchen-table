// Pointer tools: hand (drag food between board, pan, pot, plate), tongs (flip), probe (thermometer
// to the centre) and knife (drag a line to cut). Follows Pore Pressure's select/down/move/up model.
import * as THREE from 'three';
import { LAYOUT as L } from '../sim/layout.js';
import { flipPiece, peelPiece, coatPiece } from '../sim/ops.js';
import { supportAt } from '../sim/bits.js';
import { pokeWobble } from '../sim/wobble.js';
import { qRot, qConj } from '../sim/math.js';

export const TOOLS = [
  { id: 'hand', name: 'Hand', key: 'H', tip: 'Hand: drag food to the pan, pot, board or plate',
    svg: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5a1.5 1.5 0 0 1 3 0v8M17 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L3.5 15.6a1.6 1.6 0 0 1 2.4-2.1L8 15.5"/>' },
  { id: 'tongs', name: 'Tongs', key: 'T', tip: 'Tongs: click food to flip it',
    svg: '<path d="M4 20 15 4M8 21 19 5M15 4l2.5-1M19 5l1.5 2M4 20l-1 1M8 21l-1 .5"/>' },
  { id: 'spatula', name: 'Spatula', key: 'S', tip: 'Spatula: drag through diced food to stir and toss it',
    svg: '<path d="M14 3h6v8h-6z"/><path d="M17 11 7 21"/>' },
  { id: 'probe', name: 'Probe', key: 'P', tip: 'Thermometer: click food to probe its centre',
    svg: '<path d="M14 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M16 9v7"/><path d="M4 20l7-7"/>' },
  { id: 'knife', name: 'Knife', key: 'K', tip: 'Knife: drag a line across food to cut it',
    svg: '<path d="M3 21 15.5 8.5"/><path d="M14 10l6-6a2.8 2.8 0 0 1 0 4l-6 6z"/>' },
  { id: 'peeler', name: 'Peeler', key: 'E', tip: 'Peeler: click food to peel it (banana and lemon lose their peel)',
    svg: '<path d="M4 20l6-6"/><path d="M10 14c2-6 6-10 10-11-1 4-5 8-11 10z"/><path d="M13 9l3 3"/>' },
  { id: 'lemon', name: 'Lemon juice', key: 'J', tip: 'Lemon juice: click cut fruit to slow browning (shift-click: ascorbic acid, stronger)',
    svg: '<ellipse cx="13" cy="11" rx="7" ry="5"/><path d="M6 11H3M20 11h1M10 17l-1 4M14 17l1 3"/>' },
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
    const meshes = [...this.app.views.values()].map((v) => v.mesh).concat(this.app.bitView ? this.app.bitView.meshes() : []);
    const hit = this.ray.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    if (hit.object.userData.bits) {
      const bit = hit.object.userData.bits[hit.instanceId];
      return { bit, point: hit.point.clone(), dir: this.ray.ray.direction.clone() };
    }
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
    if (this.tool === 'knife' && app.knifePreset && app.knifePreset !== 'free') {
      if (hit && hit.piece) { app.selectPiece(hit.piece); app.applyPreset(hit.piece, app.knifePreset); }
      return;
    }
    if (this.tool === 'knife') {
      const r = this.el.getBoundingClientRect();
      this.cut = { x0: e.clientX - r.left, y0: e.clientY - r.top, x1: e.clientX - r.left, y1: e.clientY - r.top, e0: { clientX: e.clientX, clientY: e.clientY } };
      app.stage.controls.enabled = false;
      app.showCutLine(this.cut);
      return;
    }
    if (this.tool === 'spatula') {
      this.stir = { last: null };
      app.stage.controls.enabled = false;
      this.stirAt(e);
      return;
    }
    if (!hit) return;
    if (hit.bit) {
      const bits = W.bits.filter((b) => b.batch === hit.bit.batch);
      if (this.tool === 'hand') {
        const carryY = 0.17;
        for (const b of bits) { b.held = true; b.off = [b.pos[0] - hit.point.x, b.pos[2] - hit.point.z]; }
        this.dragBits = { bits, carryY };
        app.stage.controls.enabled = false;
        app.hint('Drop the pile in the pan, the pot, on the board or the plate');
      } else if (this.tool === 'probe') {
        W.probe = { bit: hit.bit, piece: null, T: hit.bit.Tc, Tshown: hit.bit.Tc, history: [] };
        app.onProbeBit?.(hit.bit);
      } else if (this.tool === 'lemon') {
        for (const b of bits) b.coat = Math.max(b.coat || 0, e.shiftKey ? 2 : 1);
        app.hint(e.shiftKey ? 'Ascorbic acid on the pile' : 'Lemon juice on the pile');
      }
      app.selectBits?.(hit.bit);
      return;
    }
    app.selectPiece(hit.piece);
    if (this.tool === 'knife' && app.knifePreset && app.knifePreset !== 'free') { app.applyPreset(hit.piece, app.knifePreset); return; }
    if (this.tool === 'peeler') {
      const m = peelPiece(W, hit.piece);
      app.hint(m > 0 ? `Peeled: ${(m * 1000).toFixed(0)} g of peel removed` : 'Nothing to peel');
      app.audio?.chop();
      return;
    }
    if (this.tool === 'lemon') { coatPiece(hit.piece, e.shiftKey ? 2 : 1); app.hint(e.shiftKey ? 'Ascorbic acid on the cut surfaces' : 'Lemon juice on the cut surfaces'); return; }
    if (this.tool === 'hand' && hit.piece.chain) {
      // grab the nearest node of a gummy worm and pull it
      const p = hit.piece, i = p.nearestNode([hit.point.x, hit.point.y, hit.point.z]);
      p.chain.pin = i; p.chain.target = [hit.point.x, hit.point.y + 0.01, hit.point.z];
      this.grabChain = { piece: p, y: hit.point.y + 0.03 };
      app.stage.controls.enabled = false;
      app.hint('Pull to stretch it; let go to drop it');
      return;
    }
    if (this.tool === 'hand') {
      const p = hit.piece;
      const carryY = 0.16;
      const b = p.bounds();
      this.drag = { piece: p, offX: (b.lo[0] + b.hi[0]) / 2 - hit.point.x, offZ: (b.lo[2] + b.hi[2]) / 2 - hit.point.z, carryY, from: p.support ? p.support.kind : 'board', sx: e.clientX, sy: e.clientY, pos0: p.pos.slice(), quat0: p.quat.slice(), dir: [hit.dir.x, hit.dir.z] };
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
      app.dropPreview(this.dropTarget(hp.x + this.drag.offX, hp.z + this.drag.offZ, this.drag.piece));
      return;
    }
    if (this.dragBits) {
      this.setRay(e);
      const hp = this.planeHit(this.dragBits.carryY);
      if (!hp) return;
      for (const b of this.dragBits.bits) { b.pos[0] = hp.x + b.off[0]; b.pos[2] = hp.z + b.off[1]; b.pos[1] = this.dragBits.carryY; b.vel = [0, 0, 0]; }
      app.dropPreview(this.dropTarget(hp.x, hp.z));
      return;
    }
    if (this.grabChain) {
      this.setRay(e);
      const hp = this.planeHit(this.grabChain.y);
      if (hp) this.grabChain.piece.chain.target = [hp.x, this.grabChain.y, hp.z];
      return;
    }
    if (this.stir) { this.stirAt(e); return; }
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
    if (this.stir) { this.stir = null; app.stage.controls.enabled = true; return; }
    if (this.grabChain) {
      const p = this.grabChain.piece; p.chain.pin = -1;
      if (W.pieces.includes(p)) { const b = p.bounds(); p.support = { kind: supportAt(W, (b.lo[0] + b.hi[0]) / 2, (b.lo[2] + b.hi[2]) / 2).kind }; p._bcKey = ''; }
      this.grabChain = null; app.stage.controls.enabled = true; app.hint(''); return;
    }
    if (this.dragBits) {
      const bits = this.dragBits.bits;
      let cx = 0, cz = 0; for (const b of bits) { cx += b.pos[0]; cz += b.pos[2]; } cx /= bits.length; cz /= bits.length;
      const t = this.dropTarget(cx, cz);
      // scatter the pile over the target so it can fall and settle (inside the walls of a pan or pot)
      const vessel = t.kind === 'pan' ? W.pan : t.kind === 'pot' ? W.pot : null;
      const [tx, tz] = vessel ? [vessel.x, vessel.z] : t.xz;
      const R = Math.min(t.kind === 'pan' ? 0.085 : t.kind === 'pot' ? 0.075 : 0.09, 0.012 * Math.sqrt(bits.length));
      bits.forEach((b, i) => {
        const a = i * 2.39996, r = R * Math.sqrt((i + 0.5) / bits.length);
        b.pos[0] = tx + Math.cos(a) * r; b.pos[2] = tz + Math.sin(a) * r; b.pos[1] = 0.12 + (i % 7) * 0.004;
        b.held = false; b.sleep = 0; b.wake = true; b.vel = [0, 0, 0];
        b.support = supportAt(W, b.pos[0], b.pos[2]).kind;
      });
      if (t.kind === 'pan' && W.pan.T > 120) app.audio?.sizzleBurst();
      if (t.kind === 'pot') app.audio?.splash();
      this.dragBits = null;
      app.dropPreview(null); app.hint('');
      app.stage.controls.enabled = true;
      return;
    }
    if (this.drag && this.drag.piece.def.wobble && Math.hypot(e.clientX - this.drag.sx, e.clientY - this.drag.sy) < 4) {
      // just a poke: put it back and set it wobbling
      const p = this.drag.piece; p.pos = this.drag.pos0; p.quat = this.drag.quat0;
      W.place(p, this.drag.from, [p.bounds().lo[0] / 2 + p.bounds().hi[0] / 2, p.bounds().lo[2] / 2 + p.bounds().hi[2] / 2]);
      pokeWobble(p, this.drag.dir[0], this.drag.dir[1]);
      this.drag = null; app.dropPreview(null); app.hint(''); app.stage.controls.enabled = true; app.selectPiece(p); return;
    }
    if (this.drag) {
      const p = this.drag.piece;
      const b = p.bounds();
      const x = (b.lo[0] + b.hi[0]) / 2, z = (b.lo[2] + b.hi[2]) / 2;
      const t = this.dropTarget(x, z, p);
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
  /** Spatula: push and toss the bits near the pointer in the direction of the stroke. */
  stirAt(e) {
    const W = this.app.world;
    this.setRay(e);
    const hp = this.planeHit(W.pan.surfaceY + 0.01) || this.planeHit(0.03);
    if (!hp) return;
    const last = this.stir.last;
    this.stir.last = hp;
    if (!last) return;
    const vx = hp.x - last.x, vz = hp.z - last.z;
    for (const b of W.bits) {
      const d = Math.hypot(b.pos[0] - hp.x, b.pos[2] - hp.z);
      if (d > 0.03) continue;
      b.vel[0] += vx * 25; b.vel[2] += vz * 25; b.vel[1] += 0.25 + Math.random() * 0.2;
      b.sleep = 0; b.wake = true; b.stirred = true;
      // a toss shows a different face to the pan
      const t = Math.random() * Math.PI, s = Math.sin(t / 2);
      const ax = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5], l = Math.hypot(...ax) || 1;
      const q2 = [ax[0] / l * s, ax[1] / l * s, ax[2] / l * s, Math.cos(t / 2)], q = b.quat;
      b.quat = [q2[3] * q[0] + q2[0] * q[3] + q2[1] * q[2] - q2[2] * q[1], q2[3] * q[1] - q2[0] * q[2] + q2[1] * q[3] + q2[2] * q[0], q2[3] * q[2] + q2[0] * q[1] - q2[1] * q[0] + q2[2] * q[3], q2[3] * q[3] - q2[0] * q[0] - q2[1] * q[1] - q2[2] * q[2]];
    }
  }
  /** Where would a piece centred at (x,z) land? */
  dropTarget(x, z, piece = null) {
    const W = this.app.world;
    const T = L.toaster;
    if (Math.abs(x - T.x) < T.w / 2 + 0.01 && Math.abs(z - T.z) < T.d / 2 + 0.01) {
      // only slices of bread fit the slots; anything else lands on the table in front of the toaster
      if (piece && piece.def.toastable) return { kind: 'toaster', xz: [x, z] };
      return { kind: 'table', xz: [x, T.z + T.d / 2 + 0.07] };
    }
    const dp = Math.hypot(x - W.pan.x, z - W.pan.z), dq = Math.hypot(x - W.pot.x, z - W.pot.z);
    if (dp < L.pan.rTop + 0.02) { const k = Math.min(1, (L.pan.r - 0.035) / Math.max(dp, 1e-6)); return { kind: 'pan', xz: [W.pan.x + (x - W.pan.x) * k, W.pan.z + (z - W.pan.z) * k] }; }
    if (dq < L.pot.r + 0.02) { const k = Math.min(1, (L.pot.r - 0.03) / Math.max(dq, 1e-6)); return { kind: 'pot', xz: [W.pot.x + (x - W.pot.x) * k, W.pot.z + (z - W.pot.z) * k] }; }
    if (Math.hypot(x - L.plate.x, z - L.plate.z) < L.plate.r) return { kind: 'plate', xz: [x, z] };
    if (Math.abs(x - L.fridge.x) < L.fridge.w / 2 && Math.abs(z - L.fridge.z) < L.fridge.d / 2) return { kind: x < L.fridge.x ? 'freezer' : 'fridge', xz: [x, z] };
    if (Math.abs(x - L.board.x) < L.board.w / 2 && Math.abs(z - L.board.z) < L.board.d / 2) return { kind: 'board', xz: [x, z] };
    const tx = Math.max(-L.table.w / 2 + 0.05, Math.min(L.table.w / 2 - 0.05, x)), tz = Math.max(-L.table.d / 2 + 0.05, Math.min(L.table.d / 2 - 0.05, z));
    return { kind: 'table', xz: [tx, tz] };
  }
  /** Push the probe in along the view ray and stop at the deepest point (thermal centre). */
  insertProbe(hit) {
    const p = hit.piece, g = p.grid;
    if (p.chain) { const r = p.toRest([hit.point.x, hit.point.y, hit.point.z]); this.app.world.insertProbe(p, r); this.app.onProbe(p, r, [r[0], 1, 0]); return; }
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
