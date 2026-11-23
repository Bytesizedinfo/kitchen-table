// Heat conduction + surface skin energy balance (convection, contact, radiation, evaporation),
// browning and charring of the skin. Pure; operates on a Piece (grid + materials).
//
// Scheme: x and z conduction explicit; y (the thin axis of slabs) implicit per column (Thomas
// algorithm); skin flux linearised point-implicitly. Stable at the 1 s tick for 1 mm cells.
import { pv } from './params.js';
import { T_MIN, NT, NX } from './props.js';

const P_ATM = 101325;
const CP_AIR = 1006;

/** Saturation vapour pressure of water (Pa), Antoine equation (1–100 °C; extrapolated outside). */
export function psat(T) {
  return 133.322 * Math.pow(10, 8.07131 - 1730.63 / (233.426 + T));
}
export function Ysat(T) {
  const p = Math.min(psat(T), 0.995 * P_ATM);
  return (0.622 * p) / (P_ATM - p);
}
export function Yair(T, RH) {
  const p = RH * psat(T);
  return (0.622 * p) / (P_ATM - p);
}
/** Vapour mass fraction in air at saturation / at relative humidity RH. */
export function wsat(T) { const p = Math.min(psat(T), 0.999 * P_ATM); return (0.622 * p) / (P_ATM - 0.378 * p); }
export function wair(T, RH) { const p = RH * psat(T); return (0.622 * p) / (P_ATM - 0.378 * p); }
/** Spalding mass-transfer driving force ln(1+B): evaporation = (h·A/cp_air)·drive. Finite below 100 °C. */
export function evapDrive(Ts, winf) {
  const ws = wsat(Ts);
  if (ws <= winf) return 0;
  return Math.log(1 + (ws - winf) / Math.max(1e-6, 1 - ws));
}

function scratch(g) {
  if (!g._C || g._C.length !== g.N) {
    g._C = new Float32Array(g.N);
    g._k = new Float32Array(g.N);
    g._Q = new Float32Array(g.N);
    g._G = new Float32Array(g.N); // implicit skin conductance on the diagonal
    const n = g.ny + 2;
    g._ta = new Float64Array(n); g._tb = new Float64Array(n); g._tc = new Float64Array(n); g._td = new Float64Array(n);
  }
}

/**
 * One heat step of dt seconds.
 * env: { con:{h,hDry?,T}, air:{h,T,Trad,eps,w}, wat:{h,T}, ins:{h,T}, oil:{h,T} }   (w = vapour mass fraction)
 * out (accumulated rates): { Qcon, Qair, Qwat, Qins, Qoil, evap, latent, boilInt }  (W into food, kg/s)
 */
