// The simulated kitchen: pieces, burners, pan, pot. Fixed thermal tick; pure (no DOM / three.js).
import { pv } from './params.js';
import { wair } from './heat.js';
import { Burner, Pan, Pot, Toaster } from './appliances.js';
import { qAxis } from './math.js';
import { Piece } from './piece.js';
import { FOODS } from './foods.js';
import { makeChainPiece } from './chain.js';
import { LAYOUT } from './layout.js';
import { stepBitThermal, bitProcSpecs } from './bits.js';
import { Puddle, drainPiece } from './puddle.js';

export class World {
  constructor(opts = {}) {
    this.dt = opts.dt || 1.0; // thermal tick (s)
    this.t = 0;
    this.acc = 0;
    this.Tamb = pv('Tamb');
    this.burners = [new Burner(0), new Burner(1)];
    this.pan = new Pan(this.burners[0]);
    this.pot = new Pot(this.burners[1]);
    this.toaster = new Toaster();
    this.pieces = [];
    this.bits = [];
    this.puddles = [];
    this.probe = null; // { piece, rest:[x,y,z], T, history:[] }
    this.events = { sizzle: 0, boil: 0 };
    this.listeners = new Set();
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, data) { for (const fn of this.listeners) fn(type, data); }

  add(foodId, opts = {}) {
    const def = FOODS[foodId];
    const p = def && def.chain ? makeChainPiece(foodId, def, opts) : Piece.create(foodId, opts);
    this.pieces.push(p);
    this.emit('add', p);
    return p;
  }
  addPiece(p) { this.pieces.push(p); this.emit('add', p); return p; }
  remove(p) {
    const i = this.pieces.indexOf(p);
    if (i >= 0) this.pieces.splice(i, 1);
    if (this.probe && this.probe.piece === p) this.probe = null;
    this.emit('remove', p);
  }
  clear() { for (const p of [...this.pieces]) this.remove(p); this.removeBits(this.bits.slice()); this.puddles = []; this.emit('puddles'); }
  /** The puddle a melted food joins (same food and support, close by), or a new one. */
  puddleAt(kind, x, z, mat, foodId) {
    let best = null;
    for (const p of this.puddles) if (p.kind === kind && p.foodId === foodId && Math.hypot(p.x - x, p.z - z) < p.radius() + 0.03) best = p;
    if (best) return best;
    const y = this.supportY(kind);
    best = new Puddle(kind, x, z, y, mat, foodId);
    this.puddles.push(best);
    this.emit('puddles');
    return best;
  }
  supportY(kind) {
    const L = LAYOUT;
    if (kind === 'toaster') return this.toaster.slotPos(0)[1];
    return kind === 'pan' ? this.pan.surfaceY : kind === 'pot' ? this.pot.bottomY : kind === 'board' ? L.board.h : kind === 'plate' ? L.plate.h - 0.006 : kind === 'fridge' || kind === 'freezer' ? L.fridge.floor : 0;
  }
  addBit(b) { bitProcSpecs(b.mats); this.bits.push(b); this.emit('bits', b.batch); return b; }
  removeBits(list) {
    const set = new Set(list);
    this.bits = this.bits.filter((b) => !set.has(b));
    if (this.probe && this.probe.bit && set.has(this.probe.bit)) this.probe = null;
    const batches = new Set(list.map((b) => b.batch));
    for (const bt of batches) this.emit('bits', bt);
  }
  /** Environment for something resting on a support kind (shared by pieces and bits). */
  envFor(sup, override) {
    const fake = { support: { kind: sup }, envOverride: override };
    return this.env(fake);
  }

