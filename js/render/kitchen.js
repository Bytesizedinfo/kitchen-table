// The kitchen table scene: table, board, gas cooktop with flames, cast-iron pan, pot of water,
// plate, lights, steam and smoke. Layout comes from sim/layout.js so sim and render agree.
import * as THREE from 'three';
import { LAYOUT as L, BURNER_TOP } from '../sim/layout.js';
import { mulberry32 } from '../sim/rng.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function woodTex(base, dark, seed, rings = 38) {
  const rnd = mulberry32(seed);
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < rings * 6; i++) {
      const y = rnd() * h, amp = 4 + rnd() * 12, f = 0.002 + rnd() * 0.006, ph = rnd() * 6.28;
      g.strokeStyle = dark; g.globalAlpha = 0.04 + rnd() * 0.12; g.lineWidth = 0.6 + rnd() * 2.4;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph) * amp * 0.25; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
      g.stroke();
    }
    g.globalAlpha = 1;
    // board seams
    for (let y = 0; y < h; y += h / 4) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, w, 2); }
  });
}
function softSprite() {
  return canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }, false);
}

/** Simple particle puffs (steam / smoke) rising and fading. */
class Puffs {
  constructor(scene, max, color, opacity) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.age = new Float32Array(max); this.life = new Float32Array(max); this.size = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('aSize', this.aSize); g.setAttribute('aAlpha', this.aAlpha);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: softSprite() }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uScale: { value: 600 } },
      vertexShader: `attribute float aSize; attribute float aAlpha; varying float vA; uniform float uScale;
        void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity; varying float vA;
        void main(){ float a = texture2D(uMap, gl_PointCoord).a * vA * uOpacity; if (a < 0.003) discard; gl_FragColor = vec4(uColor, a); }`,
      transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.rnd = mulberry32(99);
  }
  emit(x, y, z, spread, size, life, rise) {
    let i = this.n < this.max ? this.n++ : (this.rnd() * this.max) | 0;
    const r = this.rnd;
    const a = r() * 6.283, rr = Math.sqrt(r()) * spread;
    this.pos[i * 3] = x + Math.cos(a) * rr; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z + Math.sin(a) * rr;
    this.vel[i * 3] = (r() - 0.5) * 0.02; this.vel[i * 3 + 1] = rise * (0.7 + 0.6 * r()); this.vel[i * 3 + 2] = (r() - 0.5) * 0.02;
    this.age[i] = 0; this.life[i] = life * (0.7 + 0.6 * r()); this.size[i] = size * (0.7 + 0.6 * r());
  }
  update(dt) {
    const sz = this.aSize.array, al = this.aAlpha.array;
    for (let i = 0; i < this.n; i++) {
      this.age[i] += dt;
      const t = this.age[i] / this.life[i];
      if (t >= 1) { al[i] = 0; continue; }
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.vel[i * 3] += (this.rnd() - 0.5) * 0.02 * dt;
      sz[i] = this.size[i] * (0.6 + 1.6 * t);
      al[i] = Math.sin(Math.PI * Math.min(1, t * 1.4)) * (1 - t);
    }
    this.aPos.needsUpdate = true; this.aSize.needsUpdate = true; this.aAlpha.needsUpdate = true;
  }
}