export function heatStep(piece, env, dt, out) {
  const g = piece.grid, mats = piece.mats;
  scratch(g);
  const { nx, ny, nz, occ, mat, T, ms, mw, N } = g;
  const C = g._C, kc = g._k, Q = g._Q, GI = g._G;
  // 1. properties (inline table lookups)
  for (let c = 0; c < N; c++) {
    if (!occ[c]) continue;
    const m = mats[mat[c]];
    let ti = (T[c] - T_MIN + 0.5) | 0; ti = ti < 0 ? 0 : ti >= NT ? NT - 1 : ti;
    const s = g.skinIdx[c];
    const water = s >= 0 ? mw[c] + g.film[s] : mw[c];
    C[c] = ms[c] * m.cpS[ti] + water * m.cpW[ti];
    let xj = ((mw[c] / (ms[c] + mw[c] + 1e-12)) * (NX - 1) + 0.5) | 0; xj = xj < 0 ? 0 : xj >= NX ? NX - 1 : xj;
    kc[c] = m.kTab[xj * NT + ti];
    Q[c] = 0; GI[c] = 0;
  }
  // 2. explicit x/z conduction (each pair once)
  const ax = (g.dy * g.dz) / g.dx, az = (g.dx * g.dy) / g.dz, ay = (g.dx * g.dz) / g.dy;
  const sz = nx * ny;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) {
    let c = nx * (j + ny * k);
    for (let i = 0; i < nx; i++, c++) {
      if (!occ[c]) continue;
      const Tc = T[c], k1 = kc[c];
      if (i + 1 < nx && occ[c + 1]) {
        const k2 = kc[c + 1], f = ((2 * k1 * k2) / (k1 + k2)) * ax * (T[c + 1] - Tc);
        Q[c] += f; Q[c + 1] -= f;
      }
      if (k + 1 < nz && occ[c + sz]) {
        const k2 = kc[c + sz], f = ((2 * k1 * k2) / (k1 + k2)) * az * (T[c + sz] - Tc);
        Q[c] += f; Q[c + sz] -= f;
      }
    }
  }
  // 3. skin energy balance (adds explicit flux to Q and implicit conductance to GI)
  skinStep(piece, env, dt, out);
  // 4. implicit solve along y for each column (contiguous occupied runs)
  const a = g._ta, b = g._tb, cc = g._tc, d = g._td;
  let dTmax = 0;
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    let j = 0;
    while (j < ny) {
      if (!occ[i + nx * (j + ny * k)]) { j++; continue; }
      let j1 = j;
      while (j1 < ny && occ[i + nx * (j1 + ny * k)]) j1++;
      const n = j1 - j;
      for (let r = 0; r < n; r++) {
        const c = i + nx * (j + r + ny * k);
        const Cd = C[c] / dt;
        let gd = 0, gu = 0;
        if (r > 0) { const k2 = kc[c - nx]; gd = ((2 * kc[c] * k2) / (kc[c] + k2)) * ay; }
        if (r < n - 1) { const k2 = kc[c + nx]; gu = ((2 * kc[c] * k2) / (kc[c] + k2)) * ay; }
        a[r] = -gd; cc[r] = -gu;
        b[r] = Cd + gd + gu + GI[c];
        d[r] = Cd * T[c] + Q[c] + GI[c] * T[c];
      }
      for (let r = 1; r < n; r++) {
        const w = a[r] / b[r - 1];
        b[r] -= w * cc[r - 1];
        d[r] -= w * d[r - 1];
      }
      let x = d[n - 1] / b[n - 1];
      let ci = i + nx * (j1 - 1 + ny * k), dd0 = x - T[ci]; if (dd0 < 0) dd0 = -dd0; if (dd0 > dTmax) dTmax = dd0;
      T[ci] = x;
      for (let r = n - 2; r >= 0; r--) {
        x = (d[r] - cc[r] * x) / b[r];
        ci = i + nx * (j + r + ny * k); let dd = x - T[ci]; if (dd < 0) dd = -dd; if (dd > dTmax) dTmax = dd;
        T[ci] = x;
      }
      j = j1;
    }
  }
  g._dTmax = dTmax;
  // 4b. the implicit part of the skin flux, −geff·(T'−T), came from the surroundings: book it by class
  {
    const sw = g._sw, T0 = g._T0;
    let dc = 0, da = 0, dw = 0, di = 0, dl = 0;
    for (let s = 0; s < g.nSkin; s++) {
      const c = g.skinCell[s];
      const delta = -GI[c] * (T[c] - T0[s]);
      if (delta === 0) continue;
      const o = 5 * s, H = sw[o] + sw[o + 1] + sw[o + 2] + sw[o + 3] + sw[o + 4];
      if (H <= 0) continue;
      const f = delta / H;
      dc += f * sw[o]; da += f * sw[o + 1]; dw += f * sw[o + 2]; di += f * sw[o + 3]; dl += f * sw[o + 4];
    }
    out.Qcon += dc; out.Qair += da; out.Qwat += dw; out.Qins += di; out.Qoil += dl;
  }
  // 5. enthalpy cap: a cell still holding water cannot pass the boiling point; the excess heat
  //    boils water off (vapour escapes through the food). A little bound water stays.
  if (piece.moisture) {
    const Tb = pv('Tboil'), Lv = pv('Lv');
    let boil = 0;
    for (let c = 0; c < N; c++) {
      if (!occ[c] || T[c] <= Tb) continue;
      const avail = mw[c] - 0.04 * ms[c];
      if (avail <= 0) continue;
      const excess = (T[c] - Tb) * C[c];
      const m = Math.min(avail, excess / Lv);
      mw[c] -= m;
      T[c] = Tb + (excess - m * Lv) / C[c];
      const si = g.skinIdx[c];
      if (si >= 0 && g.skw[si] > mw[c]) g.skw[si] = mw[c];
      boil += m;
    }
    out.latent += (boil * Lv) / dt; out.evap += boil / dt; out.boilInt = (out.boilInt || 0) + boil / dt;
  }
}

