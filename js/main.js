// Kitchen Table: boot, frame loop and glue between the simulation, renderer, tools and panels.
//   ?test=all[&norender]  runs the behaviour tests in the page (results in #diag)
//   ?scene=<name>          stages a scene for screenshots
import { World } from './sim/world.js';
import { LAYOUT as L } from './sim/layout.js';
import { flipPiece, faceUp } from './sim/ops.js';
import { cutPiece, meshPiece } from './geom/cutpiece.js';
import { applyPreset } from './geom/presets.js';
import { stepBitPhysics } from './sim/bits.js';

const params = new URLSearchParams(location.search);
const diag = document.getElementById('diag');
const write = (s) => { diag.hidden = false; diag.textContent += s + '\n'; };

async function runTests() {
  const { runAll } = await import('./test/tests.js');
  const f = params.get('test');
  write('RUNNING ' + f);
  await new Promise((r) => setTimeout(r, 30));
  await runAll(write, f === 'all' ? null : new RegExp(f));
}

if (params.has('test') && params.has('norender')) {
  document.getElementById('stageMsg').textContent = 'Running tests…';
  runTests();
} else {
  boot().catch((e) => { console.error(e); document.getElementById('stageMsg').textContent = 'Could not start 3D: ' + e.message; write('ERROR ' + e.message); });
}

