// Food material: a MeshStandardMaterial whose colour, roughness and glow come from the piece's
// hidden state, sampled in rest space from two 3D textures. Cut faces therefore show the real
// interior (doneness gradient, crust rim) with no extra geometry work.
//   uState RGBA8 (linear): r = first process, g = second process, b = browning/4, a = char/2
//   uMat   RGBA8: r = material index (texelFetch), g = surface wetness, b = (T+20)/320, a = unused
import * as THREE from 'three';

const FRAG_HEAD = /* glsl */`
uniform highp sampler3D uState;
uniform highp sampler3D uMat;
uniform vec3 uOrigin; uniform vec3 uSize; uniform vec3 uDims;
uniform vec3 uC0[4]; uniform vec3 uC1[4]; uniform vec3 uC2[4]; uniform vec3 uSkin[4];
uniform vec4 uProps[4]; // x skin on, y roughness, z translucency, w texture kind (1 meat fibre, 2 potato, 3 egg shell)
uniform float uThermal; uniform float uPeeled; uniform float uHighlight;
varying vec3 vRest; varying float vCap;
float kHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float kNoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(kHash(i), kHash(i + vec3(1,0,0)), f.x), mix(kHash(i + vec3(0,1,0)), kHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(kHash(i + vec3(0,0,1)), kHash(i + vec3(1,0,1)), f.x), mix(kHash(i + vec3(0,1,1)), kHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
vec3 kInferno(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.0002, 0.0016, -0.0194), c1 = vec3(0.1065, 0.5640, 3.9327), c2 = vec3(11.6024, -3.9729, -15.9424);
  vec3 c3 = vec3(-41.7040, 17.4364, 44.3541), c4 = vec3(77.1629, -33.4023, -81.8073), c5 = vec3(-71.3194, 32.6261, 73.2095), c6 = vec3(25.1311, -12.2426, -23.0703);
  return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}
vec3 kLin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 gFoodCol; float gFoodRough; float gFoodGlow;
void foodShade(){
  vec3 uvw = (vRest - uOrigin) / uSize;
  vec4 st = texture(uState, uvw);
  vec4 mt = texture(uMat, uvw);
  // two-material foods blend smoothly on the filtered material-fraction channel (a)
  float w1 = smoothstep(0.35, 0.65, mt.a);
  int mi = w1 > 0.5 ? 1 : 0;
  vec4 pr = uProps[mi];
  float kind = pr.w;
  vec3 col0 = mix(mix(uC0[0], uC1[0], smoothstep(0.0, 1.0, st.r)), uC2[0], smoothstep(0.0, 1.0, st.g));
  vec3 col1 = mix(mix(uC0[1], uC1[1], smoothstep(0.0, 1.0, st.r)), uC2[1], smoothstep(0.0, 1.0, st.g));
  vec3 col = mix(col0, col1, w1);
  // fine structure
  if (kind > 0.5 && kind < 1.5) {
    // muscle fibres run through the thickness (y) for a steak cut across the grain
    float f = kNoise(vRest * vec3(1500.0, 140.0, 1500.0));
    float s = kNoise(vRest * vec3(260.0, 60.0, 260.0));
    col *= 0.88 + 0.18 * f + 0.08 * s;
    // fine intramuscular fat: thin streaks, visible on cut faces only
    if (vCap > 0.5) {
      float m = smoothstep(0.78, 0.92, kNoise(vRest * vec3(1400.0, 220.0, 1400.0)) * (0.6 + 0.5 * kNoise(vRest * 120.0 + 7.0)));
      col = mix(col, kLin(vec3(0.88, 0.78, 0.70)), m * 0.18);
    }
  } else if (kind > 1.5 && kind < 2.5) {
    col *= 0.94 + 0.1 * kNoise(vRest * 900.0);
  }
  bool outer = vCap < 0.5;
  float rough = pr.y;
  if (outer && pr.x > 0.5 && uPeeled < 0.5) {
    vec3 sk = mix(uSkin[0], uSkin[1], w1);
    if (kind > 1.5 && kind < 2.5) {
      // russet peel: netted texture and a few eyes
      float n = kNoise(vRest * 420.0), mottle = kNoise(vRest * 45.0 + 1.3);
      sk *= (0.78 + 0.28 * n) * (0.8 + 0.4 * mottle);
      sk = mix(sk, sk * vec3(1.15, 1.05, 0.85), smoothstep(0.55, 0.75, kNoise(vRest * 160.0)) * 0.5);
      rough = 0.85;
    } else if (kind > 2.5) {
      sk *= 0.96 + 0.06 * kNoise(vRest * 2600.0);
      rough = 0.55;
    }
    col = sk;
  }
  // Maillard browning (mottled where contact was uneven), then charring
  float mott = kNoise(vRest * 140.0) * 0.6 + kNoise(vRest * 520.0) * 0.4;
  float b = st.b * 4.0 * (0.7 + 0.6 * mott);
  col = mix(col, kLin(vec3(0.74, 0.50, 0.28)), smoothstep(0.0, 0.45, b) * 0.9);
  col = mix(col, kLin(vec3(0.52, 0.29, 0.13)), smoothstep(0.35, 1.2, b));
  col = mix(col, kLin(vec3(0.33, 0.16, 0.07)), smoothstep(1.2, 2.4, b));
  col = mix(col, kLin(vec3(0.17, 0.09, 0.045)), smoothstep(2.4, 4.0, b) * 0.9);
  float ch = st.a * 2.0;
  col = mix(col, kLin(vec3(0.07, 0.06, 0.055)), smoothstep(0.15, 1.1, ch));
  float wet = mt.g;
  rough = mix(rough, 0.32, wet * 0.85) + (kind > 0.5 && kind < 1.5 ? 0.0 : 0.25 * smoothstep(0.3, 1.5, b) * (1.0 - wet));
  gFoodGlow = pr.z;
  if (uThermal > 0.5) { col = kInferno(mt.b); rough = 0.6; gFoodGlow = 1.6; }
  col = mix(col, col + vec3(0.05, 0.04, 0.01), uHighlight);
  gFoodCol = col; gFoodRough = clamp(rough, 0.05, 1.0);
}
`;

