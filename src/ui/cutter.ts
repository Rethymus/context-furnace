// DESIGN_SPEC §6：CUT（边界吸附 + CORE 硬规则 + 非拖动替代 + D14 等宽块/FEED 高亮 + D32 aria）。
import { t } from '../i18n';

export interface CutTrackHandle {
  root: HTMLElement;
  refresh(): void; // 从 state 同步选区显示
  setHighlighted(index: 0 | 1 | null): void; // 教学 Step 1/2 高亮
  lock(): void;
}

export interface CutTrackOpts {
  segmentCount: number;
  getSelection: () => { left: number; right: number };
  setSelection: (left: number, right: number) => void;
  onTick: (direction: 1 | -1) => void;
}

// 裁刀边界位置：left cutter ∈ [0, N−1]（= 选区首段 index），right cutter ∈ [1, N]（= 选区末段 index + 1）
export function createCutTrack(opts: CutTrackOpts): CutTrackHandle {
  const { segmentCount, getSelection, setSelection, onTick } = opts;

  const root = document.createElement('div');
  root.className = 'track';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', t('panel.extract'));

  const blocks: HTMLElement[] = [];  for (let i = 0; i < segmentCount; i++) {
    const block = document.createElement('div');
    block.className = 'track-block';
    block.dataset.index = String(i);
    root.appendChild(block);
    blocks.push(block);
  }

  function makeCutter(which: 'left' | 'right'): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `cutter cutter-${which}`;
    btn.dataset.cutter = which;
    const blade = document.createElement('span');
    blade.className = 'cutter-blade';
    btn.appendChild(blade);
    const hint = document.createElement('span');
    hint.className = 'cutter-hint caps';
    hint.textContent = which === 'left' ? t('cutter.left') : t('cutter.right');
    btn.appendChild(hint);
    btn.setAttribute('aria-label', which === 'left' ? t('cutter.left.aria') : t('cutter.right.aria'));
    btn.addEventListener('keydown', (e) => {
      const sel = getSelection();
      const cur = which === 'left' ? sel.left : sel.right + 1;
      let next = cur;
      if (e.key === 'ArrowLeft') next = cur - 1;
      else if (e.key === 'ArrowRight') next = cur + 1;
      else return;
      e.preventDefault();
      const moved = applyBoundary(which, next);
      if (moved !== 0) onTick(moved > 0 ? 1 : -1);
    });
    root.appendChild(btn);
    return btn;
  }

  const leftBtn = makeCutter('left');
  const rightBtn = makeCutter('right');

  // 应用边界移动；返回移动量（0 = 非法/未动）
  function applyBoundary(which: 'left' | 'right', boundary: number): number {
    const sel = getSelection();
    if (which === 'left') {
      const clamped = Math.max(0, Math.min(sel.right, boundary)); // 选区至少 1 段
      if (clamped === sel.left) return 0;
      setSelection(clamped, sel.right);
      return clamped - sel.left;
    }
    const clamped = Math.max(sel.left + 1, Math.min(segmentCount, boundary));
    if (clamped === sel.right + 1) return 0;
    setSelection(sel.left, clamped - 1);
    return clamped - 1 - sel.right;
  }

  // 点击轨道：移动距该 boundary 最近的裁刀（§6.3）
  root.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.cutter')) return; // 裁刀自身拖拽
    const rect = root.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const boundaryFloat = (x / rect.width) * segmentCount;
    const boundary = Math.max(0, Math.min(segmentCount, Math.round(boundaryFloat)));
    const sel = getSelection();
    const distLeft = Math.abs(boundary - sel.left);
    const distRight = Math.abs(boundary - (sel.right + 1));
    const which = distLeft <= distRight ? 'left' : 'right';
    const moved = applyBoundary(which, boundary);
    if (moved !== 0) onTick(moved > 0 ? 1 : -1);
  });

  // 拖拽（Mouse/Touch，§6.3）
  function dragCutter(btn: HTMLButtonElement, which: 'left' | 'right'): void {
    let startX = 0;
    let startBoundary = 0;
    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startBoundary = which === 'left' ? getSelection().left : getSelection().right + 1;
      btn.classList.add('active');
    };
    const onMove = (e: PointerEvent) => {
      if (!btn.hasPointerCapture(e.pointerId)) return;
      const rect = root.getBoundingClientRect();
      const deltaSegments = ((e.clientX - startX) / rect.width) * segmentCount;
      const target = Math.round(startBoundary + deltaSegments);
      const moved = applyBoundary(which, target);
      if (moved !== 0) onTick(moved > 0 ? 1 : -1);
    };
    const onUp = (e: PointerEvent) => {
      if (btn.hasPointerCapture(e.pointerId)) btn.releasePointerCapture(e.pointerId);
      btn.classList.remove('active');
    };
    btn.addEventListener('pointerdown', onDown);
    btn.addEventListener('pointermove', onMove);
    btn.addEventListener('pointerup', onUp);
    btn.addEventListener('pointercancel', onUp);
  }
  dragCutter(leftBtn, 'left');
  dragCutter(rightBtn, 'right');

  function refresh(): void {
    const sel = getSelection();
    leftBtn.style.left = `${((sel.left / segmentCount) * 100).toFixed(3)}%`;
    rightBtn.style.left = `${(((sel.right + 1) / segmentCount) * 100).toFixed(3)}%`;
    blocks.forEach((b, i) => {
      const selected = i >= sel.left && i <= sel.right;
      b.classList.toggle('excluded', !selected);
      const feedSeg = document.querySelector<HTMLElement>(`.feed-seg[data-index='${i}']`);
      if (feedSeg) {
        feedSeg.classList.toggle('lit', selected);
        feedSeg.classList.toggle('dim', !selected);
      }
    });
  }

  function setHighlighted(index: 0 | 1 | null): void {
    for (const btn of [leftBtn, rightBtn]) btn.classList.remove('active');
    if (index === 0) leftBtn.classList.add('active');
    if (index === 1) rightBtn.classList.add('active');
  }

  function lock(): void {
    leftBtn.disabled = true;
    rightBtn.disabled = true;
  }

  requestAnimationFrame(refresh);
  return { root, refresh, setHighlighted, lock };
}