  /** Place a piece on a support: 'pan' | 'pot' | 'board' | 'table' | 'plate' | 'rest' | 'hand'. */
  place(p, kind, xz) {
    const L = LAYOUT;
    let y = 0, x = xz ? xz[0] : 0, z = xz ? xz[1] : 0, app = null;
    if (kind === 'pan') { app = this.pan; y = this.pan.surfaceY; if (!xz) { x = app.x; z = app.z; } }
    else if (kind === 'pot') { app = this.pot; y = this.pot.bottomY; if (!xz) { x = app.x; z = app.z; } }
    else if (kind === 'board') { y = L.board.h; if (!xz) { x = L.board.x; z = L.board.z; } }
    else if (kind === 'plate') { y = L.plate.h; if (!xz) { x = L.plate.x; z = L.plate.z; } }
    else if (kind === 'rest') { y = L.rest.h; if (!xz) { x = L.rest.x; z = L.rest.z; } }
    else if (kind === 'fridge' || kind === 'freezer') {
      // left half is the freezer, right half the fridge
      const F = L.fridge, x0 = kind === 'freezer' ? F.x - F.w / 4 : F.x + F.w / 4;
      y = F.floor;
      if (!xz) { x = x0; z = F.z; }
      x = Math.max(x0 - F.w / 4 + 0.03, Math.min(x0 + F.w / 4 - 0.03, x)); z = Math.max(F.z - F.d / 2 + 0.03, Math.min(F.z + F.d / 2 - 0.03, z));
    }
    else if (kind === 'toaster') {
      // stand the slice upright in the nearest free slot (its thin axis across the slot)
      const T = this.toaster;
      let slot = xz ? (xz[1] < T.z ? 0 : 1) : 0;
      const used = this.pieces.filter((q) => q !== p && q.support && q.support.kind === 'toaster').map((q) => q.support.slot);
      if (used.includes(slot)) slot = 1 - slot;
      if (used.includes(slot)) return this.place(p, 'plate');
      p.quat = qAxis([1, 0, 0], -Math.PI / 2); p.upright = true;
      const sp = T.slotPos(slot);
      x = sp[0]; y = sp[1]; z = sp[2];
      const b = p.bounds();
      p.pos[0] += x - (b.lo[0] + b.hi[0]) / 2; p.pos[2] += z - (b.lo[2] + b.hi[2]) / 2;
      p.restOn(y);
      p.support = { kind, app: T, y, slot };
      p._bcKey = '';
      this.emit('move', p);
      return;
    }
    else if (kind === 'hand') { y = p.pos[1]; }
    if (kind !== 'hand' && p.upright) { p.quat = [0, 0, 0, 1]; p.upright = false; }
    // centre the piece's bounds over x,z
    if (kind !== 'hand') {
      const b = p.bounds();
      const dx = x - (b.lo[0] + b.hi[0]) / 2, dz = z - (b.lo[2] + b.hi[2]) / 2;
      if (p.translate) p.translate(dx, dz); else { p.pos[0] += dx; p.pos[2] += dz; }
      p.restOn(y);
    }
    p.support = { kind, app, y };
    p._bcKey = '';
    this.emit('move', p);
  }

  env(p) {
    const Tamb = this.Tamb, sup = p.support ? p.support.kind : 'table';
    const air = { h: pv('h_air_still'), T: Tamb, Trad: Tamb, eps: pv('eps_food'), w: wair(Tamb, pv('RHamb')) };
    const e = { con: { h: 0, T: Tamb }, air, wat: { h: 0, T: Tamb }, ins: { h: pv('h_board'), T: Tamb }, oil: { h: 0, T: Tamb } };
    if (sup === 'pan') {
      const pan = this.pan;
      e.con = { h: pan.contactH(), hDry: pv('h_contact_dry'), T: pan.T };
      // air just above a hot pan is warmer, and the pan walls radiate (calibrated)
      air.T = Tamb + 0.15 * Math.max(0, pan.T - Tamb);
      air.Trad = Tamb + 0.25 * Math.max(0, pan.T - Tamb);
    } else if (sup === 'pot') {
      const pot = this.pot;
      e.wat = { h: pot.waterH(), T: pot.T };
      e.con = { h: pot.waterH(), T: pot.T };
      if (pot.T > 60) { air.T = Math.max(Tamb, pot.T - 15); air.w = Math.min(0.5, wair(Math.min(pot.T, 99), 0.9)); }
    }
    else if (sup === 'toaster') {
      // lowered: the glowing elements radiate onto both faces; popped up: mostly room air
      const ts = this.toaster;
      air.h = pv('toaster_air_h');
      if (ts.on) {
        // the slice sees a little of the glowing element and mostly the warm reflector walls
        const F = pv('toaster_view'), Tw = Tamb + pv('toaster_wall') * (ts.Te - Tamb);
        air.T = Tw; air.Trad = Math.pow(F * (ts.Te + 273.15) ** 4 + (1 - F) * (Tw + 273.15) ** 4, 0.25) - 273.15;
      }
      else { air.T = Tamb + 0.05 * (ts.Te - Tamb); air.Trad = Tamb + 0.1 * (ts.Te - Tamb); }
    }
    else if (sup === 'fridge' || sup === 'freezer') {
      const T = pv(sup === 'fridge' ? 'fridge_T' : 'freezer_T'), h = pv('h_fridge');
      e.air = { h, T, Trad: T, eps: pv('eps_food'), w: wair(T, sup === 'fridge' ? 0.85 : 0.8) };
      e.ins = { h: h * 1.5, T };
    }
    if (p.envOverride) Object.assign(e, p.envOverride(e));
    return e;
  }

  /** Advance simulated time by `sec`, in fixed ticks. maxTicks guards frame time. Returns ticks run. */
  advance(sec, maxTicks = 1e9) {
    this.acc += sec;
    let n = 0;
    while (this.acc >= this.dt && n < maxTicks) { this.tick(this.dt); this.acc -= this.dt; n++; }
    if (n >= maxTicks) this.acc = Math.min(this.acc, this.dt);
    return n;
  }