async function boot() {
  const THREE = await import('three');
  const { Stage } = await import('./render/stage.js');
  const { buildKitchen } = await import('./render/kitchen.js');
  const { FoodView } = await import('./render/foodview.js');
  const { Tools } = await import('./interact/tools.js');
  const { Hud } = await import('./ui/hud.js');
  const { Audio } = await import('./audio.js');
  const { BitView } = await import('./render/bitview.js');

  const stageEl = document.getElementById('stage');
  const stage = new Stage(stageEl);
  const world = new World();
  const app = { stage, world, views: new Map(), selected: null, speed: 1, thermal: false, audio: new Audio(), ff: null };
  window.__kt = app;
  app.bitView = new BitView(stage.scene);
  const kitchen = buildKitchen(stage);
  app.kitchen = kitchen;
  stage.setCamera([0.02, 0.92, 1.28], [0.0, 0.0, -0.03], 0);

  // probe visual
  const probeGroup = new THREE.Group();
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 1, 10), new THREE.MeshStandardMaterial({ color: 0xdadada, metalness: 1, roughness: 0.25 }));
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0xd2402f, roughness: 0.5 }));
  probeGroup.add(needle, grip); probeGroup.visible = false; stage.scene.add(probeGroup);

  const addView = (p, mesh) => {
    const v = new FoodView(p, mesh || meshPiece(p), stage.scene);
    v.setThermal(app.thermal);
    app.views.set(p, v);
    return v;
  };
  world.on((type, p) => {
    if (type === 'bits') { app.bitView.rebuild(world, p); return; }
    if (type === 'remove') { const v = app.views.get(p); if (v) { v.dispose(); app.views.delete(p); } if (app.selected === p) app.selectPiece(null); }
  });

  app.spawn = (id, opts) => {
    const p = world.add(id, opts);
    // find a free spot on the board
    const spots = [[-0.48, 0.08], [-0.27, 0.08], [-0.48, 0.2], [-0.27, 0.2], [-0.37, 0.14]];
    let spot = spots[0], best = -1;
    for (const s of spots) {
      let dmin = 1;
      for (const q of world.pieces) if (q !== p) { const b = q.bounds(); dmin = Math.min(dmin, Math.hypot((b.lo[0] + b.hi[0]) / 2 - s[0], (b.lo[2] + b.hi[2]) / 2 - s[1])); }
      if (dmin > best) { best = dmin; spot = s; }
    }
    world.place(p, 'board', spot);
    addView(p);
    app.selectPiece(p);
    hud.hint(`${p.label} on the board. Drag it with the hand tool, or cut it with the knife.`);
    setTimeout(() => hud.hint(''), 4000);
    return p;
  };
  app.clearTable = () => { world.clear(); app.removeProbe(); app.bitView.clear(); };
  app.removeBatch = (batch) => { world.removeBits(world.bits.filter((b) => b.batch === batch)); app.selectPiece(null); };
  app.selectBits = (bit) => { if (app.selected && app.views.get(app.selected)) app.views.get(app.selected).setHighlight(0); app.selected = null; hud.renderBits(bit, world); };
  app.onProbeBit = () => { hud.envHist = []; };
  app.applyPreset = (p, id) => {
    if (id === 'halve') return app.halveSelected();
    const t0 = performance.now();
    const res = applyPreset(world, p, id);
    if (!res) { hud.hint('That piece is already smaller than the cut.'); return; }
    for (const r of res.pieces) addView(r.piece, r.mesh);
    app.audio.chop(); setTimeout(() => app.audio.chop(), 90); setTimeout(() => app.audio.chop(), 180);
    const n = res.bits.length + res.pieces.length;
    hud.hint(`${n} pieces (${(performance.now() - t0).toFixed(0)} ms). Drag the pile with the hand tool.`);
    setTimeout(() => hud.hint(''), 3500);
    if (res.bits.length) app.selectBits(res.bits[0]); else if (res.pieces.length) app.selectPiece(res.pieces[0].piece);
  };
  app.selectPiece = (p) => {
    if (app.selected && app.views.get(app.selected)) app.views.get(app.selected).setHighlight(0);
    app.selected = p;
    if (p && app.views.get(p)) app.views.get(p).setHighlight(0.18);
    hud.renderItem(p);
    hud.updateItem(p, world);
  };
  app.setHover = (p) => { stage.renderer.domElement.style.cursor = p ? (app.tools.tool === 'hand' ? 'grab' : 'pointer') : ''; };
  app.onTool = (id) => { hud.setTool(id); stage.renderer.domElement.style.cursor = id === 'knife' ? 'crosshair' : ''; };
  app.hint = (s) => hud.hint(s);
  app.dropPreview = (t) => { if (t) hud.hint({ pan: 'Into the pan', pot: 'Into the pot', board: 'Onto the board', plate: 'Onto the plate', table: 'Onto the table' }[t.kind]); };
  app.setSpeed = (s) => {
    app.speed = s; app.ff = null;
    document.querySelectorAll('#speed button').forEach((b) => b.classList.toggle('on', +b.dataset.speed === s));
  };
  app.setThermal = (on) => {
    app.thermal = on;
    for (const v of app.views.values()) v.setThermal(on);
    document.getElementById('btnThermal').classList.toggle('on', on);
  };
  app.onProbe = (p, tip, entry) => {
    const d = [entry[0] - tip[0], entry[1] - tip[1], entry[2] - tip[2]];
    const l = Math.hypot(...d) || 1;
    world.probe.restDir = d.map((x) => x / l);
    hud.envHist = [];
    app.selectPiece(p);
  };
  app.removeProbe = () => { world.probe = null; probeGroup.visible = false; };
  app.fastForward = (target) => {
    if (!world.probe) { hud.hint('Insert the probe first (P), then fast-forward.'); setTimeout(() => hud.hint(''), 3000); return; }
    app.ff = { target, rising: world.probe.T < target, until: world.t + 4 * 3600 };
    hud.hint(`Fast-forwarding until the probe reads ${target} °C…`);
  };
  app.flipSelected = () => { if (app.selected) flipPiece(world, app.selected); };
  app.removeSelected = () => { if (app.selected) world.remove(app.selected); };
  app.showCutFace = () => {
    const p = app.selected;
    if (!p || !p.capNormals || !p.capNormals.length) { hud.hint('Cut it first (knife or "Cut in half"), then show the cut face.'); setTimeout(() => hud.hint(''), 3000); return; }
    const n = p.capNormals[p.capNormals.length - 1];
    faceUp(world, p, n);
  };
  app.halveSelected = () => {
    const p = app.selected; if (!p) return;
    const b = p.bounds();
    const c = [(b.lo[0] + b.hi[0]) / 2, (b.lo[1] + b.hi[1]) / 2, (b.lo[2] + b.hi[2]) / 2];
    const nW = b.hi[0] - b.lo[0] >= b.hi[2] - b.lo[2] ? [1, 0, 0] : [0, 0, 1];
    doCut(p, nW, c);
  };
  function doCut(p, nW, pW) {
    const v = app.views.get(p);
    if (!v) return [];
    const res = cutPiece(world, p, v.meshData, nW, pW, 0.006);
    if (!res) return [];
    for (const r of res) addView(r.piece, r.mesh);
    app.audio.chop();
    app.selectPiece(res[0].piece);
    return res;
  }
  app.cutAlongScreenLine = (c) => {
    // find the food under the line, then cut with a vertical plane through the line
    const r = stage.renderer.domElement.getBoundingClientRect();
    const hits = [];
    for (let i = 0; i <= 24; i++) {
      const x = c.x0 + ((c.x1 - c.x0) * i) / 24, y = c.y0 + ((c.y1 - c.y0) * i) / 24;
      const h = app.tools.pickFood({ clientX: r.left + x, clientY: r.top + y });
      if (h) hits.push(h);
    }
    if (!hits.length) { hud.hint('Draw the cut line across a piece of food.'); setTimeout(() => hud.hint(''), 2500); return; }
    const yCut = Math.max(...hits.map((h) => h.point.y));
    const pts = [[c.x0, c.y0], [c.x1, c.y1]].map(([x, y]) => { app.tools.setRay({ clientX: r.left + x, clientY: r.top + y }); return app.tools.planeHit(yCut); });
    if (!pts[0] || !pts[1]) return;
    const u = new THREE.Vector3().subVectors(pts[1], pts[0]); u.y = 0; u.normalize();
    const nW = [-u.z, 0, u.x];
    const pW = [pts[0].x, yCut, pts[0].z];
    const targets = new Set(hits.map((h) => h.piece));
    for (const p of targets) doCut(p, nW, pW);
  };
  app.showCutLine = (c) => {
    const svg = document.getElementById('cutline'), ln = svg.querySelector('line');
    svg.classList.add('on');
    ln.setAttribute('x1', c.x0); ln.setAttribute('y1', c.y0); ln.setAttribute('x2', c.x1); ln.setAttribute('y2', c.y1);
  };
  app.hideCutLine = () => document.getElementById('cutline').classList.remove('on');

  /** Screen position (client px) of a world point, for automated UI tests. */
  app.screenOf = (x, y, z) => {
    const v = new THREE.Vector3(x, y, z).project(stage.camera);
    const r = stage.renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  };
  app.pieceScreen = (p) => { const b = p.bounds(); return app.screenOf((b.lo[0] + b.hi[0]) / 2, b.hi[1], (b.lo[2] + b.hi[2]) / 2); };
  const hud = new Hud(app);
  app.hud = hud;
  app.tools = new Tools(app);
  app.tools.select('hand');

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k === 'h') app.tools.select('hand');
    else if (k === 't') app.tools.select('tongs');
    else if (k === 'p') app.tools.select('probe');
    else if (k === 'k') app.tools.select('knife');
    else if (k === 's') app.tools.select('spatula');
    else if (k === 'e') app.tools.select('peeler');
    else if (k === 'j') app.tools.select('lemon');
    else if (k === 'v') app.setThermal(!app.thermal);
    else if (k === ' ') { e.preventDefault(); app.setSpeed(app.speed ? 0 : 1); }
    else if (k === 'delete' || k === 'backspace') app.removeSelected();
  });

  // scenes for screenshots / quick demos
  const scene = params.get('scene');
  if (scene) await stageScene(scene, app);

  let envAcc = 0;
  stage.onFrame = (rdt, now) => {
    // simulation: real time × speed, or fast-forward in ~20 ms slices
    if (app.ff) {
      const t0 = performance.now();
      while (performance.now() - t0 < 22) {
        world.tick(world.dt);
        const T = world.probe ? world.probe.T : NaN;
        if (!world.probe || (app.ff.rising ? T >= app.ff.target : T <= app.ff.target) || world.t > app.ff.until) { app.ff = null; hud.hint(''); break; }
      }
    } else if (app.speed > 0) {
      world.advance(rdt * app.speed, 3);
    }
    // keep a pan/water temperature history for the probe chart
    envAcc += rdt;
    if (world.probe && envAcc > 0.25) {
      envAcc = 0;
      const sup = world.probe.piece.support ? world.probe.piece.support.kind : '';
      (hud.envHist ||= []).push([world.t, sup === 'pot' ? world.pot.T : world.pan.T]);
      if (hud.envHist.length > 4000) hud.envHist.splice(0, 1000);
    }
    // smoke: the fat in the pan past its smoke point, or food charring in the pan
    let charring = 0;
    for (const p of world.pieces) if (p.support && p.support.kind === 'pan') { const g = p.grid; for (let s = 0; s < g.nSkin; s += 7) if (g.Ts[s] > 230) charring += 0.02; }
    for (const b of world.bits) if (b.support === 'pan' && b.Ts > 200) charring += 0.01;
    world.smokeLevel = Math.max(0, Math.min(1, (world.pan.smokePoint ? (world.pan.T - world.pan.smokePoint) / 40 : 0) + charring));
    // physics for bits (real time), then their instances
    const awake = world.bits.filter((b) => !b.held && (b.sleep < 0.6 || b.wake));
    if (awake.length) stepBitPhysics(world, world.bits.filter((b) => !b.held), rdt);
    app.bitView.sync(false, rdt);
    for (const v of app.views.values()) v.sync(now);
    kitchen.update(world, rdt * app.speed, rdt);
    // probe visual
    const pr = world.probe;
    probeGroup.visible = !!pr;
    if (pr && pr.restDir) {
      const p = pr.piece;
      const tip = new THREE.Vector3(...p.toWorld(pr.rest));
      const dirW = new THREE.Vector3(...pr.restDir).applyQuaternion(new THREE.Quaternion(...p.quat)).normalize();
      const len = 0.12;
      needle.scale.set(1, len, 1);
      needle.position.copy(tip).addScaledVector(dirW, len / 2);
      needle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirW);
      grip.position.copy(tip).addScaledVector(dirW, len + 0.02);
      grip.quaternion.copy(needle.quaternion);
    }
    app.audio.update(world, rdt);
    hud.tick(world, app.selected, rdt);
  };
  document.getElementById('stageMsg').classList.add('hide');
  if (params.has('test')) await runTests();
  else write.call(null, 'RENDER ok');
  if (!params.has('test') && !params.has('debug')) diag.hidden = true;
}