function skinStep(piece, env, dt, out) {
  const g = piece.grid;
  const { T, mw, ms } = g;
  const kc = g._k, Q = g._Q, GI = g._G;
  const sig = pv('sigma'), Lv = pv('Lv');
  const dryCrit = pv('dry_crit');
  const con = env.con, air = env.air, wat = env.wat, ins = env.ins, oil = env.oil;
  const TradK = air.Trad + 273.15, TradK4 = TradK * TradK * TradK * TradK;
  const winf = air.w;
  const bRate = pv('maillard_rate140'), bEa = pv('maillard_Ea') / pv('Rgas'), bT0 = 1 / (pv('maillard_T0') + 273.15);
  const cRate = pv('char_rate200'), cEa = pv('char_Ea') / pv('Rgas'), cT0 = 1 / (pv('char_T0') + 273.15);
  const hDry = con.hDry;
  const moist = piece.moisture;
  const enzR = pv('enz_rate'), enzW = pv('enz_water'), coatF = [1, pv('enz_lemon'), pv('enz_ascorbic')];
  const ppoArr = g.proc.ppo;
  let sQcon = 0, sQair = 0, sQwat = 0, sQins = 0, sQoil = 0, sLat = 0, sEv = 0;
  if (!g._sw || g._sw.length !== 5 * g.nSkin) { g._sw = new Float64Array(5 * g.nSkin); g._T0 = new Float64Array(g.nSkin); }
  for (let s = 0; s < g.nSkin; s++) {
    const c = g.skinCell[s];
    const Tc = T[c];
    const Gc = kc[c] * g.skinG[s];
    const Acon = g.Acon[s], Aair = g.Aair[s], Awat = g.Awat[s], Ains = g.Ains[s], Aoil = g.Aoil[s];
    // skin moisture state
    const skinDry = ms[c] * g.skinFrac[s];
    const X0 = g.skw0[s] / (skinDry + 1e-15);
    const ratio = X0 > 0 ? g.skw[s] / (skinDry + 1e-15) / X0 : 0;
    const film = g.film[s];
    let wetRatio = film > 1e-9 ? 1 : ratio / dryCrit;
    wetRatio = wetRatio < 0 ? 0 : wetRatio > 1 ? 1 : wetRatio;
    // contact conductance peaks while the surface is wet and falls as it dries (Wichchukit et al. 2001)
    const hc = hDry != null ? hDry + (con.h - hDry) * wetRatio : con.h;
    const H = hc * Acon + air.h * Aair + wat.h * Awat + ins.h * Ains + oil.h * Aoil;
    const HT = hc * Acon * con.T + air.h * Aair * air.T + wat.h * Awat * wat.T + ins.h * Ains * ins.T + oil.h * Aoil * oil.T;
    const rA = air.eps * sig * Aair;
    const submerged = Awat > 0;
    const psi = moist && !submerged ? wetRatio : 0;
    const dryness = submerged ? 0 : 1 - wetRatio;
    const hm = (air.h * Aair) / CP_AIR;
    let Ts = g.Ts[s], E = 0;
    const availW = film + g.skw[s];
    let geff; // d(−qs)/dTc for the implicit diagonal
    const TK100 = 373.15, f100 = Gc * (Tc - 100) + HT - H * 100 + rA * (TradK4 - TK100 * TK100 * TK100 * TK100);
    if (psi > 0 && f100 > 0) {
      // surface water boils: pinned at 100 °C; a partly dry skin passes part of the heat inward
      E = (psi * f100) / Lv;
      if (E * dt > availW) E = availW / dt;
      const target = Lv * E;
      Ts = 100;
      if (f100 - target > 0) {
        for (let it = 0; it < 8; it++) {
          const tk = Ts + 273.15, tk3 = tk * tk * tk;
          const f = Gc * (Tc - Ts) + HT - H * Ts + rA * (TradK4 - tk3 * tk) - target;
          const st = f / (Gc + H + 4 * rA * tk3);
          Ts += st;
          if (st < 0.01 && st > -0.01) break;
        }
        if (Ts < 100) Ts = 100;
      }
      geff = Gc * ((1 - psi) * (H / (Gc + H)) + psi);
    } else if (psi > 0 && hm > 0) {
      // wet, below boiling: evaporative (wet-bulb-like) cooling. Safeguarded Newton.
      let lo = Math.min(Tc, air.T, Ts) - 60, hi = 99.999;
      const k1 = Lv * psi * hm;
      if (Ts >= hi) Ts = hi - 0.05;
      if (Ts <= lo) Ts = lo + 0.05;
      for (let it = 0; it < 12; it++) {
        const tk = Ts + 273.15, tk3 = tk * tk * tk;
        const dr = evapDrive(Ts, winf);
        const fv = Gc * (Tc - Ts) + HT - H * Ts + rA * (TradK4 - tk3 * tk) - k1 * dr;
        if (fv > 0) lo = Ts; else hi = Ts;
        const dd = (evapDrive(Ts + 0.02, winf) - dr) / 0.02;
        const der = -(Gc + H + 4 * rA * tk3 + k1 * dd);
        let nt = Ts - fv / der;
        if (!(nt > lo && nt < hi)) nt = 0.5 * (lo + hi);
        const ch = nt - Ts;
        Ts = nt;
        if (ch < 0.005 && ch > -0.005) break;
      }
      E = psi * hm * evapDrive(Ts, winf);
      if (E * dt > availW) {
        E = availW / dt;
        const target = Lv * E;
        for (let it = 0; it < 8; it++) { const tk = Ts + 273.15, tk3 = tk * tk * tk; const fv = Gc * (Tc - Ts) + HT - H * Ts + rA * (TradK4 - tk3 * tk) - target; const st = fv / (Gc + H + 4 * rA * tk3); Ts += st; if (st < 0.01 && st > -0.01) break; }
      }
      const Hp = H + 4 * rA * Math.pow(Ts + 273.15, 3) + Lv * psi * hm * 0.05;
      geff = (Gc * Hp) / (Gc + Hp);
    } else {
      // dry surface
      Ts = (Gc * Tc + HT) / (Gc + H + 1e-12);
      for (let it = 0; it < 6; it++) {
        const tk = Ts + 273.15, tk3 = tk * tk * tk;
        const st = (Gc * (Tc - Ts) + HT - H * Ts + rA * (TradK4 - tk3 * tk)) / (Gc + H + 4 * rA * tk3);
        Ts += st;
        if (st < 0.01 && st > -0.01) break;
      }
      const Hp = H + 4 * rA * Math.pow(Ts + 273.15, 3);
      geff = (Gc * Hp) / (Gc + Hp);
    }
    g.Ts[s] = Ts;
    // heat flows by class (into food positive)
    const tk = Ts + 273.15;
    const qcon = hc * Acon * (con.T - Ts), qair = air.h * Aair * (air.T - Ts) + rA * (TradK4 - tk * tk * tk * tk);
    const qwat = wat.h * Awat * (wat.T - Ts), qins = ins.h * Ains * (ins.T - Ts), qoil = oil.h * Aoil * (oil.T - Ts);
    const qs = qcon + qair + qwat + qins + qoil - Lv * E;
    // linearised point-implicit: Q(T') ≈ qs − geff (T' − Tc)
    Q[c] += qs;
    GI[c] += geff;
    const sw = g._sw;
    sw[5 * s] = hc * Acon; sw[5 * s + 1] = air.h * Aair + 4 * rA * tk * tk * tk; sw[5 * s + 2] = wat.h * Awat; sw[5 * s + 3] = ins.h * Ains; sw[5 * s + 4] = oil.h * Aoil;
    g._T0[s] = Tc;
    sQcon += qcon; sQair += qair; sQwat += qwat; sQins += qins; sQoil += qoil; sLat += Lv * E; sEv += E;
    // remove evaporated water: film first, then skin water (part of the cell water)
    g.evap[s] = E;
    let m = E * dt;
    if (m > 0) {
      const f = film < m ? film : m; g.film[s] = film - f; m -= f;
      if (m > 0) { const w = g.skw[s] < m ? g.skw[s] : m; g.skw[s] -= w; mw[c] -= w; }
    }
    // enzymatic browning (PPO) on exposed flesh: needs oxygen and active enzyme
    const mdef = piece.mats[g.mat[c]].def;
    if (mdef.enz && g.cut[s]) {
      const act = ppoArr ? ppoArr[c] : 1;
      const tf = Math.pow(2, (Math.min(Ts, 40) - 22) / 10);
      g.enz[s] += dt * enzR * mdef.enz * act * tf * coatF[g.coat[s]] * (submerged ? enzW : 1);
    }
    // browning (Maillard + caramelisation of sugars) and charring, gated by surface dryness
    if (dryness > 0 && Ts > 90) {
      const iT = 1 / tk;
      const nb = g.brown[s] + dt * dryness * (bRate * Math.exp(-bEa * (iT - bT0)) + (mdef.sugars ? caramelRate(Ts, mdef.sugars) : 0));
      g.brown[s] = nb > 10 ? 10 : nb;
      if (Ts > 150) { const nc = g.char[s] + dt * dryness * cRate * Math.exp(-cEa * (iT - cT0)); g.char[s] = nc > 10 ? 10 : nc; }
    }
  }
  out.Qcon += sQcon; out.Qair += sQair; out.Qwat += sQwat; out.Qins += sQins; out.Qoil += sQoil; out.latent += sLat; out.evap += sEv;
}

/** Caramelisation browning rate (1/s) at surface temperature Ts for sugars {fru, glu, suc} in g/100 g. */
export function caramelRate(Ts, sugars) {
  const k = pv('car_k');
  return k * (((sugars.fru || 0) / 5) * Math.max(0, Ts - pv('car_fru')) + ((sugars.glu || 0) / 5) * Math.max(0, Ts - pv('car_glu')) + ((sugars.suc || 0) / 5) * Math.max(0, Ts - pv('car_suc'))) / 10;
}

/** Largest stable time step (s): explicit only in x and z now (y and skin are implicit). */
export function stableDt(piece) {
  const g = piece.grid;
  let kmax = 0, rcMin = 1e12;
  for (const m of piece.mats) {
    const r = m.raw(20);
    kmax = Math.max(kmax, r.k * 1.15);
    rcMin = Math.min(rcMin, r.rho * r.cp * 0.6); // drying lowers heat capacity
  }
  const sum = 2 * kmax * (1 / g.dx ** 2 + 1 / g.dz ** 2);
  return (0.8 * rcMin) / sum;
}
