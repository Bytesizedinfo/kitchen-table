// Analytic signed-distance shapes for foods (metres, negative inside). Approximate SDFs are fine:
// they feed both the state grid (cell inside test) and the surface-nets mesh.

export const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);

/** Ellipsoid SDF approximation (Quilez). r = [rx, ry, rz]. */
export function ellipsoid(x, y, z, rx, ry, rz) {
  const k0 = len3(x / rx, y / ry, z / rz);
  const k1 = len3(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return k1 > 1e-12 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
}

/** Rounded slab with an organic 2D outline in xz (steak). */
export function steakSDF(hx, hy, hz, seed = 1) {
  const r = Math.min(hx, hz) * 0.55; // big corner radius → organic oval-ish rectangle
  const edge = hy * 0.35; // rounded top/bottom edges
  return (x, y, z) => {
    const th = Math.atan2(z / hz, x / hx);
    const wob = 0.0035 * Math.sin(3 * th + seed) + 0.0025 * Math.sin(5 * th + 2 * seed) + 0.0015 * Math.sin(9 * th + 0.7 * seed);
    const qx = Math.abs(x) - (hx - r), qz = Math.abs(z) - (hz - r);
    const d2 = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r - wob;
    // extrude with rounded edges
    const wx = d2 + edge, wy = Math.abs(y) - hy + edge;
    return Math.min(Math.max(wx, wy), 0) + Math.hypot(Math.max(wx, 0), Math.max(wy, 0)) - edge;
  };
}

/** Egg: ellipsoid lying along x, blunt end toward +x. L length, B breadth (m). */
export function eggSDF(L, B) {
  const a = L / 2, b = B / 2;
  return (x, y, z) => {
    const s = 1 + 0.085 * Math.max(-1, Math.min(1, x / a)); // wider at the blunt (+x) end
    return ellipsoid(x, y / s, z / s, a, b, b) * Math.min(1, s);
  };
}

/** Lumpy ellipsoid (potato) with a few shallow eyes. */
export function potatoSDF(rx, ry, rz, noise) {
  const eyes = [];
  if (noise) for (let i = 0; i < 9; i++) {
    const u = noise.n3(i * 1.7, 0.3, 0.9) * Math.PI, v = (noise.n3(0.2, i * 2.3, 0.4) + 1) * Math.PI;
    eyes.push([rx * Math.cos(v) * Math.cos(u) * 0.98, ry * Math.sin(u) * 0.98, rz * Math.sin(v) * Math.cos(u) * 0.98]);
  }
  return (x, y, z) => {
    // slightly kidney-shaped: one side flatter
    const bend = 0.12 * (x / rx) * (x / rx) * rz;
    const base = ellipsoid(x, y, z - bend, rx, ry, rz);
    if (!noise) return base;
    let n = noise.fbm(x * 22, y * 22, z * 22, 3) * 0.0045 + noise.n3(x * 90, y * 90, z * 90) * 0.0005;
    for (const e of eyes) { const d2 = (x - e[0]) ** 2 + (y - e[1]) ** 2 + (z - e[2]) ** 2; n += 0.0016 * Math.exp(-d2 / 1.2e-5); }
    return base + n;
  };
}

/** Sphere (tests). */
export const sphereSDF = (R) => (x, y, z) => len3(x, y, z) - R;
/** Box (tests). */
export const boxSDF = (hx, hy, hz) => (x, y, z) => {
  const qx = Math.abs(x) - hx, qy = Math.abs(y) - hy, qz = Math.abs(z) - hz;
  return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0);
};