  tick(dt) {
    let sizzle = 0;
    for (const p of this.pieces) {
      const key0 = p._bcKey;
      p.classify(this);
      // a piece in equilibrium with still surroundings sleeps: it is updated every 10 s instead of every tick
      const sup = p.support ? p.support.kind : 'table';
      const still = sup !== 'pan' && sup !== 'pot' && sup !== 'hand' && sup !== 'toaster' && p._bcKey === key0 && !p.awakeForce && !p.envOverride;
      if (still && p.calm > 30) {
        p.sleepAcc += dt;
        if (p.sleepAcc < 10) { p.lastOut = null; continue; }
      }
      const tdt = still && p.calm > 30 ? p.sleepAcc : dt;
      p.sleepAcc = 0;
      const out = { Qcon: 0, Qair: 0, Qwat: 0, Qins: 0, Qoil: 0, evap: 0, latent: 0, evapSens: 0 };
      const drip = p.tick(this.env(p), tdt, out);
      p.calm = still && p.grid._dTmax < 0.01 * tdt ? p.calm + 1 : 0;
      p.lastOut = out;
      if (out.fat && sup === 'pan') { this.pan.fat = (this.pan.fat || 0) + out.fat; this.pan.oiled = true; }
      if (sup === 'pan') {
        this.pan.foodQ += out.Qcon;
        this.pan.pool += drip;
        sizzle += out.evap;
      } else if (sup === 'pot') {
        this.pot.foodQ += out.Qwat + out.Qcon;
        this.pot.water += drip;
      }
    }
    // bits: two-node thermal model on whatever they rest on
    if (this.bits.length) {
      const envCache = {};
      for (const b of this.bits) {
        const sup = b.held ? 'hand' : b.support || 'board';
        const env = envCache[sup] || (envCache[sup] = this.env({ support: { kind: sup } }));
        if (sup === 'pot' && b.pos[1] > this.pot.level()) { /* floating above water: treat as air */ }
        const out = { Qcon: 0, Qwat: 0, evap: 0 };
        stepBitThermal(b, env, dt, out);
        if (sup === 'pan') { this.pan.foodQ += out.Qcon; sizzle += out.evap; }
        else if (sup === 'pot') this.pot.foodQ += out.Qwat;
      }
    }
    // melting: surface cells past their flow point run off into puddles (checked every 2 s)
    for (const p of [...this.pieces]) {
      if (!p.grid.proc.liq) continue;
      p._drainAcc = (p._drainAcc || 0) + dt;
      if (p._drainAcc < 2) continue;
      p._drainAcc = 0;
      const r = drainPiece(this, p);
      if (r && !r.gone) { const b = p.bounds(); this.place(p, p.support ? p.support.kind : 'board', [(b.lo[0] + b.hi[0]) / 2, (b.lo[2] + b.hi[2]) / 2]); this.emit('melt', p); }
    }
    // puddles exchange heat with whatever they lie on; butter in the pan becomes the pan's fat
    let butterInPan = null;
    for (const pd of this.puddles) {
      const env = this.env({ support: { kind: pd.kind } });
      const r = pd.step(env, dt);
      if (pd.kind === 'pan') { this.pan.foodQ += r.q; sizzle += r.evap; if (pd.mat.def.smoke) butterInPan = pd; }
    }
    if (butterInPan) { this.pan.oiled = true; this.pan.butter = butterInPan; if (this.pan.oil === 'none' || this.pan.oil == null) this.pan.smokePoint = pv('smoke_butter'); } else this.pan.butter = null;
    const nP = this.puddles.length;
    this.puddles = this.puddles.filter((pd) => pd.mass() > 1e-5);
    if (this.puddles.length !== nP) this.emit('puddles');
    this.pan.step(dt, this.Tamb);
    this.pot.step(dt, this.Tamb);
    // toaster: when the timer runs out the bread pops up
    const lowered = this.toaster.on;
    this.toaster.step(dt, this.Tamb);
    if (lowered !== this.toaster.on) this.retoast();
    this.events.sizzle = sizzle + this.pan.evap;
    this.events.boil = this.pot.boiling ? 1 : this.pot.T > 85 ? (this.pot.T - 85) / 15 : 0;
    this.t += dt;
    if (this.probe) this.updateProbe(dt);
  }

  /** Move slices in the toaster down (toasting) or up (popped). */
  retoast() {
    for (const p of this.pieces) if (p.support && p.support.kind === 'toaster') { const y = this.toaster.slotPos(p.support.slot)[1]; p.restOn(y); p.support.y = y; p._bcKey = ''; this.emit('move', p); }
  }
  toastStart() { if (!this.toaster.on) { this.toaster.start(); this.retoast(); } }
  toastStop() { if (this.toaster.on) { this.toaster.stop(); this.retoast(); } }

  insertProbe(piece, restPoint) {
    this.probe = { piece, rest: restPoint.slice(), T: piece.grid.sampleT(restPoint), history: [] };
    this.probe.Tshown = this.probe.T;
    this.emit('probe', this.probe);
  }
  updateProbe(dt) {
    const pr = this.probe;
    const Ttrue = pr.bit ? pr.bit.Tc : pr.piece.grid.sampleT(pr.rest);
    const a = 1 - Math.exp(-dt / pv('probe_tau'));
    pr.T = Ttrue;
    pr.Tshown += (Ttrue - pr.Tshown) * a;
    pr.history.push([this.t, pr.Tshown]);
    if (pr.history.length > 4000) pr.history.splice(0, pr.history.length - 4000);
  }
}
