// WebGL2 stage: renderer, camera, orbit controls, environment, adaptive quality and the frame loop.
// Adapted from body-sim/js/core/stage.js (fluid passes removed).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const QUALITY = [
  { name: 'Low', pr: 0.75, shadows: false, shadowRes: 512 },
  { name: 'Medium', pr: 1.0, shadows: true, shadowRes: 1024 },
  { name: 'High', pr: 1.5, shadows: true, shadowRes: 2048 },
  { name: 'Ultra', pr: 2.0, shadows: true, shadowRes: 2048 },
];

export class Stage {
  constructor(container) {
    this.container = container;
    this.isMobile = matchMedia('(pointer: coarse)').matches || /Mobi|Android/i.test(navigator.userAgent);
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    container.prepend(r.domElement);
    r.domElement.setAttribute('aria-label', '3D kitchen table');
    r.domElement.tabIndex = 0;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 30);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 0.12;
    this.controls.maxDistance = 3.2;
    this.controls.maxPolarAngle = Math.PI * 0.49;

    const pmrem = new THREE.PMREMGenerator(r);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0.45;

    this.qualityMode = 'auto';
    this.level = this.isMobile ? 1 : 2;
    this.maxAutoLevel = this.isMobile ? 2 : 3;
    this._last = performance.now();
    this._acc = { t: 0, n: 0, good: 0 };
    this.fps = 0;
    this.onFrame = null;
    this.applyQuality();
    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(container);
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }
  get q() { return QUALITY[this.level]; }
  setQualityMode(mode) { this.qualityMode = mode; if (mode !== 'auto') this.level = +mode; this.applyQuality(); }
  applyQuality() {
    const q = this.q;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
    this.renderer.shadowMap.enabled = q.shadows;
    if (this.sun) { this.sun.castShadow = q.shadows; this.sun.shadow.mapSize.set(q.shadowRes, q.shadowRes); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null; }
    this._resize();
  }
  _resize() {
    const w = Math.max(1, this.container.clientWidth), h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  setCamera(pos, target, dur = 0.8) {
    const p = new THREE.Vector3(...pos), t = new THREE.Vector3(...target);
    if (dur <= 0) { this.camera.position.copy(p); this.controls.target.copy(t); this.controls.update(); this._tween = null; return; }
    this._tween = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: p, t1: t, k: 0, dur };
  }
  _loop(now) {
    requestAnimationFrame(this._loop);
    if (document.hidden) { this._last = now; return; }
    let rdt = (now - this._last) / 1000;
    this._last = now;
    if (!(rdt > 0)) rdt = 1 / 60;
    this._perf(rdt);
    rdt = Math.min(rdt, 1 / 15);
    if (this._tween) {
      const tw = this._tween;
      tw.k = Math.min(1, tw.k + rdt / tw.dur);
      const e = tw.k < 0.5 ? 4 * tw.k ** 3 : 1 - Math.pow(-2 * tw.k + 2, 3) / 2;
      this.camera.position.lerpVectors(tw.p0, tw.p1, e);
      this.controls.target.lerpVectors(tw.t0, tw.t1, e);
      if (tw.k >= 1) this._tween = null;
    }
    this.controls.update();
    try {
      this.onFrame?.(rdt, now);
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.error(err);
      this.onError?.(err);
      this.onFrame = null;
    }
  }
  _perf(dt) {
    const a = this._acc;
    a.t += dt; a.n++;
    if (a.t < 1) return;
    const avg = a.t / a.n;
    this.fps = 1 / avg;
    a.t = 0; a.n = 0;
    if (this.qualityMode !== 'auto') return;
    if (avg > 0.026 && this.level > 0) { this.level--; a.good = 0; this.applyQuality(); }
    else if (avg < 0.0135) { if (++a.good >= 4 && this.level < this.maxAutoLevel) { this.level++; a.good = 0; this.applyQuality(); } }
    else a.good = 0;
  }
}
