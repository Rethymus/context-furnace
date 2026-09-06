// UI_CONTRACT §1.2：GAIN 四枚纸片卡位（radiogroup；键盘 ←/→ 可调；D13 旋钮形体随旧视觉系统移除）。
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

export function createGain(opts: GainOpts): GainHandle {
  const { get, getMax, set, onClick } = opts;

  const root = document.createElement('div');
  root.className = 'gain-cluster';

  const label = document.createElement('div');
  label.className = 'gauge-label caps';
  label.textContent = t('gain.label');
  root.appendChild(label);

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
    for (const btn of stopButtons) {
      const v = Number(btn.dataset.value);
      btn.disabled = v > max;
      btn.setAttribute('aria-checked', v === value ? 'true' : 'false');
    }
  }

  // 键盘：←/→ 在 radiogroup 上换档（§126）
  stops.addEventListener('keydown', (e) => {
    const value = get();
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      apply(value + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      apply(value - 1);
    }
  });

  refresh();
  return { root, refresh };
}
