// UI_CONTRACT §1.2：弧形进度芯片（替代被禁的机械表盘）。语义与 §128 不变。
import { t } from '../i18n';
import type { I18nKey } from '../i18n';

export interface Gauge {
  root: HTMLElement;
  set(value: number): void;
  sweepTest(onDone: () => void): void; // §2.2 开机自检扫描（RM 下跳过）
}

// 值弧归一化：pathLength=100 → dashoffset = 100 − value
export function createGauge(labelKey: I18nKey, ariaKey: I18nKey, cssClass: string, reduced: () => boolean): Gauge {
  const root = document.createElement('section');
  root.className = `gauge ${cssClass}`;

  const label = document.createElement('div');
  label.className = 'gauge-label caps';
  root.appendChild(label);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'gauge-arc');
  svg.setAttribute('viewBox', '0 0 120 62');
  svg.setAttribute('aria-hidden', 'true');

  const bgArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  bgArc.setAttribute('class', 'gauge-arc-bg');
  bgArc.setAttribute('d', 'M 12 56 A 48 48 0 0 1 108 56');
  bgArc.setAttribute('pathLength', '100');
  svg.appendChild(bgArc);

  const fgArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  fgArc.setAttribute('class', 'gauge-arc-fg');
  fgArc.setAttribute('d', 'M 12 56 A 48 48 0 0 1 108 56');
  fgArc.setAttribute('pathLength', '100');
  svg.appendChild(fgArc);

  const needle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  needle.setAttribute('class', 'gauge-needle');
  needle.setAttribute('x1', '60');
  needle.setAttribute('y1', '56');
  needle.setAttribute('x2', '60');
  needle.setAttribute('y2', '18');
  svg.appendChild(needle);

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
    needle.style.transform = `rotate(${-90 + current * 1.8}deg)`;
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
