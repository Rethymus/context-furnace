// DESIGN_SPEC §7：GAIN 机械旋钮（四卡位；D13 桌面卡位可点 + radiogroup + 拖拽旋转增强；§93 移动端直选）。
import { t } from '../i18n';

export interface GainHandle {
  root: HTMLElement;
  refresh(): void;
}

export interface GainOpts {
  get: () => number;
  getMax: () => number; // 解锁时刻表（§27）
  set: (v: number) => void;
  onClick: () => void; // 卡位「咔」（§99）
}

// 卡位角度：0..3 → −60°..+60°
function knobAngle(v: number): number {
  return -60 + v * 40;
}

export function createGain(opts: GainOpts): GainHandle {
  const { get, getMax, set, onClick } = opts;

  const root = document.createElement('div');
  root.className = 'gain-cluster';

  const label = document.createElement('div');
  label.className = 'gauge-label caps';
  label.textContent = t('gain.label');
  root.appendChild(label);

  const knob = document.createElement('div');
  knob.className = 'knob';
  knob.setAttribute('tabindex', '0');
  knob.setAttribute('role', 'slider');
  knob.setAttribute('aria-label', t('gain.label'));
  knob.setAttribute('aria-valuemin', '0');
  knob.setAttribute('aria-valuemax', '3');
  const marker = document.createElement('span');
  marker.className = 'knob-marker';
  knob.appendChild(marker);
  root.appendChild(knob);

  const stops = document.createElement('div');
  stops.className = 'gain-stops';
  stops.setAttribute('role', 'radiogroup');
  stops.setAttribute('aria-label', t('gain.label'));
  const stopButtons: HTMLButtonElement[] = [];
  for (let v = 0; v <= 3; v++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gain-stop';
    btn.textContent = String(v);
    btn.setAttribute('role', 'radio');
    btn.dataset.value = String(v);
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      apply(v);
    });
    stops.appendChild(btn);
    stopButtons.push(btn);
  }
  root.appendChild(stops);

  function apply(v: number): void {
    const clamped = Math.max(0, Math.min(3, v));
    if (clamped === get()) return;
    if (clamped > getMax()) return; // T5：越档拒绝
    set(clamped);
    onClick();
    refresh();
  }

  function refresh(): void {
    const value = get();
    const max = getMax();
    knob.style.transform = `rotate(${knobAngle(value)}deg)`;
    knob.setAttribute('aria-valuenow', String(value));
    for (const btn of stopButtons) {
      const v = Number(btn.dataset.value);
      btn.disabled = v > max;
      btn.setAttribute('aria-checked', v === value ? 'true' : 'false');
    }
  }

  // 键盘：knob focus 后 ←/→ 换档（§7 输入一致性）
  knob.addEventListener('keydown', (e) => {
    const value = get();
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      apply(value + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      apply(value - 1);
    }
  });

  // D13：鼠标拖拽旋转增强（机制等同卡位点击）
  knob.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    knob.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const startValue = get();
    const onMove = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) / 60 + (startY - ev.clientY) / 60;
      const target = Math.round(startValue + delta / 0.8);
      if (target !== get()) apply(target);
    };
    const onUp = (ev: PointerEvent) => {
      if (knob.hasPointerCapture(ev.pointerId)) knob.releasePointerCapture(ev.pointerId);
      knob.removeEventListener('pointermove', onMove);
      knob.removeEventListener('pointerup', onUp);
    };
    knob.addEventListener('pointermove', onMove);
    knob.addEventListener('pointerup', onUp);
  });

  refresh();
  return { root, refresh };
}
