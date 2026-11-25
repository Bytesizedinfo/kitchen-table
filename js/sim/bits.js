// Bits: small cut pieces (dice, sticks, mince) as many light objects. Each bit is a box with a
// two-node thermal model (surface + core), water in core and surface, the same browning / process
// physics as the voxel pieces, and simple sphere-proxy physics that sleeps when still. Pure.
import { pv } from './params.js';
import { T_MIN, NT, NX } from './props.js';
import { evapDrive, caramelRate } from './heat.js';
import { resolveProcs } from './process.js';
import { LAYOUT as L } from './layout.js';
import { qRot } from './math.js';

let BIT_ID = 1, BATCH_ID = 1;
export const newBatch = () => BATCH_ID++;
const CP_AIR = 1006;

export class Bit {
  constructor(o) {
    Object.assign(this, o);
    this.id = BIT_ID++;
    this.vel = [0, 0, 0];
    this.sleep = 0;
    this.Tc = o.T; this.Ts = o.T;
    this.film = 0;
    this.Lc = 0;
  }
  get volume() { return this.dims[0] * this.dims[1] * this.dims[2]; }
  mass() { return this.ms + this.mw + this.film; }
}

/** Thermal step for every bit in an environment (same env objects as pieces). */
export function stepBitThermal(b, env, dt, out) {
  const m = b.mats[b.mi];
  const [a, bb, c] = b.dims;
  const V = Math.max(1e-9, a * bb * c), A = 2 * (a * bb + bb * c + c * a);
  const xw = b.mw / (b.ms + b.mw + 1e-12);
  let ti = ((b.Tc + b.Ts) / 2 - T_MIN + 0.5) | 0; ti = ti < 0 ? 0 : ti >= NT ? NT - 1 : ti;
  let xj = (xw * (NX - 1) + 0.5) | 0; xj = xj < 0 ? 0 : xj >= NX ? NX - 1 : xj;
  const k = m.kTab[xj * NT + ti];
  const Ctot = b.ms * m.cpS[ti] + (b.mw + b.film) * m.cpW[ti];
  // four concentric shells of an equivalent sphere whose first conduction mode matches the box
  // exactly (R = 1/√Σ1/d²); capacities and conductances scaled to the box's heat capacity.
  const R = 1 / Math.sqrt(1 / (a * a) + 1 / (bb * bb) + 1 / (c * c)), dr = R / 4;
  const Csph = (Ctot / V) * (4 / 3) * Math.PI * R * R * R, sc = Ctot / Csph;
  const Tn = b.Tn || (b.Tn = [b.Tc, b.Tc, b.Ts, b.Ts]);
  const Cn = [0, 0, 0, 0], Gn = [0, 0, 0];
  for (let i = 0; i < 4; i++) Cn[i] = sc * (Ctot / V) * (4 / 3) * Math.PI * (((i + 1) * dr) ** 3 - (i * dr) ** 3);
  for (let i = 0; i < 3; i++) Gn[i] = sc * k * 4 * Math.PI * ((i + 1) * dr) ** 2 / dr;
  const Cs = Cn[3];
  // contact on the largest face when resting on the pan
  const dims = [a, bb, c].sort((x, y) => y - x);
  // curved scales (onion) touch the pan along only part of their face
  const Acon = env.con.h > 0 ? dims[0] * dims[1] * (b.def.layer ? pv('scale_contact') : 1) : 0;
  const sub = env.wat.h > 0;
  const Aair = sub ? 0 : A - Acon, Awat = sub ? A : 0, Ains = !sub && env.ins.h > 0 && !Acon ? dims[0] * dims[1] : 0;
  const AairE = Aair - Ains;
  // surface water state
  const wet = b.film > 1e-9 ? 1 : Math.max(0, Math.min(1, (b.sw / Math.max(1e-12, b.sw0)) / pv('dry_crit')));
  const psi = sub ? 0 : wet;
  const hc = env.con.hDry != null ? env.con.hDry + (env.con.h - env.con.hDry) * wet : env.con.h;
  // outer shell centre sits dr/2 inside the surface: series with the surface coefficients
  const Gsurf = sc * k * 4 * Math.PI * R * R / (dr / 2);
  const hA = hc * Acon + env.air.h * AairE + env.wat.h * Awat + env.ins.h * Ains;
  const hAT = hc * Acon * env.con.T + env.air.h * AairE * env.air.T + env.wat.h * Awat * env.wat.T + env.ins.h * Ains * env.ins.T;
  const H = (Gsurf * hA) / (Gsurf + hA + 1e-12), Tinf = hA > 0 ? hAT / hA : Tn[3];
  // implicit 4-node solve (Thomas), boundary on the outer node
  const aa = [0, 0, 0, 0], bd = [0, 0, 0, 0], cu = [0, 0, 0, 0], dd = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const gl = i > 0 ? Gn[i - 1] : 0, gr = i < 3 ? Gn[i] : 0;
    aa[i] = -gl; cu[i] = -gr; bd[i] = Cn[i] / dt + gl + gr + (i === 3 ? H : 0);
    dd[i] = (Cn[i] / dt) * Tn[i] + (i === 3 ? H * Tinf : 0);
  }
  for (let i = 1; i < 4; i++) { const w = aa[i] / bd[i - 1]; bd[i] -= w * cu[i - 1]; dd[i] -= w * dd[i - 1]; }
  const Tnew = [0, 0, 0, 0];
  Tnew[3] = dd[3] / bd[3];
  for (let i = 2; i >= 0; i--) Tnew[i] = (dd[i] - cu[i] * Tnew[i + 1]) / bd[i];
  // surface (skin) temperature between the outer shell and the surroundings
  let Ts = (Gsurf * Tnew[3] + hAT) / (Gsurf + hA + 1e-12);
  let E = 0;
  const Lv = pv('Lv');
  if (psi > 0) {
    if (Ts > 100) {
      // boiling: the excess heat at the surface evaporates surface water
      const excess = (Ts - 100) * (Gsurf + hA);
      E = Math.min((psi * excess) / Lv, (b.sw + b.film) / dt);
      Ts = 100 + (excess - Lv * E) / (Gsurf + hA);
    } else if (AairE > 0) {
      E = psi * ((env.air.h * AairE) / CP_AIR) * evapDrive(Ts, env.air.w);
      E = Math.min(E, (b.sw + b.film) / dt);
      Ts -= (Lv * E) / (Gsurf + hA);
    }
    // the latent heat comes out of the outer shell
    Tnew[3] -= (Lv * E * dt) / Cn[3];
  }
  out.Qcon += hc * Acon * (env.con.T - Ts); out.Qwat += env.wat.h * Awat * (env.wat.T - Ts); out.evap += E;
  for (let i = 0; i < 4; i++) Tn[i] = Tnew[i];
  b.Ts = Ts; b.Tc = Tn[0];
  const Cc = Cn[0] + Cn[1];
  // remove evaporated water: film first, then surface water
  let mE = E * dt;
  const f = Math.min(b.film, mE); b.film -= f; mE -= f;
  const w = Math.min(b.sw, mE); b.sw -= w; b.mw -= w;
  // water supply core → surface, plus release from broken cells (onion "sweating")
  const floor = (m.def.waterFloor || 0) * b.ms; // sugary tissue holds some water as syrup
  const coreW = b.mw - b.sw - floor;
  const firm = b.procs.firm ?? 1;
  const rel = (m.def.waterRelease ? (1 - firm) * pv('cell_release') : 0) + 4e-4 * (wet < 1 ? 1 : 0.2);
  const move = Math.max(0, coreW) * Math.min(0.2, rel * dt);
  b.sw += move;
  // interior boiling once the core passes 100 °C
  for (let i = 0; i < 3; i++) {
    if (Tn[i] > 100 && coreW > 0.04 * b.ms) {
      const ex = (Tn[i] - 100) * Cn[i], mm = Math.min(coreW - 0.04 * b.ms, ex / Lv);
      b.mw -= mm; Tn[i] = 100 + (ex - mm * Lv) / Cn[i]; out.evap += mm / dt;
    }
  }
  b.Tc = Tn[0];
  // processes on the mean temperature
  const Tm = (Tn[0] * Cn[0] + Tn[1] * Cn[1] + Tn[2] * Cn[2] + Tn[3] * Cn[3]) / (Cn[0] + Cn[1] + Cn[2] + Cn[3]);
  for (const sp of m.procSpecs) {
    const x = b.procs[sp.id];
    if (x === undefined) continue;
    if (sp.type === 'eq') {
      const Deq = 1 / (1 + Math.exp(-(Tm - sp.Tm) / sp.w));
      if (Deq > x) b.procs[sp.id] = x + (Deq - x) * (1 - Math.exp(-dt / sp.tau));
    } else if (sp.type === 'arrh1') {
      const kk = sp.kref * Math.exp((-sp.Ea / pv('Rgas')) * (1 / (Tm + 273.15) - 1 / (sp.Tref + 273.15)));
      b.procs[sp.id] = x * Math.exp(-kk * dt);
    }
  }
  // browning on the hot (contact) face, gated by dryness
  const dry = sub ? 0 : 1 - wet;
  if (dry > 0) {
    const fcon = Acon / A;
    const Tcon = Acon ? Math.min(env.con.T, Ts + (env.con.T - Ts) * (hc / (hc + k / 6e-4))) : Ts;
    const rate = (T) => (T > 90 ? pv('maillard_rate140') * Math.exp((-pv('maillard_Ea') / pv('Rgas')) * (1 / (T + 273.15) - 1 / (pv('maillard_T0') + 273.15))) + (m.def.sugars ? caramelRate(T, m.def.sugars) : 0) : 0);
    // a stirred bit shows all its faces to the pan over time: spread the contact browning over the whole surface
    b.brown = Math.min(10, b.brown + dt * dry * (fcon * rate(Tcon) + (1 - fcon) * rate(Ts)) * (b.stirred ? 1 : 1.6));
    if (Tcon > 150) b.char = Math.min(10, b.char + dt * dry * fcon * pv('char_rate200') * Math.exp((-pv('char_Ea') / pv('Rgas')) * (1 / (Tcon + 273.15) - 1 / (pv('char_T0') + 273.15))));
  }
  if (m.def.enz && !sub) b.enz += dt * pv('enz_rate') * m.def.enz * (b.procs.ppo ?? 1) * Math.pow(2, (Math.min(b.Ts, 40) - 22) / 10) * [1, pv('enz_lemon'), pv('enz_ascorbic')][b.coat || 0];
}