/** Pre-cooked scenes so screenshots and first impressions show something real. */
async function stageScene(name, app) {
  const W = app.world;
  const spawn = (id, opts, kind, xz) => { const p = W.add(id, opts); W.place(p, kind, xz); app.views.size; return p; };
  const { FoodView } = await import('./render/foodview.js');
  const mk = (p) => { const v = new FoodView(p, meshPiece(p), app.stage.scene); app.views.set(p, v); };
  if (name === 'steak') {
    W.burners[0].setting = 6;
    for (let i = 0; i < 600; i++) W.tick(1);
    const p = spawn('steak', { T0: 4 }, 'pan');
    let t = 0;
    while (p.coreT() < 54) { W.tick(1); t++; if (t % 60 === 0) flipPiece(W, p); }
    W.place(p, 'board', [L.board.x, L.board.z]);
    for (let i = 0; i < 120; i++) W.tick(1);
    mk(p);
    const b = p.bounds();
    const res = cutPiece(W, p, null || meshPiece(p), [1, 0, 0], [(b.lo[0] + b.hi[0]) / 2 + 0.02, 0.03, 0], 0.012);
    for (const v of [...app.views.values()]) if (!W.pieces.includes(v.piece)) { v.dispose(); app.views.delete(v.piece); }
    for (const r of res) { const v = new FoodView(r.piece, r.mesh, app.stage.scene); app.views.set(r.piece, v); }
    const small = res.sort((a, b2) => a.piece.mass() - b2.piece.mass())[0].piece;
    faceUp(W, small, small.capNormals[small.capNormals.length - 1]);
    W.place(small, 'board', [L.board.x + 0.12, L.board.z + 0.02]);
    W.burners[0].setting = 0;
    app.stage.setCamera(params.has('top') ? [-0.255, 0.2, 0.131] : [-0.33, 0.27, 0.36], [-0.255, 0.03, 0.13], 0);
  } else if (name === 'egg') {
    W.pot.T = 100; W.burners[1].setting = 8;
    const e1 = spawn('egg', { T0: 4 }, 'pot');
    for (let i = 0; i < 390; i++) W.tick(1);
    W.place(e1, 'board', [L.board.x, L.board.z]);
    const res = cutPiece(W, e1, meshPiece(e1), [1, 0, 0], [L.board.x, 0.05, L.board.z], 0.01);
    for (const r of res) { const v = new FoodView(r.piece, r.mesh, app.stage.scene); app.views.set(r.piece, v); }
    for (const r of res) faceUp(W, r.piece, r.piece.capNormals[0]);
    W.place(res[0].piece, 'board', [L.board.x - 0.05, L.board.z]); W.place(res[1].piece, 'board', [L.board.x + 0.05, L.board.z]);
    app.stage.setCamera([-0.37, 0.25, 0.3], [-0.37, 0.03, 0.13], 0);
  } else if (name === 'veg') {
    // produce cut open on the board, diced onion sweating in the pan
    W.burners[0].setting = 3;
    for (let i = 0; i < 300; i++) W.tick(1);
    const spots = [['onion', -0.52, 0.06], ['tomato', -0.40, 0.06], ['apple', -0.28, 0.06], ['lemon', -0.52, 0.19], ['avocado', -0.38, 0.2], ['strawberry', -0.26, 0.2]];
    for (const [id, x, z] of spots) {
      const p = W.add(id); W.place(p, 'board', [x, z]);
      const b = p.bounds();
      const res = cutPiece(W, p, meshPiece(p), [0, 0, 1], [(b.lo[0] + b.hi[0]) / 2, 0.03, (b.lo[2] + b.hi[2]) / 2], 0.004);
      for (const r of res) { faceUp(W, r.piece, r.piece.capNormals[r.piece.capNormals.length - 1]); const v = new FoodView(r.piece, meshPiece(r.piece), app.stage.scene); app.views.set(r.piece, v); }
      const bb = res[1].piece.bounds(); W.place(res[1].piece, 'board', [x + 0.0, z + 0.045]);
      W.place(res[0].piece, 'board', [x, z - 0.0]);
    }
    const on = W.add('onion'); W.place(on, 'board', [-0.1, 0.25]);
    applyPreset(W, on, 'dice_m', { noMesh: true });
    const pan = W.bits.filter((b) => b.foodId === 'onion');
    pan.forEach((b, i) => { const a = i * 2.4, r = 0.07 * Math.sqrt((i + 0.5) / pan.length); b.pos = [W.pan.x + Math.cos(a) * r, W.pan.surfaceY + 0.02 + (i % 3) * 0.008, W.pan.z + Math.sin(a) * r]; b.support = 'pan'; b.sleep = 0; });
    for (let i = 0; i < 420; i++) { W.tick(1); if (i % 30 === 0) for (const b of pan) b.stirred = true; }
    const c = W.add('carrot'); W.place(c, 'board', [-0.35, 0.235]); const cv = new FoodView(c, meshPiece(c), app.stage.scene); app.views.set(c, cv);
    for (let i = 0; i < 240; i++) W.tick(1); // let the cut apple and avocado brown a little
    app.stage.setCamera(params.has('pan') ? [0.16, 0.36, 0.2] : params.has('close') ? [-0.4, 0.22, 0.29] : [-0.39, 0.36, 0.36], params.has('pan') ? [0.16, 0.09, -0.04] : params.has('close') ? [-0.4, 0.03, 0.14] : [-0.39, 0.03, 0.13], 0);
  } else if (name === 'kitchen') {
    W.burners[0].setting = 6; W.burners[1].setting = 9; W.pot.T = 97;
    for (let i = 0; i < 400; i++) W.tick(1);
    const s = spawn('steak', { T0: 4 }, 'pan'); mk(s);
    const e = spawn('egg', { T0: 4 }, 'pot'); mk(e);
    const p = spawn('potato', {}, 'board', [L.board.x - 0.08, L.board.z]); mk(p);
    for (let i = 0; i < 90; i++) W.tick(1);
  }
}
