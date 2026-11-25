// Panels: tool rail, pantry, stove controls, selected-item readout, probe with chart, sources.
import { el, fmtT, fmtClock } from './dom.js';
import { LineChart, legend } from './charts.js';
import { TOOLS } from '../interact/tools.js';
import { P, SRC, pv } from '../sim/params.js';
import { FOODS } from '../sim/foods.js';
import { PRESETS } from '../geom/presets.js';

export const CATEGORIES = [
  { id: 'veg', name: 'Fruit & veg' },
  { id: 'meat', name: 'Meat & fish' },
  { id: 'dairy', name: 'Dairy & eggs' },
  { id: 'bakery', name: 'Bakery & cakes' },
  { id: 'sweets', name: 'Sweets' },
];
const SW = {
  steak: 'linear-gradient(135deg,#9b2b2f,#5c1418)', egg: 'radial-gradient(circle at 40% 35%,#fffaf0,#e6dccb)', potato: 'radial-gradient(circle at 40% 35%,#b98a55,#6e4a26)',
  onion: 'radial-gradient(circle at 40% 35%,#e6c28a,#9a6a34)', carrot: 'linear-gradient(135deg,#f08a2a,#c2560f)', tomato: 'radial-gradient(circle at 40% 35%,#f05a45,#a5170e)',
  apple: 'radial-gradient(circle at 40% 35%,#e0473f,#8c1418)', lemon: 'radial-gradient(circle at 40% 35%,#ffe766,#e0b812)', banana: 'linear-gradient(135deg,#f7dc5a,#d6a823)',
  strawberry: 'radial-gradient(circle at 40% 35%,#ef4b5a,#a3101e)', avocado: 'radial-gradient(circle at 40% 35%,#4b5f2a,#1d2810)', garlic: 'radial-gradient(circle at 40% 35%,#fbf6ea,#d8ccb2)',
  pepper: 'radial-gradient(circle at 40% 35%,#ef3a2a,#9a1208)',
};

const OILS = [['none', 'Dry pan', null], ['butter', 'Butter', 'smoke_butter'], ['ghee', 'Ghee', 'smoke_ghee'], ['evoo', 'Extra-virgin olive oil', 'smoke_evoo'], ['olive', 'Refined olive oil', 'smoke_olive'], ['canola', 'Canola oil', 'smoke_canola'], ['sunflower', 'Sunflower oil', 'smoke_sunflower'], ['peanut', 'Peanut oil', 'smoke_peanut']];
const flameLabel = (s) => (s <= 0 ? 'Off' : s < 2.5 ? 'Simmer' : s < 4.5 ? 'Low' : s < 6.5 ? 'Medium' : s < 8.5 ? 'Medium-high' : 'High');