export function buildKitchen(stage) {
  const scene = stage.scene;
  scene.background = new THREE.Color(0x15120f);
  scene.fog = new THREE.Fog(0x15120f, 2.6, 6);
  // lights
  const hemi = new THREE.HemisphereLight(0xfff2e0, 0x2a2018, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sun.position.set(-0.6, 1.6, 0.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -1; sun.shadow.camera.right = 1; sun.shadow.camera.top = 0.7; sun.shadow.camera.bottom = -0.7;
  sun.shadow.camera.near = 0.3; sun.shadow.camera.far = 4;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.01;
  scene.add(sun);
  stage.sun = sun;
  stage.applyQuality();
  const fill = new THREE.PointLight(0xffd7a8, 1.2, 3, 2);
  fill.position.set(0.8, 0.9, -0.6);
  scene.add(fill);

  // room: floor and wall
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0x2b241e, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.75; floor.receiveShadow = true; scene.add(floor);
  const wallTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,70,60,0.35)'; g.lineWidth = 3;
    for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let y = 0; y < h; y += 64) for (let x = ((y / 64) % 2) * 64; x <= w; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); }
  });
  wallTex.repeat.set(6, 3);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.6, color: 0x9a948a }));
  wall.position.set(0, 0.6, -0.95); wall.receiveShadow = true; scene.add(wall);

  // table
  const top = new THREE.Mesh(new THREE.BoxGeometry(L.table.w, 0.04, L.table.d),
    new THREE.MeshStandardMaterial({ map: woodTex('#7a5233', '#2e1a0c', 3), roughness: 0.62 }));
  top.position.y = -0.02; top.receiveShadow = true; top.castShadow = true; scene.add(top);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x4a301c, roughness: 0.7 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.71, 0.06), legMat);
    leg.position.set(sx * (L.table.w / 2 - 0.08), -0.395, sz * (L.table.d / 2 - 0.08)); leg.castShadow = true; scene.add(leg);
  }

  // cutting board (end-grain maple look)
  const bt = woodTex('#d8b98a', '#9a7444', 11, 60);
  const board = new THREE.Mesh(new THREE.BoxGeometry(L.board.w, L.board.h, L.board.d), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.55 }));
  board.position.set(L.board.x, L.board.h / 2, L.board.z); board.castShadow = true; board.receiveShadow = true; scene.add(board);

  // plate
  const plateProfile = [[0, 0], [0.085, 0], [0.09, 0.004], [0.095, 0.009], [0.12, 0.014], [L.plate.r, 0.018], [L.plate.r - 0.004, 0.019], [0.118, 0.016], [0.09, 0.012], [0, 0.012]].map(([x, y]) => new THREE.Vector2(x, y));
  const plate = new THREE.Mesh(new THREE.LatheGeometry(plateProfile, 64), new THREE.MeshPhysicalMaterial({ color: 0xf5f3ee, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
  plate.position.set(L.plate.x, 0, L.plate.z); plate.castShadow = true; plate.receiveShadow = true; scene.add(plate);

  // fridge + freezer cabinet with glass doors (freezer left, fridge right)
  const F = L.fridge;
  const fridge = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xe9eaec, roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide });
  const wallT = 0.012;
  const addBox = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; fridge.add(m); return m; };
  addBox(F.w, wallT, F.d, 0, F.h - wallT / 2, 0, shellMat); // top
  addBox(F.w, F.floor, F.d, 0, F.floor / 2, 0, shellMat); // base
  addBox(wallT, F.h, F.d, -F.w / 2 + wallT / 2, F.h / 2, 0, shellMat);
  addBox(wallT, F.h, F.d, F.w / 2 - wallT / 2, F.h / 2, 0, shellMat);
  addBox(F.w, F.h, wallT, 0, F.h / 2, -F.d / 2 + wallT / 2, shellMat); // back
  addBox(wallT, F.h, F.d, 0, F.h / 2, 0, shellMat); // divider
  const frost = new THREE.MeshStandardMaterial({ color: 0xdfeefa, roughness: 0.9, emissive: 0x2a3a48, emissiveIntensity: 0.25 });
  addBox(F.w / 2 - wallT * 1.5, 0.002, F.d - wallT * 2, -F.w / 4, F.floor + 0.001, 0, frost);
  addBox(F.w / 2 - wallT * 1.5, 0.002, F.d - wallT * 2, F.w / 4, F.floor + 0.001, 0, new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 }));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe6f2, roughness: 0.05, transparent: true, opacity: 0.16, metalness: 0, depthWrite: false });
  for (const sx of [-1, 1]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(F.w / 2 - 0.006, F.h - F.floor - 0.012, 0.004), glass);
    door.position.set((sx * F.w) / 4, F.floor + (F.h - F.floor) / 2, F.d / 2); door.renderOrder = 6; fridge.add(door);
    addBox(0.008, 0.12, 0.012, sx * 0.02, F.h * 0.55, F.d / 2 + 0.008, new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.9, roughness: 0.3 }));
  }
  const label = (text, x) => {
    const t = canvasTex(256, 64, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h); g.fillStyle = '#2b3540'; g.font = '600 30px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(text, w / 2, 42); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.0375), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
    m.position.set(x, F.h - 0.03, F.d / 2 + 0.003); fridge.add(m);
  };
  label('Freezer −18 °C', -F.w / 4); label('Fridge 4 °C', F.w / 4);
  const fl = new THREE.PointLight(0xeef6ff, 0.35, 0.5, 2); fl.position.set(0, F.h - 0.05, 0.02); fridge.add(fl);
  fridge.position.set(F.x, 0, F.z);
  scene.add(fridge);

  // two-slot toaster: hollow shell with open slots, glowing elements inside, lever and shade dial
  const TT = L.toaster;
  const toaster = new THREE.Group();
  const tShell = new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.28, metalness: 0.55 });
  const tDark = new THREE.MeshStandardMaterial({ color: 0x1d1b19, roughness: 0.8, metalness: 0.2, side: THREE.DoubleSide });
  const tBox = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; toaster.add(b); return b; };
  const wt = 0.006, sW = TT.slotW, sL = TT.slotL, inner = TT.w - wt * 8;
  // rounded end walls, front and back walls, base
  const endGeo = new RoundedBoxGeometry(wt * 4, TT.h, TT.d, 3, 0.012);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(endGeo, tShell); e.position.set(sx * (TT.w / 2 - wt * 2), TT.h / 2, 0); e.castShadow = true; e.receiveShadow = true; toaster.add(e); }
  tBox(inner, TT.h, wt, 0, TT.h / 2, TT.d / 2 - wt / 2, tShell);
  tBox(inner, TT.h, wt, 0, TT.h / 2, -TT.d / 2 + wt / 2, tShell);
  tBox(TT.w, 0.012, TT.d, 0, 0.006, 0, tDark);
  // top plate as strips around the two slots
  const topY = TT.h - 0.003;
  const zs = [-TT.d / 2, TT.slotZ[0] - sW / 2, TT.slotZ[0] + sW / 2, TT.slotZ[1] - sW / 2, TT.slotZ[1] + sW / 2, TT.d / 2];
  for (let i = 0; i < zs.length - 1; i += 2) tBox(inner, 0.006, zs[i + 1] - zs[i], 0, topY, (zs[i] + zs[i + 1]) / 2, tShell);
  for (const sz of TT.slotZ) for (const sx of [-1, 1]) tBox((inner - sL) / 2, 0.006, sW, sx * (sL / 2 + (inner - sL) / 4), topY, sz, tShell);
  // dark slot walls, with element wires on both long sides of each slot
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, emissive: 0x000000, roughness: 0.6 });
  const wireGeo = new THREE.BoxGeometry(sL, 0.0016, 0.0016);
  const slotLights = [];
  for (const sz of TT.slotZ) {
    tBox(sL + 0.01, TT.h - 0.02, 0.002, 0, TT.h / 2, sz - sW / 2 - 0.004, tDark);
    tBox(sL + 0.01, TT.h - 0.02, 0.002, 0, TT.h / 2, sz + sW / 2 + 0.004, tDark);
    for (const side of [-1, 1]) for (let k = 0; k < 9; k++) {
      const w = new THREE.Mesh(wireGeo, glowMat);
      w.position.set(0, 0.03 + k * 0.0145, sz + side * (sW / 2 + 0.002)); toaster.add(w);
    }
    const sl = new THREE.PointLight(0xff7a2a, 0, 0.16, 2); sl.position.set(0, TT.h - 0.035, sz); toaster.add(sl); slotLights.push(sl);
  }
  tBox(inner, 0.004, TT.d - wt * 2, 0, 0.02, 0, tDark); // crumb tray
  // lever on the right end, shade dial on the front
  const lever = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.012, 0.024, 2, 0.004), new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 0.5 }));
  lever.castShadow = true; toaster.add(lever);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.008, 24), new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 0.4 }));
  dial.rotation.x = Math.PI / 2; dial.position.set(TT.w / 2 - 0.05, 0.05, TT.d / 2 + 0.004); toaster.add(dial);
  const dmark = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.002, 0.008), new THREE.MeshBasicMaterial({ color: 0xf2efe8 }));
  dmark.position.set(0, 0.0045, 0.006); dial.add(dmark);
  toaster.position.set(TT.x, 0, TT.z);
  scene.add(toaster);

  // cooktop
  const ct = L.cooktop;
  const body = new THREE.Mesh(new THREE.BoxGeometry(ct.w, ct.h, ct.d), new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.35, metalness: 0.6 }));
  body.position.set(ct.x, ct.h / 2, ct.z); body.castShadow = true; body.receiveShadow = true; scene.add(body);
  const grateMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.3 });
  const burnerMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.5, metalness: 0.7 });
  const flames = [], knobs = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x4f8dff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const flameTip = new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  L.burners.forEach((b, i) => {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.012, 32), burnerMat);
    cap.position.set(b.x, ct.h + 0.006, b.z); scene.add(cap);
    for (let a = 0; a < 4; a++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 0.012), grateMat);
      arm.position.set(b.x, BURNER_TOP - 0.005, b.z); arm.rotation.y = (a * Math.PI) / 4; arm.castShadow = true; scene.add(arm);
    }
    const ring = new THREE.Group();
    const n = 18;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.022, 6), k % 2 ? flameTip : flameMat);
      f.position.set(Math.cos(a) * 0.04, 0.012, Math.sin(a) * 0.04);
      f.rotation.z = -Math.cos(a) * 0.5; f.rotation.x = Math.sin(a) * 0.5;
      ring.add(f);
    }
    ring.position.set(b.x, ct.h + 0.006, b.z);
    ring.visible = false;
    scene.add(ring);
    flames.push(ring);
    const knob = new THREE.Group();
    const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.018, 24), new THREE.MeshStandardMaterial({ color: 0xc9c9c9, roughness: 0.3, metalness: 0.8 }));
    kb.rotation.x = Math.PI / 2; knob.add(kb);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.012, 0.002), new THREE.MeshBasicMaterial({ color: 0xff5a2a }));
    mark.position.set(0, 0.008, 0.01); knob.add(mark);
    knob.position.set(b.x, ct.h / 2, ct.z + ct.d / 2 + 0.009);
    scene.add(knob);
    knobs.push(knob);
  });

  // cast-iron pan
  const pp = L.pan;
  const panProfile = [[0, 0], [pp.r + 0.004, 0], [pp.rTop + 0.004, pp.wall], [pp.rTop + 0.0005, pp.wall + 0.003], [pp.rTop - 0.004, pp.wall], [pp.r - 0.002, pp.base], [0, pp.base]].map(([x, y]) => new THREE.Vector2(x, y));
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 0.55, metalness: 0.55 });
  const pan = new THREE.Group();
  const panBody = new THREE.Mesh(new THREE.LatheGeometry(panProfile, 72), ironMat);
  panBody.castShadow = true; panBody.receiveShadow = true; pan.add(panBody);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.014, 0.03), ironMat);
  handle.position.set(pp.rTop + 0.075, pp.wall - 0.012, 0); handle.rotation.z = 0.18; handle.castShadow = true; pan.add(handle);
  const oil = new THREE.Mesh(new THREE.CircleGeometry(pp.r - 0.004, 64), new THREE.MeshPhysicalMaterial({ color: 0x2a1c0a, roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1 }));
  oil.rotation.x = -Math.PI / 2; oil.position.y = pp.base + 0.0004; pan.add(oil);
  const juice = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshPhysicalMaterial({ color: 0x4a1608, roughness: 0.1, transparent: true, opacity: 0.6 }));
  juice.rotation.x = -Math.PI / 2; juice.position.y = pp.base + 0.0008; juice.visible = false; pan.add(juice);
  pan.position.set(L.burners[0].x, BURNER_TOP, L.burners[0].z);
  scene.add(pan);

  // pot of water
  const po = L.pot;
  const potProfile = [[0, 0], [po.r + 0.003, 0], [po.r + 0.003, po.h], [po.r + 0.008, po.h + 0.002], [po.r, po.h], [po.r, po.base], [0, po.base]].map(([x, y]) => new THREE.Vector2(x, y));
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xd7dade, roughness: 0.18, metalness: 1.0 });
  const pot = new THREE.Group();
  const potBody = new THREE.Mesh(new THREE.LatheGeometry(potProfile, 72), steelMat);
  potBody.castShadow = true; potBody.receiveShadow = true;
  potBody.material = steelMat.clone(); potBody.material.side = THREE.DoubleSide;
  pot.add(potBody);
  for (const s of [-1, 1]) {
    const h2 = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 8, 24, Math.PI), steelMat);
    h2.position.set(s * (po.r + 0.012), po.h - 0.02, 0); h2.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; pot.add(h2);
  }
  const water = new THREE.Mesh(new THREE.CircleGeometry(po.r - 0.0005, 64), new THREE.MeshPhysicalMaterial({ color: 0x9fb8c4, roughness: 0.04, transmission: 0, transparent: true, opacity: 0.55, clearcoat: 1, clearcoatRoughness: 0.05 }));
  water.rotation.x = -Math.PI / 2; water.renderOrder = 4;
  pot.add(water);
  pot.position.set(L.burners[1].x, BURNER_TOP, L.burners[1].z);
  scene.add(pot);
  // boiling bubbles at the surface
  const bubbleGeo = new THREE.SphereGeometry(1, 8, 6);
  const bubbles = new THREE.InstancedMesh(bubbleGeo, new THREE.MeshPhysicalMaterial({ color: 0xe8f2f6, roughness: 0.05, transparent: true, opacity: 0.55 }), 140);
  bubbles.count = 0; bubbles.frustumCulled = false; pot.add(bubbles);
  const bub = { x: new Float32Array(140), z: new Float32Array(140), t: new Float32Array(140), s: new Float32Array(140) };
  const rnd = mulberry32(5);
  for (let i = 0; i < 140; i++) { bub.t[i] = rnd(); bub.s[i] = 0.002 + rnd() * 0.004; const a = rnd() * 6.28, r = Math.sqrt(rnd()) * (po.r - 0.01); bub.x[i] = Math.cos(a) * r; bub.z[i] = Math.sin(a) * r; }

  const steam = new Puffs(scene, 500, 0xf2f2f2, 0.32);
  const smoke = new Puffs(scene, 400, 0x8a8a88, 0.4);
  const dummy = new THREE.Object3D();
  let tAcc = 0;

  return {
    pan, pot, water, oil, juice, board, plate, flames, knobs, steam, smoke,
    update(world, dt, rdt) {
      tAcc += rdt;
      world.burners.forEach((b, i) => {
        const fl = flames[i];
        fl.visible = b.setting > 0;
        const s = b.setting / 10;
        fl.scale.set(0.75 + 0.45 * s, 0.35 + 1.1 * s * (0.9 + 0.1 * Math.sin(tAcc * 30 + i)), 0.75 + 0.45 * s);
        knobs[i].rotation.z = -s * Math.PI * 1.4;
      });
      // water level and boiling
      const P = world.pot;
      const lvl = P.level() - BURNER_TOP;
      water.position.y = lvl;
      water.visible = P.water > 0.01;
      const boil = world.events.boil;
      const nb = Math.round(boil * 140);
      bubbles.count = nb;
      for (let i = 0; i < nb; i++) {
        bub.t[i] += rdt * (1.5 + 3 * boil);
        if (bub.t[i] > 1) { bub.t[i] = 0; const a = rnd() * 6.28, r = Math.sqrt(rnd()) * (po.r - 0.012); bub.x[i] = Math.cos(a) * r; bub.z[i] = Math.sin(a) * r; }
        const sc = bub.s[i] * Math.sin(Math.PI * bub.t[i]) * (0.4 + boil);
        dummy.position.set(bub.x[i], lvl + sc * 0.3, bub.z[i]); dummy.scale.set(sc, sc * 0.6, sc); dummy.updateMatrix();
        bubbles.setMatrixAt(i, dummy.matrix);
      }
      bubbles.instanceMatrix.needsUpdate = true;
      // steam from the pot (rises with temperature) and from food in the pan (evaporation rate)
      const potRate = P.T > 60 ? Math.pow((P.T - 60) / 40, 2) * (P.lid ? 0.3 : 1) * 40 : 0;
      for (let k = 0; k < potRate * rdt; k++) steam.emit(P.x, P.level() + 0.01, P.z, po.r * 0.8, 0.03, 2.5, 0.09);
      const sz = world.events.sizzle;
      const panRate = Math.min(120, sz * 1e5);
      for (let k = 0; k < panRate * rdt; k++) steam.emit(world.pan.x, world.pan.surfaceY + 0.02, world.pan.z, 0.06, 0.025, 1.6, 0.14);
      // smoke when the pan is far above the oil's smoke point or food is charring
      const smokeRate = world.smokeLevel ? world.smokeLevel * 60 : 0;
      for (let k = 0; k < smokeRate * rdt; k++) smoke.emit(world.pan.x, world.pan.surfaceY + 0.01, world.pan.z, 0.08, 0.04, 3, 0.1);
      steam.update(rdt); smoke.update(rdt);
      // juice pooled in the pan
      const pool = world.pan.pool;
      juice.visible = pool > 0.0003;
      if (juice.visible) { const r = Math.min(pp.r - 0.006, Math.sqrt(pool / (1000 * 0.0006) / Math.PI)); juice.scale.set(r, r, 1); }
      oil.visible = world.pan.oiled;
      // toaster: element glow follows its temperature (dull red ≈600 °C → orange ≈900 °C), lever down while toasting
      const ts = world.toaster, gl = Math.max(0, Math.min(1, (ts.Te - 450) / 450));
      glowMat.emissive.setRGB(1.0 * gl, 0.32 * gl * gl, 0.05 * gl * gl * gl);
      glowMat.emissiveIntensity = 1.6 * gl;
      for (const sl of slotLights) sl.intensity = 0.35 * gl;
      lever.position.set(TT.w / 2 + 0.012, ts.on ? 0.045 : TT.h - 0.03, 0);
      dial.rotation.y = -((ts.shade - 1) / 6) * Math.PI * 1.4;
    },
  };
}
