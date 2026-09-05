// DESIGN_SPEC §5 / §14–15 / §128：仪表（role="meter" + 完整 aria）。
import { t } from '../i18n';
import type { I18nKey } from '../i18n';

export interface Gauge {
  root: HTMLElement;
  set(value: number): void;
  sweepTest(onDone: () => void): void; // §2.2 开机测试扫描 0→100→0（RM 下跳过动画）
}

// 指针角度：0 → −90°，100 → +90°
function needleAngle(value: number): number {
  return -90 + (Math.max(0, Math.min(100, value)) / 100) * 180;
}

export function createGauge(labelKey: I18nKey, ariaKey: I18nKey, cssClass: string, reduced: () => boolean): Gauge {
  const root = document.createElement('section');
  root.className = `gauge ${cssClass}`;

  const label = document.createElement('div');
  label.className = 'gauge-label caps';
  root.appendChild(label);

  const value = document.createElement('div');
  value.className = 'gauge-value';
  root.appendChild(value);

  const dial = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  dial.setAttribute('class', 'dial');
  dial.setAttribute('viewBox', '0 0 120 66');
  dial.setAttribute('aria-hidden', 'true');
  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arc.setAttribute('class', 'dial-arc');
  arc.setAttribute('d', 'M 10 60 A 50 50 0 0 1 110 60');
  dial.appendChild(arc);
  for (const v of [0, 25, 50, 75, 100]) {
    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const angle = ((needleAngle(v) - 90) * Math.PI) / 180;
    const cx = 60;
    const cy = 60;
    tick.setAttribute('class', 'dial-tick');
    tick.setAttribute('x1', String(cx + Math.cos(angle) * 42));
    tick.setAttribute('y1', String(cy + Math.sin(angle) * 42));
    tick.setAttribute('x2', String(cx + Math.cos(angle) * 50));
    tick.setAttribute('y2', String(cy + Math.sin(angle) * 50));
    dial.appendChild(tick);
  }
  const needle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  needle.setAttribute('class', 'dial-needle');
  needle.setAttribute('x1', '60');
  needle.setAttribute('y1', '60');
  needle.setAttribute('x2', '60');
  needle.setAttribute('y2', '16');
  dial.appendChild(needle);
  root.appendChild(dial);

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
    needle.style.transform = `rotate(${needleAngle(current)}deg)`;
    renderTexts();
  }

  function sweepTest(onDone: () => void): void {
    if (reduced()) {
      // §9（原规格 45）/ §131：RM 下不做指针扫描
      set(0);
      onDone();
      return;
    }
    needle.style.transition = 'transform 0.14s linear';
    set(100);
    window.setTimeout(() => {
      set(0);
      window.setTimeout(() => {
        needle.style.transition = '';
        onDone();
      }, 160);
    }, 160);
  }

  set(0);
  return { root, set, sweepTest };
}
