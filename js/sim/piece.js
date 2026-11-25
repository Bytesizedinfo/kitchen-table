// A food piece: state grid + materials + world transform + what it rests on.
import { StateGrid, DIRS } from './grid.js';
import { Material } from './props.js';
import { MATERIALS, FOODS } from './foods.js';
import { resolveProcs } from './process.js';
import { heatStep, stableDt } from './heat.js';
import { moistureStep, juiceStep, dripStep } from './moisture.js';
import { processStep } from './process.js';
import { pv } from './params.js';
import { qRot, qConj } from './math.js';

const matCache = new Map();
export function getMaterial(id) {
  let m = matCache.get(id);
  if (m) return m;
  const def = MATERIALS[id];
  if (!def) throw new Error('unknown material ' + id);
  m = new Material(id, def);
  m.procSpecs = resolveProcs(def.procs || []);
  if (def.whc) def.whc = def.whc.map(([p, v]) => [p, typeof v === 'string' ? pv(v) : v]);
  matCache.set(id, m);
  return m;
}

let NEXT_ID = 1;

export class Piece {
  /** Build a fresh piece from a food definition. */
  static create(foodId, opts = {}) {
    const def = FOODS[foodId];
    const spec = def.build(opts);
    const mats = def.mats.map(getMaterial);
    const [Lx, Ly, Lz] = spec.dims, [dx, dy, dz] = spec.cell;
    const pad = 1;
    const nx = Math.ceil(Lx / dx) + 2 * pad, ny = Math.ceil(Ly / dy) + 2 * pad, nz = Math.ceil(Lz / dz) + 2 * pad;
    const origin = [-(nx * dx) / 2, -(ny * dy) / 2, -(nz * dz) / 2];
    const g = new StateGrid(nx, ny, nz, dx, dy, dz, origin);
    const V = g.cellVol(), p = [0, 0, 0];
    for (let c = 0; c < g.N; c++) {
      g.center(c, p);
      if (spec.sdf(p[0], p[1], p[2]) >= 0) continue;
      const mi = spec.mat(p[0], p[1], p[2]);
      const m = mats[mi];
      g.occ[c] = 1; g.mat[c] = mi; g.T[c] = spec.T0;
      const mass = V * m.rho0;
      g.ms[c] = mass * (1 - m.xw0);
      g.mw[c] = g.mw0[c] = mass * m.xw0;
    }
    for (const m of mats) for (const ps of m.procSpecs) if (!g.proc[ps.id]) g.addProc(ps.id, ps.init ?? 0);
    // sub-cell material fractions (rendering only): smooth, round boundaries such as a yolk or a pit
    if (mats.length > 1) {
      const fr = (g.frac = new Uint8Array(g.N * 4));
      const q = [0, 0, 0];
      for (let c = 0; c < g.N; c++) {
        g.center(c, q);
        // include empty neighbours of the surface too, so filtering at the edge is right
        const cnt = [0, 0, 0, 0];
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let d = -1; d <= 1; d++) cnt[Math.min(3, spec.mat(q[0] + a * g.dx / 3, q[1] + b * g.dy / 3, q[2] + d * g.dz / 3))]++;
        for (let i = 0; i < 4; i++) fr[c * 4 + i] = Math.round((cnt[i] / 27) * 255);
      }
    }
    if (def.liquidStart && g.proc.liq) g.proc.liq.fill(1); // e.g. warm jelly mix poured into a mould
    g.buildSkin();
    g.computeDist();
    g.buildMatCells(mats.length);
    const piece = new Piece(foodId, def, spec, mats, g);
    piece.mould = !!def.mould;
    piece.opts = opts;
    return piece;
  }

  constructor(foodId, def, spec, mats, grid) {
    this.id = NEXT_ID++;
    this.foodId = foodId; this.def = def; this.spec = spec; this.mats = mats; this.grid = grid;
    this.pos = [0, 0, 0]; this.quat = [0, 0, 0, 1];
    this.support = null; // { kind:'pan'|'pot'|'board'|'table'|'plate'|'hand', y, app }
    this.moisture = def.kind !== 'test';
    this.dtMax = stableDt(this);
    this.initMass = this.mass();
    this.coreMax = grid.T[grid.core];
    this.safeTimer = 0; this.safe = false;
    this.version = 0; // bumps when state changes (render upload)
    this.geomVersion = 0; // bumps when the shape changes (cut)
    this.capOf = null; // ids of cut faces etc. (render)
    this.parentMass = this.initMass;
    this.history = [];
    this.label = def.name;
    this.shell = def.kind === 'egg' ? (spec.nominalMass || 0.057) * (spec.shellFrac || 0) : 0;
    this.peeled = false;
    this.peelDepth = 0;
    this.splitDose = 0; this.skinSplit = false;
    this.sleepAcc = 0; this.calm = 0;
    this._bcKey = '';
  }

  // ---- geometry helpers ----
  toWorld(p, out = [0, 0, 0]) { qRot(this.quat, p, out); out[0] += this.pos[0]; out[1] += this.pos[1]; out[2] += this.pos[2]; return out; }
  toRest(p) { const q = [p[0] - this.pos[0], p[1] - this.pos[1], p[2] - this.pos[2]]; return qRot(qConj(this.quat), q); }

  /** Visit every exposed face: fn(s, d, worldCenter, worldNormal). */
  forFaces(fn) {
    const g = this.grid, cpos = [0, 0, 0], fc = [0, 0, 0], w = [0, 0, 0], n = [0, 0, 0];
    const half = [g.dx / 2, g.dy / 2, g.dz / 2];
    for (let s = 0; s < g.nSkin; s++) {
      const m = g.skinMask[s];
      g.center(g.skinCell[s], cpos);
      for (let d = 0; d < 6; d++) {
        if (!(m & (1 << d))) continue;
        const D = DIRS[d];
        fc[0] = cpos[0] + D[0] * half[0]; fc[1] = cpos[1] + D[1] * half[1]; fc[2] = cpos[2] + D[2] * half[2];
        this.toWorld(fc, w); qRot(this.quat, D, n);
        fn(s, d, w, n);
      }
    }
  }
  /** Lowest world y of the piece (face centres). */
  minY() { let y = 1e9; this.forFaces((s, d, w) => { if (w[1] < y) y = w[1]; }); return y; }
  /** World-space bounding box from face centres. */
  bounds() {
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    this.forFaces((s, d, w) => { for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], w[a]); hi[a] = Math.max(hi[a], w[a]); } });
    return { lo, hi };
  }
  /** Drop vertically so the lowest point sits on y. */
  restOn(y) { this.pos[1] += y - this.minY(); this._bcKey = ''; }

  /** Classify every exposed face by what it touches (depends on transform + support). */
  classify(world) {
    const sup = this.support || { kind: 'table' };
    const key = this.pos.join(',') + '|' + this.quat.join(',') + '|' + sup.kind + '|' + (sup.app ? sup.app.level?.() ?? '' : '');
    if (key === this._bcKey) return;
    this._bcKey = key;
    const g = this.grid;
    g.Acon.fill(0); g.Aair.fill(0); g.Awat.fill(0); g.Ains.fill(0); g.Aoil.fill(0);
    const area = [g.dy * g.dz, g.dy * g.dz, g.dx * g.dz, g.dx * g.dz, g.dx * g.dy, g.dx * g.dy];
    const minY = this.minY();
    const tol = 0.6 * Math.min(g.dx, g.dy, g.dz) + 1e-4;
    const wl = sup.kind === 'pot' && sup.app ? sup.app.level() : -1e9;
    const bottomKind = sup.kind === 'pan' ? 'con' : sup.kind === 'pot' ? 'wat' : sup.kind === 'hand' ? 'air' : 'ins';
    this.forFaces((s, d, w, n) => {
      const A = area[d];
      if (sup.kind === 'pot' && w[1] < wl) { g.Awat[s] += A; return; }
      if (n[1] < -0.6 && w[1] < minY + tol && sup.kind !== 'hand') {
        if (bottomKind === 'con') g.Acon[s] += A; else if (bottomKind === 'wat') g.Awat[s] += A; else g.Ains[s] += A;
        return;
      }
      g.Aair[s] += A;
    });
  }

  /** One simulation tick (dt s) in environment env. Returns drip mass (kg). */
  tick(env, dt, out) {
    const n = Math.max(1, Math.ceil(dt / this.dtMax));
    const h = dt / n;
    let drip = 0;
    // heat/evaporation rates are accumulated per substep and averaged over the tick
    const acc = { Qcon: 0, Qair: 0, Qwat: 0, Qins: 0, Qoil: 0, evap: 0, latent: 0, evapSens: 0, boilInt: 0 };
    for (let i = 0; i < n; i++) {
      heatStep(this, env, h, acc);
      processStep(this, h);
    }
    if (this.moisture && this.transport !== false) {
      // slow processes run on a coarser clock (their time scales are minutes)
      this._mAcc = (this._mAcc || 0) + dt;
      this._jAcc = (this._jAcc || 0) + dt;
      if (this._jAcc >= 2) { juiceStep(this, this._jAcc); this._jAcc = 0; }
      if (this._mAcc >= 4) { moistureStep(this, this._mAcc); this._mAcc = 0; }
      drip += dripStep(this, true);
    }
    for (const k in acc) out[k] = (out[k] || 0) + acc[k] / n;
    this.updateTrackers(dt);
    this.version++;
    return drip;
  }

  // ---- readouts ----
  coreT() { return this.grid.T[this.grid.core]; }
  minT() { const g = this.grid; let m = 1e9; for (let c = 0; c < g.N; c++) if (g.occ[c] && g.T[c] < m) m = g.T[c]; return m; }
  maxT() { const g = this.grid; let m = -1e9; for (let c = 0; c < g.N; c++) if (g.occ[c] && g.T[c] > m) m = g.T[c]; return m; }
  surfaceT() { const g = this.grid; let a = 0, s = 0; for (let i = 0; i < g.nSkin; i++) { a += g.skinArea[i]; s += g.skinArea[i] * g.Ts[i]; } return s / a; }
  mass() {
    const g = this.grid; let m = 0;
    for (let c = 0; c < g.N; c++) if (g.occ[c]) m += g.ms[c] + g.mw[c];
    for (let s = 0; s < g.nSkin; s++) m += g.film[s];
    return m;
  }
  lossFrac() { return 1 - this.mass() / this.initMass; }
  /** Area-weighted mean of a skin array, optionally only faces that face a given world direction. */
  skinMean(arr) { const g = this.grid; let a = 0, s = 0; for (let i = 0; i < g.nSkin; i++) { a += g.skinArea[i]; s += g.skinArea[i] * arr[i]; } return s / a; }
  /** Mean of a process over cells of a material. */
  procMean(id, mi = null) {
    const g = this.grid, arr = g.proc[id]; if (!arr) return NaN;
    let n = 0, s = 0;
    for (let c = 0; c < g.N; c++) if (g.occ[c] && (mi == null || g.mat[c] === mi)) { n++; s += arr[c]; }
    return n ? s / n : NaN;
  }
  /** Chocolate: melting destroys the temper; seeding at 26–27 °C then working at 30–32 °C restores it. */
  trackTemper(dt) {
    const g = this.grid, liq = g.proc.liq;
    let lmax = 0, lsum = 0, n = 0, Ts = 0;
    for (let c = 0; c < g.N; c++) if (g.occ[c]) { const l = liq[c]; if (l > lmax) lmax = l; lsum += l; Ts += g.T[c]; n++; }
    const Tm = Ts / n, lm = lsum / n;
    if (!this.temper) this.temper = 'tempered';
    const st = this.temper;
    if (lmax > 0.9 && Tm > 33) this.temper = 'melted';
    else if (st === 'melted' && Tm <= 27.5) this.temper = 'seeded';
    else if (st === 'seeded' && Tm >= 29.5 && Tm <= 32.5) this.temper = 'tempered';
    // untempered chocolate that has set shows bloom within minutes
    const target = this.temper !== 'tempered' && lm < 0.3 ? 1 : 0;
    this.bloom = (this.bloom || 0) + (target - (this.bloom || 0)) * Math.min(1, dt / 600);
  }
  /** Marshmallow: trapped air expands with temperature (ideal gas); after it has gone gooey hot it deflates on cooling. */
  trackPuff() {
    const m = this.mats[0], phi = this.puffPhi ?? (this.puffPhi = m.def.porosity ? pv(m.def.porosity) : 0);
    if (!phi) return;
    const T0 = this.puffT0 ?? (this.puffT0 = this.spec.T0 + 273.15);
    const Tm = this.grid.T.reduce((a, t, c) => (this.grid.occ[c] ? a + t : a), 0) / this.grid.occupiedCount() + 273.15;
    if (this.procMean('liq') > 0.8) this.deflate = 0.3; // foam walls have gone soft: air escapes once it cools
    const air = phi * (1 - (this.deflate || 0) * (Tm < T0 + 20 ? 1 : 0));
    this.puff = Math.cbrt((1 - phi) + air * (Tm / T0));
  }
  updateTrackers(dt) {
    if (this.mats[0].def.chocolate) this.trackTemper(dt);
    if (this.mats[0].def.puffs) this.trackPuff();
    // tomato-style skins split after a while in boiling water
    if (this.def.skinSplit && !this.skinSplit) {
      // time in water at (nearly) boiling counts, as in the blanching guidance
      if (this.support && this.support.kind === 'pot' && this.support.app && this.support.app.T > 95) this.splitDose += dt;
      if (this.splitDose >= pv(this.def.skinSplit)) this.skinSplit = true;
    }
    const core = this.coreT();
    if (core > this.coreMax) this.coreMax = core;
    const kind = this.def.safe;
    if (kind === 'beef') {
      const t = this.minT();
      if (t >= pv('safe_beef')) this.safeTimer += dt; else if (!this.safe) this.safeTimer = 0;
      if (this.safeTimer >= pv('safe_beef_rest')) this.safe = true;
    } else if (kind === 'poultry') {
      if (this.minT() >= pv('safe_poultry')) this.safe = true;
    } else if (kind === 'egg') {
      const white = this.procMean('ovotransferrin', 0), yolk = this.procMean('yolkSet', 1);
      if (white > 0.95 && yolk > 0.9) this.safe = true;
    }
  }
  doneness() {
    const k = this.def.kind;
    if (k === 'meat') {
      const t = this.coreMax;
      if (t < pv('rare_lo')) return 'raw / blue';
      if (t < pv('mr_lo')) return 'rare';
      if (t < pv('med_lo')) return 'medium-rare';
      if (t < pv('mw_lo')) return 'medium';
      if (t < pv('wd_lo')) return 'medium-well';
      return 'well done';
    }
    if (k === 'egg') {
      const w1 = this.procMean('ovotransferrin', 0), w2 = this.procMean('ovalbumin', 0);
      const y1 = this.procMean('yolkThick', 1), y2 = this.procMean('yolkSet', 1);
      if (w1 < 0.3) return 'raw';
      if (w1 < 0.85) return 'white still runny';
      const white = w2 > 0.5 ? 'firm white' : 'tender white';
      const yolk = y2 > 0.85 ? 'hard yolk' : y1 > 0.6 || y2 > 0.35 ? 'jammy yolk' : 'runny yolk';
      return `${white}, ${yolk}`;
    }
    if (k === 'veg') {
      const firm = this.procMean('firm');
      if (firm > 0.9) return 'raw-firm';
      if (firm > 0.5) return 'crisp-tender';
      if (firm > 0.15) return 'tender';
      return 'very soft';
    }
    return '';
  }
}