export class Hud {
  constructor(app) {
    this.app = app;
    this.buildTools();
    this.buildPantry();
    this.buildPresets();
    this.buildViews();
    this.buildStove();
    this.itemCard = document.getElementById('itemCard');
    this.probeCard = document.getElementById('probeCard');
    this.buildProbe();
    this.renderItem(null);
    this.buildSources();
    document.getElementById('btnHelp').onclick = () => document.getElementById('dlgHelp').showModal();
    document.getElementById('btnSources').onclick = () => document.getElementById('dlgSources').showModal();
    const th = document.getElementById('btnThermal');
    th.onclick = () => app.setThermal(!app.thermal);
    document.querySelectorAll('#speed button').forEach((b) => (b.onclick = () => app.setSpeed(+b.dataset.speed)));
    this.clock = document.getElementById('clock');
    this.hintEl = document.getElementById('hint');
    this._t = 0;
  }
  buildTools() {
    const nav = document.getElementById('tools');
    this.toolBtns = {};
    for (const t of TOOLS) {
      const b = el('button', { class: 'tool', 'data-tip': t.tip, 'aria-label': t.name, title: '', onclick: () => this.app.tools.select(t.id) });
      b.innerHTML = `<svg viewBox="0 0 24 24">${t.svg}</svg><span class="key">${t.key}</span>`;
      nav.append(b);
      this.toolBtns[t.id] = b;
    }
  }
  setTool(id) { for (const k in this.toolBtns) this.toolBtns[k].classList.toggle('on', k === id); document.getElementById('presets').classList.toggle('show', id === 'knife'); }
  buildPantry() {
    const p = document.getElementById('pantry');
    this.cat = 'veg'; this.fromFridge = false; this.search = '';
    const tabs = el('div', { class: 'ptabs', role: 'tablist' });
    for (const c of CATEGORIES) {
      const b = el('button', { role: 'tab', 'data-cat': c.id, onclick: () => { this.cat = c.id; this.search = ''; srch.value = ''; this.renderPantry(); } }, c.name);
      tabs.append(b);
    }
    const srch = el('input', { type: 'search', placeholder: 'Search food', 'aria-label': 'Search food', class: 'psearch' });
    srch.oninput = () => { this.search = srch.value.trim().toLowerCase(); this.renderPantry(); };
    const temp = el('div', { class: 'seg small', role: 'group', 'aria-label': 'Starting temperature' });
    this.startT = 'typical';
    const tb = (lbl, v, tip) => el('button', { title: tip, onclick: (e) => { this.startT = v; [...temp.children].forEach((x) => x.classList.toggle('on', x === e.currentTarget)); } }, lbl);
    temp.append(tb('As stored', 'typical', 'Where you would normally keep it'), tb('Room', 22, 'Room temperature, 22 °C'), tb('Fridge', 4, 'From the fridge, 4 °C'), tb('Freezer', -18, 'Frozen, −18 °C'));
    temp.children[0].classList.add('on');
    const clear = el('button', { class: 'tbtn', title: 'Remove everything from the table', onclick: () => this.app.clearTable() }, 'Clear table');
    this.pantryItems = el('div', { class: 'pitems' });
    p.append(el('div', { class: 'phead' }, tabs, srch, temp, clear), this.pantryItems);
    this.renderPantry();
  }
  renderPantry() {
    const box = this.pantryItems;
    box.replaceChildren();
    document.querySelectorAll('.ptabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.cat === this.cat && !this.search)));
    const items = Object.entries(FOODS).filter(([id, f]) => f.cat && (this.search ? f.name.toLowerCase().includes(this.search) : f.cat === this.cat));
    for (const [id, f] of items) {
      const [name, size] = f.name.split(' (');
      const b = el('button', { class: 'food', title: `Put ${name.toLowerCase()} on the board`, onclick: () => this.app.spawn(id, { T0: this.startT === 'typical' ? f.storeT ?? (f.cat === 'meat' || f.cat === 'dairy' ? 4 : 22) : this.startT }) },
        el('span', { class: 'sw', style: `background:${SW[id] || '#888'}` }), el('span', {}, name, el('small', {}, size ? '(' + size : '')));
      box.append(b);
    }
    if (!items.length) box.append(el('span', { class: 'lbl' }, this.search ? 'Nothing matches.' : 'Coming in the next update.'));
  }
  buildPresets() {
    const bar = document.getElementById('presets');
    const btns = [];
    const mk = (id, name, sub) => {
      const b = el('button', { onclick: () => { this.app.knifePreset = id; btns.forEach((x) => x.classList.toggle('on', x === b)); this.hint(id === 'free' ? 'Drag a line across food to cut it' : `Click food to cut it: ${name}${sub ? ' (' + sub + ')' : ''}`); } }, name, sub ? el('small', {}, sub) : null);
      btns.push(b); bar.append(b); return b;
    };
    mk('free', 'Free cut', 'drag a line').classList.add('on');
    for (const p of PRESETS) mk(p.id, p.name, p.sub);
    this.app.knifePreset = 'free';
  }
  buildViews() {
    const v = document.getElementById('views');
    for (const [name, pos, target] of [
      ['Overview', [0.02, 0.92, 1.28], [0.0, 0.0, -0.03]],
      ['Board', [-0.37, 0.42, 0.55], [-0.37, 0.03, 0.13]],
      ['Stove', [0.3, 0.45, 0.42], [0.3, 0.08, -0.04]],
      ['Pan', [0.16, 0.3, 0.22], [0.16, 0.09, -0.04]],
      ['Plate', [-0.37, 0.35, 0.12], [-0.37, 0.02, -0.24]],
      ['Fridge', [-0.62, 0.36, 0.32], [-0.66, 0.12, -0.25]],
    ]) v.append(el('button', { onclick: () => this.app.stage.setCamera(pos, target) }, name));
  }
  buildStove() {
    const card = document.getElementById('stoveCard');
    const W = this.app.world;
    card.append(el('h3', {}, 'Stove'));
    const mk = (i, name, sub) => {
      const val = el('span', { class: 'big' }, '—');
      const st = el('span', { class: 'sub' }, '');
      const fl = el('span', { class: 'sub' }, 'Off');
      const range = el('input', { type: 'range', min: 0, max: 10, step: 0.5, value: 0, 'aria-label': `${name} flame` });
      range.oninput = () => { W.burners[i].setting = +range.value; fl.textContent = flameLabel(+range.value); this.app.audio?.start(); };
      const box = el('div', { class: 'burner' },
        el('div', { class: 'row' }, el('span', {}, el('span', { class: 'name' }, name), ' ', el('span', { class: 'sub' }, sub)), val),
        el('div', { class: 'row' }, fl, st),
        range, el('div', { class: 'ticks' }, el('span', {}, 'Off'), el('span', {}, 'Low'), el('span', {}, 'Med'), el('span', {}, 'High')));
      card.append(box);
      return { val, st, fl, range, box };
    };
    this.pan = mk(0, 'Pan', 'cast iron, 2.4 kg');
    const oil = el('select', { class: 'oilsel', 'aria-label': 'Fat in the pan' });
    for (const [id, name, smoke] of OILS) oil.append(el('option', { value: id }, smoke ? `${name} · smokes ≈${pv(smoke)} °C` : name));
    oil.value = 'canola';
    oil.onchange = () => setOil(oil.value);
    const setOil = (id) => { const o = OILS.find((x) => x[0] === id); W.pan.oil = id; W.pan.oiled = id !== 'none'; W.pan.smokePoint = o[2] ? pv(o[2]) : null; };
    setOil('canola');
    this.pan.box.append(el('div', { class: 'btnrow' }, el('label', { class: 'chk' }, 'Fat', oil), el('button', { class: 'tbtn', onclick: () => { W.pan.pool = 0; } }, 'Wipe pan')));
    this.pot = mk(1, 'Pot', '2 L water');
    const lid = el('input', { type: 'checkbox' });
    lid.onchange = () => { W.pot.lid = lid.checked; };
    this.pot.box.append(el('div', { class: 'btnrow' }, el('label', { class: 'chk' }, lid, 'Lid on'), el('button', { class: 'tbtn', onclick: () => { W.pot.water = pv('pot_water'); W.pot.T = 20; } }, 'Fresh water')));
  }
  buildProbe() {
    const c = this.probeCard;
    c.append(el('h3', {}, 'Thermometer', el('span', { class: 'x sub' }, 'probe τ = 0.4 s')));
    this.probeVal = el('div', { class: 'big' }, '—');
    this.probeSub = el('div', { class: 'sub' }, 'Pick the probe (P) and click food to measure its centre.');
    this.chartBox = el('div', {});
    this.ffInput = el('input', { type: 'number', value: 54, step: 1, min: 0, max: 200, 'aria-label': 'Target temperature' });
    this.ffBtn = el('button', { class: 'tbtn', onclick: () => this.app.fastForward(+this.ffInput.value) }, 'Fast-forward');
    this.ffRow = el('div', { class: 'ff' }, 'Until it reads', this.ffInput, '°C', this.ffBtn);
    const rm = el('button', { class: 'tbtn', onclick: () => this.app.removeProbe() }, 'Remove probe');
    c.append(this.probeVal, this.probeSub, this.chartBox, this.ffRow, el('div', { class: 'btnrow' }, rm));
    this.chart = new LineChart(this.chartBox, { height: 120, x: { min: 0, max: 60, label: 'min', fmt: (v) => v.toFixed(0) }, y: { min: 0, max: 100, fmt: (v) => v.toFixed(0) }, series: [] });
    this.legendBox = el('div', {});
    c.append(this.legendBox);
  }
  renderBits(bit, W) {
    const c = this.itemCard;
    c.replaceChildren(el('h3', {}, 'Selected'));
    this.itemRows = null;
    this.bitSel = bit;
    this.itemTitle = el('div', { style: 'font-weight:600;margin-bottom:6px' }, bit.label + ', cut');
    const dl = el('dl', { class: 'kv' });
    const row = (k) => { const dd = el('dd', {}, '—'); dl.append(el('dt', {}, k), dd); return dd; };
    this.bitRows = { n: row('Pieces'), size: row('Size'), where: row('On'), core: row('Centre (mean)'), soft: row('Texture'), brown: row('Browning'), enz: row('Browned in air'), mass: row('Weight') };
    c.append(this.itemTitle, dl, el('div', { class: 'btnrow' }, el('button', { class: 'tbtn', onclick: () => this.app.removeBatch(bit.batch) }, 'Remove')));
    this.updateBits(W);
  }
  updateBits(W) {
    const b0 = this.bitSel; if (!b0 || !this.bitRows) return;
    const bits = W.bits.filter((b) => b.batch === b0.batch);
    if (!bits.length) { this.renderItem(null); return; }
    const r = this.bitRows, n = bits.length;
    const avg = (f) => bits.reduce((a, b) => a + f(b), 0) / n;
    r.n.textContent = String(n);
    r.size.textContent = b0.dims.map((d) => (d * 1000).toFixed(0)).sort((a, b) => b - a).join(' × ') + ' mm';
    const sup = { pan: 'the pan', pot: 'the pot', board: 'the board', plate: 'the plate', table: 'the table' };
    r.where.textContent = sup[bits[0].support] || 'the board';
    r.core.textContent = fmtT(avg((b) => b.Tc));
    const firm = avg((b) => b.procs.firm ?? 1);
    r.soft.textContent = firm > 0.9 ? 'raw, crisp' : firm > 0.5 ? 'crisp-tender' : firm > 0.15 ? 'tender, translucent' : 'very soft';
    const br = avg((b) => b.brown);
    r.brown.textContent = br < 0.05 ? 'none' : br < 0.4 ? 'light golden' : br < 1.2 ? 'golden-brown' : br < 2.5 ? 'deep brown' : 'very dark';
    const ez = avg((b) => b.enz);
    r.enz.textContent = ez < 0.3 ? 'no' : ez < 1 ? 'starting' : 'yes';
    r.mass.textContent = `${(bits.reduce((a, b) => a + b.mass(), 0) * 1000).toFixed(0)} g`;
  }
  renderItem(p) {
    this.bitSel = null; this.bitRows = null;
    const c = this.itemCard;
    c.replaceChildren(el('h3', {}, 'Selected'));
    if (!p) { c.append(el('div', { class: 'empty' }, 'Click a piece of food to see what is happening inside it.')); this.itemRows = null; return; }
    this.itemTitle = el('div', { style: 'font-weight:600;margin-bottom:6px' }, p.label);
    const dl = el('dl', { class: 'kv' });
    const row = (k) => { const dd = el('dd', {}, '—'); dl.append(el('dt', {}, k), dd); return dd; };
    this.itemRows = { where: row('On'), core: row('Centre'), coldest: row('Coldest point'), surf: row('Surface'), done: row('Doneness'), safe: row('USDA safety'), mass: row('Weight'), brown: row('Browning'), state: row('Frozen / melted') };
    const acts = el('div', { class: 'btnrow' },
      p.mould ? el('button', { class: 'tbtn', onclick: () => this.app.unmouldSelected() }, 'Unmould') : null,
      el('button', { class: 'tbtn', onclick: () => this.app.flipSelected() }, 'Flip'),
      el('button', { class: 'tbtn', onclick: () => this.app.showCutFace() }, 'Show cut face'),
      el('button', { class: 'tbtn', onclick: () => this.app.halveSelected() }, 'Cut in half'),
      el('button', { class: 'tbtn', onclick: () => this.app.removeSelected() }, 'Remove'));
    c.append(this.itemTitle, dl, acts);
  }
  updateItem(p, W) {
    if (!p || !this.itemRows) return;
    const r = this.itemRows;
    const where = { pan: 'the pan', pot: 'the pot', board: 'the board', plate: 'the plate', table: 'the table', hand: 'your hand', fridge: 'the fridge', freezer: 'the freezer' };
    r.where.textContent = where[p.support ? p.support.kind : 'table'];
    r.core.textContent = fmtT(p.coreT());
    r.coldest.textContent = fmtT(p.minT());
    r.surf.textContent = fmtT(p.surfaceT());
    r.done.textContent = p.doneness() || '—';
    if (p.def.safe) {
      const ok = p.safe;
      r.safe.replaceChildren(el('span', { class: 'tag ' + (ok ? 'good' : 'warn') }, ok ? 'safe' : p.def.safe === 'beef' ? 'not yet (63 °C + 3 min)' : p.def.safe === 'egg' ? 'not yet (yolk & white firm)' : 'not yet'));
    } else r.safe.textContent = 'n/a';
    const m = p.mass() * 1000 + p.shell * 1000, m0 = p.initMass * 1000 + p.shell * 1000;
    r.mass.textContent = `${m.toFixed(0)} g (−${Math.max(0, (1 - m / m0) * 100).toFixed(1)} %)`;
    const b = p.skinMean(p.grid.brown);
    r.brown.textContent = b < 0.05 ? 'none' : b < 0.4 ? 'light' : b < 1.2 ? 'golden-brown' : b < 2.5 ? 'deep brown' : 'very dark';
    // frozen water share and melted share
    const g = p.grid; let fz = 0, wsum = 0;
    for (let c = 0; c < g.N; c += 3) if (g.occ[c]) { const m = p.mats[g.mat[c]]; const fi = g.T[c] < m.Tf ? Math.max(0, (1 - m.rb) * (1 - m.Tf / g.T[c])) : 0; fz += fi * g.mw[c]; wsum += g.mw[c]; }
    const fzp = wsum > 0 ? (fz / wsum) * 100 : 0, liq = g.proc.liq ? p.procMean('liq') * 100 : null;
    const gelT = p.mats[0].def.gelatin;
    r.state.textContent = fzp > 0.5 ? `${fzp.toFixed(0)} % of water frozen` : liq != null ? (gelT ? (liq > 80 ? 'liquid' : liq > 20 ? `setting (${(100 - liq).toFixed(0)} % set)` : 'set') + (p.wob && p.wob.f ? ` · wobbles at ${p.wob.f.toFixed(1)} Hz` : '') : `${liq.toFixed(0)} % melted${p.temper && p.temper !== 'tempered' ? ' (temper lost)' : ''}`) : 'no';
  }
  updateProbe(W) {
    const pr = W.probe;
    if (!pr) { this.probeVal.textContent = '—'; this.probeSub.textContent = 'Pick the probe (P) and click food to measure its centre.'; return; }
    this.probeVal.textContent = fmtT(pr.Tshown);
    this.probeSub.textContent = pr.bit ? `In: a piece of ${pr.bit.label.toLowerCase()}` : `In: ${pr.piece.label.toLowerCase()} · tip at its thermal centre`;
    const h = pr.history;
    if (!h.length) return;
    const t0 = h[0][0], t1 = Math.max(h[h.length - 1][0], t0 + 60);
    const step = Math.max(1, Math.floor(h.length / 300));
    const pts = []; for (let i = 0; i < h.length; i += step) pts.push([(h[i][0] - t0) / 60, h[i][1]]);
    pts.push([(h[h.length - 1][0] - t0) / 60, h[h.length - 1][1]]);
    const sup = pr.bit ? pr.bit.support : pr.piece.support ? pr.piece.support.kind : '';
    const series = [{ name: 'Probe', color: '#f2a65a', points: pts }];
    if (this.envHist && this.envHist.length) series.push({ name: sup === 'pot' ? 'Water' : 'Pan', color: '#6aa7ff', points: this.envHist.filter((x) => x[0] >= t0).map(([t, v]) => [(t - t0) / 60, v]), dash: '3 3' });
    let ymax = 20; for (const s of series) for (const [, y] of s.points) ymax = Math.max(ymax, y);
    this.chart.update({ x: { min: 0, max: (t1 - t0) / 60, label: 'min', fmt: (v) => v.toFixed(v < 10 ? 1 : 0) }, y: { min: 0, max: Math.ceil(ymax / 20) * 20, fmt: (v) => v.toFixed(0) }, series, valueFmt: (v) => v.toFixed(1) + ' °C' });
    this.legendBox.replaceChildren(legend(series.map((s) => ({ name: s.name, color: s.color }))));
  }
  updateStove(W) {
    // keep the sliders in step with the burners (scenes and tests can set them directly)
    for (const [ui, b] of [[this.pan, W.burners[0]], [this.pot, W.burners[1]]]) {
      if (document.activeElement !== ui.range && +ui.range.value !== b.setting) { ui.range.value = b.setting; ui.fl.textContent = flameLabel(b.setting); }
    }
    this.pan.val.textContent = fmtT(W.pan.T, 0);
    const bp = W.pan.butter;
    this.pan.st.textContent = W.pan.smokePoint && W.pan.T > W.pan.smokePoint ? 'fat smoking!' : bp ? (bp.foam > 0.05 ? 'butter foaming' : bp.brown > 0.4 ? 'brown butter' : 'melted butter') : W.pan.pool > 0.0005 ? `juice ${(W.pan.pool * 1000).toFixed(0)} g` : '';
    this.pot.val.textContent = fmtT(W.pot.T, 0);
    const P = W.pot;
    this.pot.st.textContent = P.water < 0.05 ? 'boiled dry!' : P.boiling ? `rolling boil · ${(P.water).toFixed(2)} L` : P.T > 85 ? `simmering · ${(P.water).toFixed(2)} L` : `${(P.water).toFixed(2)} L`;
  }
  tick(W, selected, rdt) {
    this.clock.textContent = fmtClock(W.t);
    this._t += rdt;
    if (this._t < 0.2) return;
    this._t = 0;
    this.updateStove(W);
    this.updateItem(selected, W);
    this.updateBits(W);
    this.updateProbe(W);
  }
  hint(s) { this.hintEl.textContent = s; }
  buildSources() {
    const body = document.getElementById('sourcesBody');
    body.append(el('p', { class: 'small' }, 'Every number the simulation uses. ', el('span', { class: 'kind sourced' }, 'sourced'), ' taken from the cited source; ', el('span', { class: 'kind calibrated' }, 'calibrated'), ' chosen inside a sourced range or tuned so a sourced behaviour comes out; ', el('span', { class: 'kind constant' }, 'constant'), ' physical constant.'));
    const t = el('table', { class: 'src-table' });
    t.append(el('tr', {}, el('th', {}, 'Parameter'), el('th', {}, 'Value'), el('th', {}, 'Kind'), el('th', {}, 'Source')));
    for (const [id, p] of Object.entries(P)) {
      const s = p.src ? SRC[p.src] : null;
      t.append(el('tr', {}, el('td', {}, p.note || id), el('td', { class: 'mono' }, `${p.v} ${p.unit}`), el('td', {}, el('span', { class: 'kind ' + p.kind }, p.kind)),
        el('td', {}, s ? el('a', { href: s.u, target: '_blank', rel: 'noopener' }, s.t) : '—')));
    }
    body.append(t);
    body.append(el('h3', { style: 'margin-top:14px' }, 'Models'));
    body.append(el('ul', { class: 'help' },
      el('li', {}, 'Heat: 3D conduction on a 1–3 mm grid with Choi–Okos thermal properties from composition; contact, convection, radiation and evaporation at a thin surface layer.'),
      el('li', {}, 'Water: surface water pins the surface near 100 °C until it dries; interior cells cannot pass 100 °C while they hold water; meat proteins release juice as they set.'),
      el('li', {}, 'Chemistry: proteins and starch as equilibrium-limited irreversible transitions; pectin softening as first-order Arrhenius kinetics; Maillard browning and charring on the dry surface.'),
      el('li', {}, 'Known deviation: a steak seared hard and pulled at 54 °C rises about 6 °C while resting; rules of thumb say 2–4 °C.')));
  }
}
