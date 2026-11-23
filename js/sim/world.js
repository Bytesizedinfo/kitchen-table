// The simulated kitchen: pieces, burners, pan, pot. Fixed thermal tick; pure (no DOM / three.js).
import { pv } from './params.js';
import { wair } from './heat.js';
import { Burner, Pan, Pot } from './appliances.js';
import { Piece } from './piece.js';
import { LAYOUT } from './layout.js';

export class World {
  constructor(opts = {}) {
    this.dt = opts.dt || 1.0; // thermal tick (s)
    this.t = 0;
    this.acc = 0;
    this.Tamb = pv('Tamb');
    this.burners = [new Burner(0), new Burner(1)];
    this.pan = new Pan(this.burners[0]);
    this.pot = new Pot(this.burners[1]);
    this.pieces = [];
    this.probe = null; // { piece, rest:[x,y,z], T, history:[] }
    this.events = { sizzle: 0, boil: 0 };
    this.listeners = new Set();
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, data) { for (const fn of this.listeners) fn(type, data); }

  add(foodId, opts = {}) {
    const p = Piece.create(foodId, opts);
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
  clear() { for (const p of [...this.pieces]) this.remove(p); }

  /** Place a piece on a support: 'pan' | 'pot' | 'board' | 'table' | 'plate' | 'rest' | 'hand'. */
  place(p, kind, xz) {
    const L = LAYOUT;
    let y = 0, x = xz ? xz[0] : 0, z = xz ? xz[1] : 0, app = null;
    if (kind === 'pan') { app = this.pan; y = this.pan.surfaceY; if (!xz) { x = app.x; z = app.z; } }
    else if (kind === 'pot') { app = this.pot; y = this.pot.bottomY; if (!xz) { x = app.x; z = app.z; } }
    else if (kind === 'board') { y = L.board.h; if (!xz) { x = L.board.x; z = L.board.z; } }
    else if (kind === 'plate') { y = L.plate.h; if (!xz) { x = L.plate.x; z = L.plate.z; } }
    else if (kind === 'rest') { y = L.rest.h; if (!xz) { x = L.rest.x; z = L.rest.z; } }
    else if (kind === 'hand') { y = p.pos[1]; }
    // centre the piece's bounds over x,z
    if (kind !== 'hand') {
      const b = p.bounds();
      p.pos[0] += x - (b.lo[0] + b.hi[0]) / 2;
      p.pos[2] += z - (b.lo[2] + b.hi[2]) / 2;
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
      p.classify(this);
      const out = { Qcon: 0, Qair: 0, Qwat: 0, Qins: 0, Qoil: 0, evap: 0, latent: 0, evapSens: 0 };
      const drip = p.tick(this.env(p), dt, out);
      p.lastOut = out;
      const sup = p.support ? p.support.kind : 'table';
      if (sup === 'pan') {
        this.pan.foodQ += out.Qcon;
        this.pan.pool += drip;
        sizzle += out.evap;
      } else if (sup === 'pot') {
        this.pot.foodQ += out.Qwat + out.Qcon;
        this.pot.water += drip;
      }
    }
    this.pan.step(dt, this.Tamb);
    this.pot.step(dt, this.Tamb);
    this.events.sizzle = sizzle + this.pan.evap;
    this.events.boil = this.pot.boiling ? 1 : this.pot.T > 85 ? (this.pot.T - 85) / 15 : 0;
    this.t += dt;
    if (this.probe) this.updateProbe(dt);
  }

  insertProbe(piece, restPoint) {
    this.probe = { piece, rest: restPoint.slice(), T: piece.grid.sampleT(restPoint), history: [] };
    this.probe.Tshown = this.probe.T;
    this.emit('probe', this.probe);
  }
  updateProbe(dt) {
    const pr = this.probe;
    const Ttrue = pr.piece.grid.sampleT(pr.rest);
    const a = 1 - Math.exp(-dt / pv('probe_tau'));
    pr.T = Ttrue;
    pr.Tshown += (Ttrue - pr.Tshown) * a;
    pr.history.push([this.t, pr.Tshown]);
    if (pr.history.length > 4000) pr.history.splice(0, pr.history.length - 4000);
  }
}