/** Support surface under (x,z) for physics: { y, kind, wallR?, cx, cz }. */
export function supportAt(world, x, z) {
  const P = world.pan, Q = world.pot;
  if (Math.hypot(x - P.x, z - P.z) < L.pan.rTop) return { y: P.surfaceY, kind: 'pan', cx: P.x, cz: P.z, wallR: L.pan.r };
  if (Math.hypot(x - Q.x, z - Q.z) < L.pot.r + 0.005) return { y: Q.bottomY, kind: 'pot', cx: Q.x, cz: Q.z, wallR: L.pot.r };
  if (Math.hypot(x - L.plate.x, z - L.plate.z) < L.plate.r * 0.85) return { y: 0.012, kind: 'plate' };
  const F = L.fridge;
  if (Math.abs(x - F.x) < F.w / 2 && Math.abs(z - F.z) < F.d / 2) return { y: F.floor, kind: x < F.x ? 'freezer' : 'fridge' };
  if (Math.abs(x - L.board.x) < L.board.w / 2 && Math.abs(z - L.board.z) < L.board.d / 2) return { y: L.board.h, kind: 'board' };
  return { y: 0, kind: 'table' };
}

/** Physics for all awake bits: gravity, support, walls, bit–bit separation (spatial hash). */
export function stepBitPhysics(world, bits, rdt) {
  const g = -9.81, n = bits.length;
  if (!n) return;
  const sub = 2, h = Math.min(rdt, 1 / 30) / sub;
  const cell = 0.01, hash = new Map();
  for (let s = 0; s < sub; s++) {
    hash.clear();
    for (const b of bits) {
      const key = ((b.pos[0] / cell) | 0) * 73856093 ^ ((b.pos[1] / cell) | 0) * 19349663 ^ ((b.pos[2] / cell) | 0) * 83492791;
      let arr = hash.get(key); if (!arr) hash.set(key, (arr = [])); arr.push(b);
    }
    for (const b of bits) {
      if (b.held) continue;
      const r = b.rad;
      if (b.sleep > 0.6 && !b.wake) continue;
      b.vel[1] += g * h;
      for (let a = 0; a < 3; a++) b.pos[a] += b.vel[a] * h;
      const sp = supportAt(world, b.pos[0], b.pos[2]);
      const floor = (sp.kind === 'pot' ? sp.y : sp.y) + b.half;
      if (b.pos[1] < floor) { b.pos[1] = floor; b.vel[1] = 0; b.vel[0] *= 0.6; b.vel[2] *= 0.6; }
      if (sp.wallR) {
        const dx = b.pos[0] - sp.cx, dz = b.pos[2] - sp.cz, d = Math.hypot(dx, dz), lim = sp.wallR - r;
        if (d > lim) { b.pos[0] = sp.cx + (dx / d) * lim; b.pos[2] = sp.cz + (dz / d) * lim; }
      }
      // neighbours
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) for (let oz = -1; oz <= 1; oz++) {
        const key = (((b.pos[0] / cell) | 0) + ox) * 73856093 ^ (((b.pos[1] / cell) | 0) + oy) * 19349663 ^ (((b.pos[2] / cell) | 0) + oz) * 83492791;
        const arr = hash.get(key); if (!arr) continue;
        for (const o of arr) {
          if (o === b) continue;
          const dx = b.pos[0] - o.pos[0], dy = b.pos[1] - o.pos[1], dz = b.pos[2] - o.pos[2];
          const rr = r + o.rad, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= rr * rr || d2 < 1e-12) continue;
          const d = Math.sqrt(d2), push = (rr - d) * 0.5;
          b.pos[0] += (dx / d) * push; b.pos[1] += (dy / d) * push * 0.6; b.pos[2] += (dz / d) * push;
          if (b.pos[1] < floor) b.pos[1] = floor;
        }
      }
      // walls again after separation, so piles can't be pushed over a pan or pot rim
      if (sp.wallR) {
        const dx = b.pos[0] - sp.cx, dz = b.pos[2] - sp.cz, d = Math.hypot(dx, dz), lim = sp.wallR - r;
        if (d > lim) { b.pos[0] = sp.cx + (dx / d) * lim; b.pos[2] = sp.cz + (dz / d) * lim; b.vel[0] *= -0.2; b.vel[2] *= -0.2; }
      }
      const sp2 = Math.hypot(b.vel[0], b.vel[1], b.vel[2]);
      b.sleep = sp2 < 0.02 ? b.sleep + h : 0;
      b.wake = false;
      b.support = sp.kind;
    }
  }
}

