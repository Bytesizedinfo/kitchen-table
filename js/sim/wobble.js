// Jelly wobble: one damped shear spring per piece. Fundamental shear mode of a block on a fixed base:
// f = (1/4H)·√(G/ρ), with shear modulus G = E/3 and Young's modulus E = 1.6 kPa per % gelatin
// (arXiv 2308.10662: 6.5/10.7/17 kPa at 4/6/8 %). Melting softens it (G scales with the set fraction). Pure.
import { pv } from './params.js';

export function wobbleProps(p) {
  const m = p.mats[0], gel = m.def.gelatin ? pv(m.def.gelatin) : 0;
  const liq = p.grid.proc.liq ? p.procMean('liq') : 0;
  const E = pv('gel_E_per_pct') * gel * Math.max(0, 1 - liq);
  const b = p.bounds();
  const H = Math.max(0.004, b.hi[1] - b.lo[1]);
  const G = E / 3, rho = m.rho0;
  const f = G > 0 ? (1 / (4 * H)) * Math.sqrt(G / rho) : 0;
  return { f, H, E, G };
}

/** Advance the wobble by real time dt with the piece's horizontal acceleration (ax, az). */
export function stepWobble(p, dt, ax = 0, az = 0) {
  const w = p.wob || (p.wob = { x: 0, z: 0, vx: 0, vz: 0, f: 0, H: 0.05 });
  if (p._wobT === undefined || (p._wobT += dt) > 0.5) { const pr = wobbleProps(p); w.f = pr.f; w.H = pr.H; p._wobT = 0; }
  if (!(w.f > 0)) { w.x = w.z = w.vx = w.vz = 0; return w; }
  const om = 2 * Math.PI * w.f, ze = pv('wobble_zeta');
  const n = Math.max(1, Math.ceil(dt * w.f * 20)), h = dt / n;
  for (let i = 0; i < n; i++) {
    // base acceleration drives the top the other way (inertia)
    w.vx += h * (-om * om * w.x - 2 * ze * om * w.vx - ax);
    w.vz += h * (-om * om * w.z - 2 * ze * om * w.vz - az);
    w.x += h * w.vx; w.z += h * w.vz;
  }
  // a jelly can't lean more than about a third of its height
  const lim = 0.35 * w.H, d = Math.hypot(w.x, w.z);
  if (d > lim) { w.x *= lim / d; w.z *= lim / d; }
  return w;
}

/** A poke with a finger: horizontal impulse (m/s at the top). */
export function pokeWobble(p, dirX, dirZ, speed = 0.12) {
  const w = p.wob || (p.wob = { x: 0, z: 0, vx: 0, vz: 0, f: 0, H: 0.05 });
  const l = Math.hypot(dirX, dirZ) || 1;
  w.vx += (dirX / l) * speed; w.vz += (dirZ / l) * speed;
}