export function makeFoodMaterial(palette) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.0 });
  const u = {
    uState: { value: null }, uMat: { value: null },
    uOrigin: { value: new THREE.Vector3() }, uSize: { value: new THREE.Vector3(1, 1, 1) }, uDims: { value: new THREE.Vector3(1, 1, 1) },
    uC0: { value: palette.c0 }, uC1: { value: palette.c1 }, uC2: { value: palette.c2 }, uSkin: { value: palette.skin },
    uProps: { value: palette.props },
    uThermal: { value: 0 }, uPeeled: { value: 0 }, uHighlight: { value: 0 },
  };
  mat.userData.u = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCap;\nvarying vec3 vRest;\nvarying float vCap;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position; vCap = aCap;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_HEAD)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'foodShade();\nvec4 diffuseColor = vec4( gFoodCol, opacity );')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gFoodRough;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gFoodCol * gFoodGlow * 0.12;');
  };
  mat.customProgramCacheKey = () => 'food-v1';
  return mat;
}

// palette colours are authored in sRGB; the shader works in linear light
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const v3 = (a) => new THREE.Vector3(...(a || [1, 0, 1]).map(s2l));
const KIND = { meat: 1, potato: 2, egg: 3 };
export function paletteFor(piece) {
  const pal = { c0: [], c1: [], c2: [], skin: [], props: [] };
  for (let i = 0; i < 4; i++) {
    const m = piece.mats[Math.min(i, piece.mats.length - 1)];
    const L = m.look || {};
    pal.c0.push(v3(L.c0)); pal.c1.push(v3(L.c1)); pal.c2.push(v3(L.c2)); pal.skin.push(v3(L.skin || L.c0));
    const kind = L.fiber ? KIND.meat : L.peelNoise ? KIND.potato : piece.def.kind === 'egg' ? KIND.egg : 0;
    pal.props.push(new THREE.Vector4(L.skin ? 1 : 0, L.rough ?? 0.5, L.trans ?? 0, kind));
  }
  return pal;
}