/** Create a bit from an aggregated part of a piece. */
export function makeBit(piece, part, dimsW, posW, quatW, batch) {
  const g = part.piece.grid;
  let ms = 0, mw = 0, mw0 = 0, Tsum = 0, mt = 0, brown = 0, char = 0, enz = 0, coat = 0, A = 0;
  const procs = {}, counts = new Float64Array(piece.mats.length);
  for (const name in g.proc) procs[name] = 0;
  for (let c = 0; c < g.N; c++) {
    if (!g.occ[c]) continue;
    const m = g.ms[c] + g.mw[c];
    ms += g.ms[c]; mw += g.mw[c]; mw0 += g.mw0[c]; Tsum += g.T[c] * m; mt += m;
    counts[g.mat[c]] += m;
    for (const name in g.proc) procs[name] += g.proc[name][c] * m;
  }
  for (const name in procs) procs[name] /= mt;
  for (let s = 0; s < g.nSkin; s++) { const a = g.skinArea[s]; A += a; brown += g.brown[s] * a; char += g.char[s] * a; enz += g.enz[s] * a; coat = Math.max(coat, g.coat[s]); mw += g.film[s]; }
  let mi = 0; counts.forEach((v, i) => { if (v > counts[mi]) mi = i; });
  // edge pieces are trimmed by the food's shape: shrink the box to the real volume
  const dims = dimsW.slice();
  const vReal = mt / piece.mats[mi].rho0, vBox = dims[0] * dims[1] * dims[2];
  if (vReal < vBox) { const f = Math.cbrt(vReal / vBox); for (let i = 0; i < 3; i++) dims[i] *= f; }
  // layered vegetables (onion) fall apart into thin curved scales: same volume, scale thickness
  if (piece.def.layer) {
    const t = piece.def.layer, V = dims[0] * dims[1] * dims[2];
    if (Math.min(...dims) > t * 1.3) { const ratio = dims[0] / dims[2]; const A = V / t; dims[2] = Math.sqrt(A / ratio); dims[0] = A / dims[2]; dims[1] = t; }
  }
  const rad = 0.5 * Math.cbrt(dims[0] * dims[1] * dims[2]) * 0.9;
  const b = new Bit({ foodId: piece.foodId, def: piece.def, mats: piece.mats, mi, dims, ms, mw, mw0, T: Tsum / mt, procs,
    brown: brown / A, char: char / A, enz: enz / A, coat, pos: posW.slice(), quat: quatW.slice(), batch, rad, half: Math.min(...dims) / 2, label: piece.label });
  b.sw0 = b.sw = mw * 0.08;
  return b;
}

export const bitProcSpecs = (mats) => mats.forEach((m) => { if (!m.procSpecs) m.procSpecs = resolveProcs(m.def.procs || []); });
export { qRot };
