// Naive surface nets: a watertight quad mesh from a signed distance function. Pure (no three.js).
// sdf(x,y,z) < 0 inside. Returns { pos: Float32Array, nrm: Float32Array, idx: Uint32Array }.
export function surfaceNets(sdf, lo, hi, h) {
  const nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
  const val = new Float32Array(nx * ny * nz);
  const id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let v = sdf(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);
    if (v === 0) v = 1e-9;
    // force outside at the border so the surface is closed
    if (i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) v = Math.max(v, 1e-6);
    val[id(i, j, k)] = v;
  }
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const vtx = new Int32Array(cx * cy * cz).fill(-1);
  const cid = (i, j, k) => i + cx * (j + cy * k);
  const pos = [];
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let neg = 0;
    for (let c = 0; c < 8; c++) { const o = corner[c]; cv[c] = val[id(i + o[0], j + o[1], k + o[2])]; if (cv[c] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      const va = cv[a], vb = cv[b];
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb);
      const A = corner[a], B = corner[b];
      sx += A[0] + (B[0] - A[0]) * t; sy += A[1] + (B[1] - A[1]) * t; sz += A[2] + (B[2] - A[2]) * t; n++;
    }
    vtx[cid(i, j, k)] = pos.length / 3;
    pos.push(lo[0] + (i + sx / n) * h, lo[1] + (j + sy / n) * h, lo[2] + (k + sz / n) * h);
  }
  const idx = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
  };
  for (let k = 1; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 0; i < cx; i++) {
    // edge along x between sample (i,j,k) and (i+1,j,k)
    const a = val[id(i, j, k)], b = val[id(i + 1, j, k)];
    if ((a < 0) === (b < 0)) continue;
    quad(vtx[cid(i, j - 1, k - 1)], vtx[cid(i, j, k - 1)], vtx[cid(i, j, k)], vtx[cid(i, j - 1, k)], a < 0);
  }
  for (let k = 1; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 1; i < cx; i++) {
    const a = val[id(i, j, k)], b = val[id(i, j + 1, k)];
    if ((a < 0) === (b < 0)) continue;
    quad(vtx[cid(i - 1, j, k - 1)], vtx[cid(i - 1, j, k)], vtx[cid(i, j, k)], vtx[cid(i, j, k - 1)], a < 0);
  }
  for (let k = 0; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 1; i < cx; i++) {
    const a = val[id(i, j, k)], b = val[id(i, j, k + 1)];
    if ((a < 0) === (b < 0)) continue;
    quad(vtx[cid(i - 1, j - 1, k)], vtx[cid(i, j - 1, k)], vtx[cid(i, j, k)], vtx[cid(i - 1, j, k)], a < 0);
  }
  // normals from the SDF gradient
  const P = Float32Array.from(pos), N = new Float32Array(P.length), e = h * 0.5;
  for (let v = 0; v < P.length; v += 3) {
    const x = P[v], y = P[v + 1], z = P[v + 2];
    let gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const l = Math.hypot(gx, gy, gz) || 1;
    N[v] = gx / l; N[v + 1] = gy / l; N[v + 2] = gz / l;
  }
  return { pos: P, nrm: N, idx: Uint32Array.from(idx) };
}
