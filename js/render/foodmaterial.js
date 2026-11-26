// Food material: a MeshStandardMaterial whose colour, roughness and glow come from the piece's
// hidden state, sampled in rest space from two 3D textures. Cut faces therefore show the real
// interior (doneness gradient, crust rim, layers) with no extra geometry work.
//   uState RGBA8 (linear): r = first process, g = second process, b = browning/4, a = char/2
//   uMat   RGBA8: r = material index (texelFetch, up to 4 blended), g = surface wetness, b = (T+20)/320,
//                 a = enzymatic (PPO) browning / 2
// Texture kinds (uProps.w): 1 meat 2 potato 3 egg shell 4 onion 5 tomato 6 apple 7 citrus
// 8 strawberry 9 avocado 10 banana 11 carrot 12 pepper 13 garlic … 22 salmon 23 sausage 24 laminated pastry
// 25 crumb (bread, cake, cookie) 26 sugar glaze
import * as THREE from 'three';

const FRAG_HEAD = /* glsl */`
uniform highp sampler3D uState;
uniform highp sampler3D uMat;
uniform highp sampler3D uFrac;
uniform vec3 uOrigin; uniform vec3 uSize; uniform vec3 uDims;
uniform vec3 uC0[4]; uniform vec3 uC1[4]; uniform vec3 uC2[4]; uniform vec3 uSkin[4]; uniform vec4 uEnz[4];
uniform vec4 uProps[4]; // x skin on, y roughness, z translucency, w texture kind
uniform float uThermal; uniform float uPeeled; uniform float uHighlight; uniform float uSplit; uniform vec3 uRingC; uniform float uBloom; uniform float uBlister;
varying vec3 vRest; varying float vCap;
float kHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float kNoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(kHash(i), kHash(i + vec3(1,0,0)), f.x), mix(kHash(i + vec3(0,1,0)), kHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(kHash(i + vec3(0,0,1)), kHash(i + vec3(1,0,1)), f.x), mix(kHash(i + vec3(0,1,1)), kHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// distance to the nearest jittered point (cellular): small round features like seeds and pores
float kCell(vec3 x){
  vec3 i = floor(x), f = fract(x); float d = 9.0;
  for (int a = -1; a <= 1; a++) for (int b = -1; b <= 1; b++) for (int c = -1; c <= 1; c++) {
    vec3 o = vec3(float(a), float(b), float(c));
    vec3 r = o + vec3(kHash(i + o), kHash(i + o + 7.1), kHash(i + o + 13.7)) - f;
    d = min(d, dot(r, r));
  }
  return sqrt(d);
}
vec3 kInferno(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.0002, 0.0016, -0.0194), c1 = vec3(0.1065, 0.5640, 3.9327), c2 = vec3(11.6024, -3.9729, -15.9424);
  vec3 c3 = vec3(-41.7040, 17.4364, 44.3541), c4 = vec3(77.1629, -33.4023, -81.8073), c5 = vec3(-71.3194, 32.6261, 73.2095), c6 = vec3(25.1311, -12.2426, -23.0703);
  return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}
vec3 kLin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 gFoodCol; float gFoodRough; float gFoodGlow;
vec3 matCol(int i, vec4 st){
  return mix(mix(uC0[i], uC1[i], smoothstep(0.0, 1.0, st.r)), uC2[i], smoothstep(0.0, 1.0, st.g));
}
void foodShade(){
  vec3 uvw = (vRest - uOrigin) / uSize;
  vec4 st = texture(uState, uvw);
  vec4 mt = texture(uMat, uvw);
  // blend up to four materials by their filtered sub-cell fractions, sharpened at the 50 % boundary
  vec4 fw = texture(uFrac, uvw);
  float ezf = smoothstep(0.0, 1.6, mt.a * 2.0) * 0.85;
  float wm[4]; wm[0] = fw.r; wm[1] = fw.g; wm[2] = fw.b; wm[3] = fw.a;
  vec3 col = vec3(0.0); vec3 skin = vec3(0.0); vec3 enzc = vec3(0.0); float wsum = 0.0; float wbest = -1.0; int mi = 0;
  for (int m = 0; m < 4; m++) {
    float w = smoothstep(0.3, 0.7, wm[m] / max(1e-3, fw.r + fw.g + fw.b + fw.a));
    if (w <= 0.0) continue;
    // enzymatic browning only on materials that have the enzyme, so its edge follows the material boundary
    col += w * mix(matCol(m, st), uEnz[m].rgb, ezf * uEnz[m].a); skin += w * uSkin[m]; wsum += w;
    if (wm[m] > wbest) { wbest = wm[m]; mi = m; }
  }
  if (wsum < 1e-4) { col = matCol(0, st); skin = uSkin[0]; wsum = 1.0; }
  col /= wsum; skin /= wsum;
  vec4 pr = uProps[mi];
  float kind = pr.w;
  bool outer = vCap < 0.5;
  float rough = pr.y;
  // ---- fine structure inside the food ----
  if (kind == 1.0) {
    float f = kNoise(vRest * vec3(1500.0, 140.0, 1500.0)), s = kNoise(vRest * vec3(260.0, 60.0, 260.0));
    col *= 0.88 + 0.18 * f + 0.08 * s;
    if (!outer) { float m = smoothstep(0.78, 0.92, kNoise(vRest * vec3(1400.0, 220.0, 1400.0)) * (0.6 + 0.5 * kNoise(vRest * 120.0 + 7.0))); col = mix(col, kLin(vec3(0.88, 0.78, 0.70)), m * 0.18); }
  } else if (kind == 2.0) {
    col *= 0.94 + 0.1 * kNoise(vRest * 900.0);
  } else if (kind == 4.0) {
    // onion: concentric fleshy scales with thin translucent boundaries
    float r = length(vRest - uRingC) / 0.0033;
    float ring = smoothstep(0.80, 0.97, fract(r));
    col = mix(col, col * vec3(0.86, 0.88, 0.80), ring * 0.7);
    rough = mix(rough, 0.2, ring);
  } else if (kind == 5.0) {
    if (mi == 1) { float sd = kCell(vRest * 260.0); col = mix(col, kLin(vec3(0.93, 0.83, 0.48)), smoothstep(0.32, 0.2, sd)); }
  } else if (kind == 6.0) {
    if (mi == 1) { float sd = kCell(vRest * vec3(110.0, 70.0, 110.0)); col = mix(col, kLin(vec3(0.35, 0.18, 0.08)), smoothstep(0.22, 0.12, sd) * step(length(vRest.xz), 0.007)); }
  } else if (kind == 7.0) {
    if (mi == 0) {
      float ang = atan(vRest.z, vRest.y) / 6.2832 * 10.0;
      float mem = smoothstep(0.92, 1.0, abs(fract(ang) * 2.0 - 1.0)) + smoothstep(0.6, 1.0, 1.0 - length(vRest.yz) / 0.004);
      col = mix(col, kLin(vec3(0.97, 0.94, 0.80)), clamp(mem, 0.0, 1.0) * 0.8);
      col *= 0.92 + 0.12 * kCell(vRest * 900.0);
    }
  } else if (kind == 8.0) {
    if (mi == 1) col = mix(col, uC0[0], smoothstep(0.5, 1.0, kNoise(vRest * vec3(900.0, 90.0, 900.0))) * 0.5);
  } else if (kind == 19.0) {
    // gelatin: clear, slightly brighter where thin, tiny bubbles
    col *= 0.92 + 0.12 * smoothstep(0.85, 1.0, kNoise(vRest * 700.0));
    // jelly is wet-glassy; gummies have a sugar-dusted, satin surface (material roughness)
    rough = pr.y + 0.1 * kNoise(vRest * 2500.0);
  } else if (kind == 20.0) {
    col *= 0.96 + 0.05 * kNoise(vRest * 1200.0);
  } else if (kind == 21.0) {
    // sugar glass: clear and glassy; goes tacky (wet-looking) above its glass transition
    rough = mix(0.03, 0.01, smoothstep(0.0, 1.0, st.g));
    col *= 0.9 + 0.15 * smoothstep(0.7, 1.0, kNoise(vRest * 500.0));
  } else if (kind == 11.0) {
    col *= 0.95 + 0.07 * kNoise(vRest * vec3(80.0, 900.0, 900.0));
  } else if (kind == 22.0) {
    if (mi == 0) {
      // salmon: white fat lines (myocommata) in chevrons; once cooked the flakes part along them
      float ch = vRest.x + abs(vRest.z) * 0.9 + kNoise(vRest * 90.0) * 0.003;
      float line = smoothstep(0.80, 0.97, abs(fract(ch / 0.0115) * 2.0 - 1.0));
      col = mix(col, kLin(vec3(0.99, 0.90, 0.84)), line * mix(0.65, 0.45, st.r));
      if (!outer) col *= 1.0 - 0.18 * line * smoothstep(0.3, 1.0, st.g);
      col *= 0.95 + 0.08 * kNoise(vRest * vec3(1200.0, 300.0, 1200.0));
    }
  } else if (kind == 23.0) {
    // coarse ground meat: specks of fat
    col = mix(col, kLin(vec3(0.97, 0.90, 0.84)), smoothstep(0.58, 0.72, kNoise(vRest * 950.0)) * 0.55);
    col *= 0.92 + 0.12 * kNoise(vRest * 2200.0);
  } else if (kind == 24.0) {
    // laminated pastry: thin buttery sheets with air pockets between them
    float l = fract((vRest.y + kNoise(vRest * 70.0) * 0.004) / 0.0022);
    col *= 0.86 + 0.18 * smoothstep(0.25, 0.75, l);
    col = mix(col, col * 0.7, smoothstep(0.26, 0.12, kCell(vRest * vec3(260.0, 650.0, 260.0))));
  } else if (kind == 25.0) {
    // crumb: open pores, darker where they are shadowed
    float pore = smoothstep(0.30, 0.16, kCell(vRest * 620.0)) + 0.5 * smoothstep(0.25, 0.12, kCell(vRest * 1500.0 + 3.1));
    col *= 1.0 - 0.2 * clamp(pore, 0.0, 1.0);
    rough = 0.9;
  } else if (kind == 26.0) {
    // sugar glaze: glossy, glassier when warm
    col *= 0.96 + 0.06 * kNoise(vRest * 800.0);
    rough = mix(pr.y, 0.06, st.r);
  }
  // ---- natural outer surface (peel, shell, skin) ----
  if (outer && pr.x > 0.5 && uPeeled < 0.5) {
    vec3 sk = skin;
    if (kind == 2.0) {
      float n = kNoise(vRest * 420.0), mottle = kNoise(vRest * 45.0 + 1.3);
      sk *= (0.78 + 0.28 * n) * (0.8 + 0.4 * mottle);
      sk = mix(sk, sk * vec3(1.15, 1.05, 0.85), smoothstep(0.55, 0.75, kNoise(vRest * 160.0)) * 0.5);
      rough = 0.85;
    } else if (kind == 3.0) { sk *= 0.96 + 0.06 * kNoise(vRest * 2600.0); rough = 0.55; }
    else if (kind == 4.0) { sk *= 0.8 + 0.35 * kNoise(vRest * vec3(600.0, 40.0, 600.0)); rough = 0.45; }
    else if (kind == 5.0) { rough = 0.18; if (uSplit > 0.5) { float cr = smoothstep(0.03, 0.0, abs(kNoise(vRest * 120.0) - 0.5)); sk = mix(sk, kLin(vec3(0.96, 0.55, 0.40)), cr); } }
    else if (kind == 6.0) {
      float streak = kNoise(vRest * vec3(160.0, 25.0, 160.0));
      sk = mix(sk, kLin(vec3(0.95, 0.75, 0.25)), smoothstep(0.55, 0.85, streak) * 0.6);
      sk = mix(sk, kLin(vec3(0.95, 0.90, 0.70)), smoothstep(0.1, 0.05, kCell(vRest * 380.0)) * 0.6);
      rough = 0.3;
    } else if (kind == 7.0) { sk *= 0.9 + 0.12 * smoothstep(0.0, 0.4, kCell(vRest * 1200.0)); rough = 0.4; }
    else if (kind == 8.0) { float a = kCell(vRest * vec3(520.0, 380.0, 520.0)); sk = mix(sk, kLin(vec3(0.92, 0.82, 0.35)), smoothstep(0.16, 0.08, a)); rough = 0.25; }
    else if (kind == 9.0) { sk *= 0.6 + 0.6 * kNoise(vRest * 700.0); rough = 0.75; }
    else if (kind == 10.0) { float tip = smoothstep(0.075, 0.09, abs(vRest.x)); sk = mix(sk, kLin(vec3(0.28, 0.20, 0.10)), tip); sk *= 0.92 + 0.12 * kNoise(vRest * vec3(40.0, 400.0, 400.0)); rough = 0.5; }
    else if (kind == 12.0) { rough = 0.12; }
    else if (kind == 13.0) { sk *= 0.9 + 0.15 * kNoise(vRest * vec3(1800.0, 120.0, 1800.0)); rough = 0.5; }
    else if (kind == 22.0) {
      // silver salmon skin with darker speckles and a faint scale pattern
      sk *= 0.82 + 0.3 * kNoise(vRest * 500.0);
      sk = mix(sk, kLin(vec3(0.18, 0.2, 0.22)), smoothstep(0.2, 0.08, kCell(vRest * 260.0)) * 0.6);
      sk *= 0.94 + 0.08 * smoothstep(0.3, 0.5, kCell(vRest * 1400.0));
      rough = 0.28;
    } else if (kind == 23.0) {
      // natural casing: glossy and slightly translucent; once it splits the meat shows through a crack
      sk *= 0.96 + 0.06 * kNoise(vRest * vec3(80.0, 900.0, 900.0));
      rough = 0.22;
      if (uSplit > 0.5) {
        float cr = smoothstep(0.0028, 0.0008, abs(vRest.z + 0.0015 * sin(vRest.x * 180.0))) * step(0.0, vRest.y) * step(abs(vRest.x), 0.042);
        sk = mix(sk, col * 1.05, cr); rough = mix(rough, 0.6, cr);
      }
    }
    col = sk;
  }
  // chocolate set without tempering: dull with grey-white streaks (fat bloom)
  if (kind == 16.0 && uBloom > 0.0) {
    float sk = smoothstep(0.4, 0.9, kNoise(vRest * vec3(300.0, 900.0, 120.0))) * 0.7 + 0.3 * kNoise(vRest * 1500.0);
    col = mix(col, uC2[0] + kLin(vec3(0.33, 0.30, 0.27)), uBloom * sk * 0.9);
    rough = mix(rough, 0.8, uBloom);
  }
  // banana peel darkens with chilling injury (second channel on the peel material)
  if (kind == 10.0 && mi == 1 && outer && uPeeled < 0.5) col = mix(col, kLin(vec3(0.22, 0.14, 0.07)), smoothstep(0.3, 1.5, st.g) * (0.6 + 0.4 * kNoise(vRest * 300.0)));
  // Maillard browning and caramelisation (mottled where contact was uneven), then charring
  float mott = kNoise(vRest * 140.0) * 0.6 + kNoise(vRest * 520.0) * 0.4;
  float b = st.b * 4.0 * (0.7 + 0.6 * mott);
  col = mix(col, kLin(vec3(0.74, 0.50, 0.28)), smoothstep(0.0, 0.45, b) * 0.9);
  col = mix(col, kLin(vec3(0.52, 0.29, 0.13)), smoothstep(0.35, 1.2, b));
  col = mix(col, kLin(vec3(0.33, 0.16, 0.07)), smoothstep(1.2, 2.4, b));
  col = mix(col, kLin(vec3(0.17, 0.09, 0.045)), smoothstep(2.4, 4.0, b) * 0.9);
  // mozzarella blisters: steam bubbles scorch in spots once the top browns
  if (uBlister > 0.5 && b > 0.3) { float bl = smoothstep(0.28, 0.12, kCell(vRest * 140.0)); col = mix(col, kLin(vec3(0.30, 0.15, 0.06)), bl * smoothstep(0.3, 1.2, b)); }
  float ch = st.a * 2.0;
  col = mix(col, kLin(vec3(0.07, 0.06, 0.055)), smoothstep(0.15, 1.1, ch));
  // frozen surfaces: a thin white frost
  float Tc = mt.b * 360.0 - 40.0;
  if (outer && Tc < -1.0) { float fr = smoothstep(-1.0, -10.0, Tc) * (0.35 + 0.25 * kNoise(vRest * 1800.0)); col = mix(col, kLin(vec3(0.93, 0.95, 0.97)), fr); rough = mix(rough, 0.85, fr); }
  float wet = mt.g;
  rough = mix(rough, 0.32, wet * 0.85) + (kind == 1.0 ? 0.0 : 0.25 * smoothstep(0.3, 1.5, b) * (1.0 - wet));
  gFoodGlow = pr.z;
  if (uThermal > 0.5) { col = kInferno(mt.b); rough = 0.6; gFoodGlow = 1.6; }
  col = mix(col, col + vec3(0.05, 0.04, 0.01), uHighlight);
  gFoodCol = col; gFoodRough = clamp(rough, 0.05, 1.0);
}
`;

