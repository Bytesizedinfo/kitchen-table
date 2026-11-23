// Lightweight SVG line charts with a crosshair tooltip (ported from body-sim/js/ui/charts.js).
// different units go into small multiples. Colours come from CSS tokens (--s1…--s8).
import { el } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };

function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) out.push(+v.toFixed(10));
  return out;
}

export class LineChart {
  /**
   * opts: { height, title, x:{min,max,label,fmt,ticks}, y:{min,max,label,fmt,log,ticks}, series:[{name,color,points:[[x,y]],band:[[x,lo,hi]],dash}],
   *         markers:[{x,label}], now, nowLabel, valueFmt }
   */
  constructor(container, opts) {
    this.wrap = el('div', { class: 'chart' });
    container.append(this.wrap);
    this.W = 320; this.H = opts.height || 130;
    this.m = { l: 36, r: 10, t: opts.title ? 18 : 8, b: 24 };
    this.svg = sv('svg', { viewBox: `0 0 ${this.W} ${this.H}`, role: 'img' });
    this.wrap.append(this.svg);
    this.tip = el('div', { class: 'chart-tip', hidden: true });
    this.wrap.append(this.tip);
    this.svg.addEventListener('pointermove', (e) => this.hover(e));
    this.svg.addEventListener('pointerleave', () => this.unhover());
    this.update(opts);
  }

  sx(x) { const { min, max } = this.o.x; return this.m.l + (x - min) / (max - min || 1) * (this.W - this.m.l - this.m.r); }
  sy(y) {
    const { min, max, log } = this.o.y;
    const t = log ? (Math.log10(Math.max(y, min)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min)) : (y - min) / (max - min || 1);
    return this.H - this.m.b - Math.max(-0.05, Math.min(1.05, t)) * (this.H - this.m.t - this.m.b);
  }

  update(opts) {
    this.o = { ...this.o, ...opts };
    const o = this.o;
    this.svg.replaceChildren();
    this.svg.setAttribute('aria-label', o.title || (o.series || []).map((s) => s.name).join(', '));
    const g = sv('g', { class: 'grid' }), ax = sv('g', { class: 'axis' });
    const yt = o.y.ticks || (o.y.log ? this.logTicks() : niceTicks(o.y.min, o.y.max, 3));
    for (const t of yt) {
      const y = this.sy(t);
      g.append(sv('line', { x1: this.m.l, x2: this.W - this.m.r, y1: y, y2: y }));
      const tx = sv('text', { x: this.m.l - 4, y: y + 3, 'text-anchor': 'end' });
      tx.textContent = o.y.fmt ? o.y.fmt(t) : String(t);
      ax.append(tx);
    }
    const xt = o.x.ticks || niceTicks(o.x.min, o.x.max, 5);
    for (const t of xt) {
      const x = this.sx(t);
      const tx = sv('text', { x, y: this.H - this.m.b + 12, 'text-anchor': 'middle' });
      tx.textContent = o.x.fmt ? o.x.fmt(t) : String(t);
      ax.append(tx);
    }
    this.svg.append(g, ax);
    if (o.x.label) { const t = sv('text', { class: 'axis-label', x: this.W - this.m.r, y: this.H - 2, 'text-anchor': 'end' }); t.textContent = o.x.label; this.svg.append(t); }
    if (o.title) { const t = sv('text', { class: 'title', x: this.m.l, y: 11 }); t.textContent = o.title + (o.y.label ? ` (${o.y.label})` : ''); this.svg.append(t); }
    for (const mk of o.markers || []) {
      if (mk.x < o.x.min || mk.x > o.x.max) continue;
      const x = this.sx(mk.x);
      this.svg.append(sv('line', { class: 'marker-line', x1: x, x2: x, y1: this.m.t, y2: this.H - this.m.b }));
      if (mk.label) { const t = sv('text', { class: 'marker-text', x: x + 3, y: this.m.t + 9 }); t.textContent = mk.label; this.svg.append(t); }
    }
    for (const s of o.series || []) {
      if (s.band && s.band.length > 1) {
        let d = '';
        s.band.forEach(([x, lo], i) => { d += `${i ? 'L' : 'M'}${this.sx(x).toFixed(1)},${this.sy(lo).toFixed(1)}`; });
        for (let i = s.band.length - 1; i >= 0; i--) { const [x, , hi] = s.band[i]; d += `L${this.sx(x).toFixed(1)},${this.sy(hi).toFixed(1)}`; }
        this.svg.append(sv('path', { class: 'band', d: d + 'Z', fill: s.color }));
      }
    }
    for (const s of o.series || []) {
      if (!s.points || s.points.length < 2) continue;
      let d = '';
      let pen = false;
      for (const [x, y] of s.points) {
        if (y == null || !isFinite(y)) { pen = false; continue; }
        d += `${pen ? 'L' : 'M'}${this.sx(x).toFixed(1)},${this.sy(y).toFixed(1)}`; pen = true;
      }
      const p = sv('path', { class: 'series', d, stroke: s.color });
      if (s.dash) p.setAttribute('stroke-dasharray', s.dash);
      this.svg.append(p);
    }
    if (o.now != null && o.now >= o.x.min && o.now <= o.x.max) {
      const x = this.sx(o.now);
      this.nowLine = sv('line', { class: 'now', x1: x, x2: x, y1: this.m.t, y2: this.H - this.m.b });
      this.svg.append(this.nowLine);
      for (const s of o.series || []) {
        const y = this.valueAt(s, o.now);
        if (y != null) this.svg.append(sv('circle', { cx: x, cy: this.sy(y), r: 3.5, fill: s.color, class: 'hover-dot' }));
      }
    }
    this.hoverG = sv('g', {}); this.svg.append(this.hoverG);
  }

