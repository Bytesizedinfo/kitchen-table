// Panels: tool rail, pantry, stove controls, selected-item readout, probe with chart, sources.
import { el, fmtT, fmtClock } from './dom.js';
import { LineChart, legend } from './charts.js';
import { TOOLS } from '../interact/tools.js';
import { P, SRC, pv } from '../sim/params.js';

export const PANTRY = [
  { id: 'steak', label: 'Strip steak', sub: '25 mm · fridge 4 °C', color: 'linear-gradient(135deg,#9b2b2f,#5c1418)', opts: { T0: 4 } },
  { id: 'egg', label: 'Egg', sub: '57 g · fridge 4 °C', color: 'radial-gradient(circle at 40% 35%,#fffaf0,#e6dccb)', opts: { T0: 4 } },
  { id: 'egg', label: 'Egg', sub: '57 g · room 22 °C', color: 'radial-gradient(circle at 40% 35%,#fff,#d9cdb8)', opts: { T0: 22 } },
  { id: 'potato', label: 'Potato', sub: '≈210 g · room 22 °C', color: 'radial-gradient(circle at 40% 35%,#b98a55,#6e4a26)', opts: { T0: 22 } },
];

const flameLabel = (s) => (s <= 0 ? 'Off' : s < 2.5 ? 'Simmer' : s < 4.5 ? 'Low' : s < 6.5 ? 'Medium' : s < 8.5 ? 'Medium-high' : 'High');

export class Hud {
  constructor(app) {
    this.app = app;
    this.buildTools();
    this.buildPantry();
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
  setTool(id) { for (const k in this.toolBtns) this.toolBtns[k].classList.toggle('on', k === id); }
  buildPantry() {
    const p = document.getElementById('pantry');
    p.append(el('span', { class: 'lbl' }, 'Pantry'));
    for (const f of PANTRY) {
      const b = el('button', { class: 'food', title: `Put a ${f.label.toLowerCase()} on the board`, onclick: () => this.app.spawn(f.id, f.opts) },
        el('span', { class: 'sw', style: `background:${f.color}` }), el('span', {}, f.label, el('small', {}, f.sub)));
      p.append(b);
    }
    p.append(el('button', { class: 'food', title: 'Remove everything from the table', onclick: () => this.app.clearTable() }, el('span', {}, 'Clear', el('small', {}, 'table'))));
  }
  buildViews() {
    const v = document.getElementById('views');
    for (const [name, pos, target] of [
      ['Overview', [0.02, 0.92, 1.28], [0.0, 0.0, -0.03]],
      ['Board', [-0.37, 0.42, 0.55], [-0.37, 0.03, 0.13]],
      ['Stove', [0.3, 0.45, 0.42], [0.3, 0.08, -0.04]],
      ['Pan', [0.16, 0.3, 0.22], [0.16, 0.09, -0.04]],
      ['Plate', [-0.37, 0.35, 0.12], [-0.37, 0.02, -0.24]],
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
    const oil = el('input', { type: 'checkbox', checked: true });
    oil.onchange = () => { W.pan.oiled = oil.checked; };
    this.pan.box.append(el('div', { class: 'btnrow' }, el('label', { class: 'chk' }, oil, 'Thin film of oil'), el('button', { class: 'tbtn', onclick: () => { W.pan.pool = 0; } }, 'Wipe pan')));
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
  renderItem(p) {
    const c = this.itemCard;
    c.replaceChildren(el('h3', {}, 'Selected'));
    if (!p) { c.append(el('div', { class: 'empty' }, 'Click a piece of food to see what is happening inside it.')); this.itemRows = null; return; }
    this.itemTitle = el('div', { style: 'font-weight:600;margin-bottom:6px' }, p.label);
    const dl = el('dl', { class: 'kv' });
    const row = (k) => { const dd = el('dd', {}, '—'); dl.append(el('dt', {}, k), dd); return dd; };
    this.itemRows = { where: row('On'), core: row('Centre'), coldest: row('Coldest point'), surf: row('Surface'), done: row('Doneness'), safe: row('USDA safety'), mass: row('Weight'), brown: row('Browning') };
    const acts = el('div', { class: 'btnrow' },
      el('button', { class: 'tbtn', onclick: () => this.app.flipSelected() }, 'Flip'),
      el('button', { class: 'tbtn', onclick: () => this.app.showCutFace() }, 'Show cut face'),
      el('button', { class: 'tbtn', onclick: () => this.app.halveSelected() }, 'Cut in half'),
      el('button', { class: 'tbtn', onclick: () => this.app.removeSelected() }, 'Remove'));
    c.append(this.itemTitle, dl, acts);
  }
  updateItem(p, W) {
    if (!p || !this.itemRows) return;
    const r = this.itemRows;
    const where = { pan: 'the pan', pot: 'the pot', board: 'the board', plate: 'the plate', table: 'the table', hand: 'your hand' };
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
  }
  updateProbe(W) {
    const pr = W.probe;
    if (!pr) { this.probeVal.textContent = '—'; this.probeSub.textContent = 'Pick the probe (P) and click food to measure its centre.'; return; }
    this.probeVal.textContent = fmtT(pr.Tshown);
    this.probeSub.textContent = `In: ${pr.piece.label.toLowerCase()} · tip at its thermal centre`;
    const h = pr.history;
    if (!h.length) return;
    const t0 = h[0][0], t1 = Math.max(h[h.length - 1][0], t0 + 60);
    const step = Math.max(1, Math.floor(h.length / 300));
    const pts = []; for (let i = 0; i < h.length; i += step) pts.push([(h[i][0] - t0) / 60, h[i][1]]);
    pts.push([(h[h.length - 1][0] - t0) / 60, h[h.length - 1][1]]);
    const sup = pr.piece.support ? pr.piece.support.kind : '';
    const series = [{ name: 'Probe', color: '#f2a65a', points: pts }];
    if (this.envHist && this.envHist.length) series.push({ name: sup === 'pot' ? 'Water' : 'Pan', color: '#6aa7ff', points: this.envHist.filter((x) => x[0] >= t0).map(([t, v]) => [(t - t0) / 60, v]), dash: '3 3' });
    let ymax = 20; for (const s of series) for (const [, y] of s.points) ymax = Math.max(ymax, y);
    const markers = pr.piece.def.kind === 'meat' ? [{ x: -1 }] : [];
    void markers;
    this.chart.update({ x: { min: 0, max: (t1 - t0) / 60, label: 'min', fmt: (v) => v.toFixed(v < 10 ? 1 : 0) }, y: { min: 0, max: Math.ceil(ymax / 20) * 20, fmt: (v) => v.toFixed(0) }, series, valueFmt: (v) => v.toFixed(1) + ' °C' });
    this.legendBox.replaceChildren(legend(series.map((s) => ({ name: s.name, color: s.color }))));
  }
  updateStove(W) {
    this.pan.val.textContent = fmtT(W.pan.T, 0);
    this.pan.st.textContent = W.pan.pool > 0.0005 ? `juice ${(W.pan.pool * 1000).toFixed(0)} g` : '';
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