export function makeFoodMaterial(palette) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.0 });
  const u = {
    uState: { value: null }, uMat: { value: null }, uFrac: { value: null },
    uOrigin: { value: new THREE.Vector3() }, uSize: { value: new THREE.Vector3(1, 1, 1) }, uDims: { value: new THREE.Vector3(1, 1, 1) },
    uC0: { value: palette.c0 }, uC1: { value: palette.c1 }, uC2: { value: palette.c2 }, uSkin: { value: palette.skin }, uEnz: { value: palette.enz },
    uProps: { value: palette.props },
    uWob: { value: new THREE.Vector3() }, uWobUp: { value: new THREE.Vector3(0, 1, 0) }, uWobBase: { value: 0 }, uWobH: { value: 1 },
    uThermal: { value: 0 }, uPeeled: { value: 0 }, uHighlight: { value: 0 }, uSplit: { value: 0 }, uBloom: { value: 0 }, uBlister: { value: 0 }, uRingC: { value: new THREE.Vector3(...(palette.ringC || [0, 0, 0])) },
  };
  mat.userData.u = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCap;\n#ifdef USE_AREST\nattribute vec3 aRest;\n#endif\nvarying vec3 vRest;\nvarying float vCap;\nuniform vec3 uWob; uniform vec3 uWobUp; uniform float uWobBase; uniform float uWobH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_AREST\nvRest = aRest;\n#else\nvRest = position;\n#endif\nvCap = aCap;\n{ float hf = clamp((dot(position, uWobUp) - uWobBase) / max(uWobH, 1e-4), 0.0, 1.0); transformed += uWob * hf * hf; }');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_HEAD)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'foodShade();\nvec4 diffuseColor = vec4( gFoodCol, opacity );')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gFoodRough;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gFoodCol * gFoodGlow * 0.12;');
  };
  mat.customProgramCacheKey = () => 'food-v7';
  return mat;
}

// palette colours are authored in sRGB; the shader works in linear light
export const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const v3 = (a) => new THREE.Vector3(...(a || [1, 0, 1]).map(s2l));
const KIND = { meat: 1, potato: 2, egg: 3 };
export function paletteFor(piece) {
  const pal = { c0: [], c1: [], c2: [], skin: [], enz: [], props: [], ringC: piece.def.ringCenter };
  for (let i = 0; i < 4; i++) {
    const m = piece.mats[Math.min(i, piece.mats.length - 1)];
    const L = m.look || {};
    pal.c0.push(v3(L.c0)); pal.c1.push(v3(L.c1)); pal.c2.push(v3(L.c2)); pal.skin.push(v3(L.skin || L.c0)); pal.enz.push(new THREE.Vector4(...(L.enzCol || [0.6, 0.45, 0.3]).map(s2l), m.def.enz ? 1 : 0));
    const kind = L.kind || (L.fiber ? KIND.meat : L.peelNoise ? KIND.potato : piece.def.kind === 'egg' ? KIND.egg : 0);
    pal.props.push(new THREE.Vector4(L.skin ? 1 : 0, L.rough ?? 0.5, L.trans ?? 0, kind));
  }
  return pal;
}
