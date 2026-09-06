// 表盘（概念板 06：奶油表盘 + 红/绿值弧 + 指针）。语义与 §128 不变：
// role="meter" + aria-valuemin/max/now + aria-label；.gauge-value 承载数值。
import { t } from '../i18n';
import type { I18nKey } from '../i18n';

export interface Gauge {
  root: HTMLElement;
  set(value: number): void;
  sweepTest(onDone: () => void): void; // §2.2 开机自检扫描（RM 下跳过）
}

// 值弧归一化：pathLength=100 → dashoffset = 100 − value（240° 扫程）
export function createGauge(labelKey: I18nKey, ariaKey: I18nKey, cssClass: string, reduced: () => boolean): Gauge {
  const root = document.createElement('section');
  root.className = `gauge ${cssClass}`;

  const label = document.createElement('div');
  label.className = 'gauge-label caps';
  root.appendChild(label);

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'gauge-dial');
  svg.setAttribute('viewBox', '0 0 120 84');
  svg.setAttribute('aria-hidden', 'true');

  // 表盘面（圆心 60,46 半径 40）
  const face = document.createElementNS(NS, 'circle');
  face.setAttribute('class', 'gauge-face');
  face.setAttribute('cx', '60');
  face.setAttribute('cy', '46');
  face.setAttribute('r', '40');
  svg.appendChild(face);

  // 主刻度（−120° / −60° / 0° / 60° / 120°，12 点方向为 0）
  for (const deg of [-120, -60, 0, 60, 120]) {
    const rad = (deg * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const tick = document.createElementNS(NS, 'line');
    tick.setAttribute('class', 'gauge-tick');
    tick.setAttribute('x1', (60 + 33 * sin).toFixed(1));
    tick.setAttribute('y1', (46 - 33 * cos).toFixed(1));
    tick.setAttribute('x2', (60 + 37.5 * sin).toFixed(1));
    tick.setAttribute('y2', (46 - 37.5 * cos).toFixed(1));
    svg.appendChild(tick);
  }

  // 弧轨道与值弧：−120° → +120°，半径 32
  const arcD = 'M 32.3 62 A 32 32 0 1 1 87.7 62';
  const bgArc = document.createElementNS(NS, 'path');
  bgArc.setAttribute('class', 'gauge-arc-bg');
  bgArc.setAttribute('d', arcD);
  bgArc.setAttribute('pathLength', '100');
  svg.appendChild(bgArc);

  const fgArc = document.createElementNS(NS, 'path');
  fgArc.setAttribute('class', 'gauge-arc-fg');
  fgArc.setAttribute('d', arcD);
  fgArc.setAttribute('pathLength', '100');
  svg.appendChild(fgArc);

  const needle = document.createElementNS(NS, 'line');
  needle.setAttribute('class', 'gauge-needle');
  needle.setAttribute('x1', '60');
  needle.setAttribute('y1', '46');
  needle.setAttribute('x2', '60');
  needle.setAttribute('y2', '19');
  svg.appendChild(needle);

  const hub = document.createElementNS(NS, 'circle');
  hub.setAttribute('class', 'gauge-hub');
  hub.setAttribute('cx', '60');
  hub.setAttribute('cy', '46');
  hub.setAttribute('r', '4');
  svg.appendChild(hub);

  root.appendChild(svg);

  const value = document.createElement('div');
  value.className = 'gauge-value';
  root.appendChild(value);

  let current = 0;

  function renderTexts(): void {
    label.textContent = t(labelKey);
    root.setAttribute('role', 'meter');
    root.setAttribute('aria-valuemin', '0');
    root.setAttribute('aria-valuemax', '100');
    root.setAttribute('aria-valuenow', String(current));
    root.setAttribute('aria-label', t(ariaKey, { value: current })); // §128 读法
  }

  function set(v: number): void {
    current = Math.max(0, Math.min(100, Math.round(v)));
    value.textContent = String(current);
    fgArc.style.strokeDashoffset = String(100 - current);
    needle.style.transform = `rotate(${-120 + current * 2.4}deg)`;
    renderTexts();
  }

  function sweepTest(onDone: () => void): void {
    if (reduced()) {
      set(0); // §2.3：RM 无指针扫描
      onDone();
      return;
    }
    needle.style.transition = 'transform 0.13s linear';
    fgArc.style.transition = 'stroke-dashoffset 0.13s linear';
    set(100);
    window.setTimeout(() => {
      set(0);
      window.setTimeout(() => {
        needle.style.transition = '';
        fgArc.style.transition = '';
        onDone();
      }, 150);
    }, 150);
  }

  set(0);
  return { root, set, sweepTest };
}