  logTicks() {
    const out = [];
    for (let e = Math.floor(Math.log10(this.o.y.min)); e <= Math.ceil(Math.log10(this.o.y.max)); e++) {
      const v = Math.pow(10, e);
      if (v >= this.o.y.min && v <= this.o.y.max) out.push(v);
    }
    return out;
  }

  valueAt(s, x) {
    const pts = s.points; if (!pts || !pts.length) return null;
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        if (y0 == null || y1 == null) return null;
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0 || 1);
      }
    }
    return pts[pts.length - 1][1];
  }

  hover(e) {
    const r = this.svg.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * this.W;
    const { min, max } = this.o.x;
    const x = min + (px - this.m.l) / (this.W - this.m.l - this.m.r) * (max - min);
    if (x < min || x > max) return this.unhover();
    this.hoverG.replaceChildren();
    const X = this.sx(x);
    this.hoverG.append(sv('line', { class: 'hover-line', x1: X, x2: X, y1: this.m.t, y2: this.H - this.m.b }));
    const lines = [`<div>${this.o.x.fmtLong ? this.o.x.fmtLong(x) : (this.o.x.fmt ? this.o.x.fmt(x) : x.toFixed(1))}${this.o.x.label ? ' ' + this.o.x.label : ''}</div>`];
    for (const s of this.o.series || []) {
      const y = this.valueAt(s, x);
      if (y == null) continue;
      this.hoverG.append(sv('circle', { cx: X, cy: this.sy(y), r: 4, fill: s.color, class: 'hover-dot' }));
      const vf = s.fmt || this.o.valueFmt || ((v) => v.toFixed(1));
      lines.push(`<div><span class="sw" style="background:${s.color}"></span>${s.name}: ${vf(y)}</div>`);
    }
    this.tip.innerHTML = lines.join('');
    this.tip.hidden = false;
    const tipW = this.tip.offsetWidth;
    const left = (X / this.W) * r.width;
    this.tip.style.left = `${Math.min(Math.max(0, left + 10), r.width - tipW)}px`;
    this.tip.style.top = `0px`;
  }

  unhover() { this.hoverG?.replaceChildren(); this.tip.hidden = true; }
}

/** Builds a legend row: entries [{name,color}]. */
export function legend(entries) {
  return el('div', { class: 'legend' }, entries.map((e) => el('span', {}, el('i', { style: `background:${e.color}` }), e.name)));
}

/** Read a CSS colour token so canvas/SVG drawing follows the theme. */
export function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
}
