// DESIGN_SPEC §10：共振观察窗。纯视觉隐喻，aria-hidden（§10.5），≤18 元素（§10.6）。
// D24 布朗漂移+边界反弹；D25 缓动迁移+200ms 淡入；D29 固定种子+测试冻结开关。

type Shape = 'circle' | 'triangle' | 'square' | 'diamond' | 'hexagon' | 'trapezoid';

const ALL_SHAPES: Shape[] = ['circle', 'triangle', 'square', 'diamond', 'hexagon', 'trapezoid'];
// §10.3 Reduction 档位允许的形状
const BAND_SHAPES: Shape[][] = [
  ALL_SHAPES,
  ['circle', 'triangle', 'square', 'diamond'],
  ['circle', 'triangle', 'square'],
  ['circle', 'square'],
];

const GLYPH_COUNT = 18; // §10.1
const SEED = 20260906; // D29 固定种子
const BASE_SPEED = 2; // D24：~2 px/s

// D29：确定性伪随机（mulberry32）
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shapeNode(shape: Shape): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'glyph');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 14 14');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('fill', 'none');
  // currentColor 随 .mat-glass 的 glass-ink token 走，浅/深外观自动反色（UI_CONTRACT §4.4）
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '1.4');
  switch (shape) {
    case 'circle':
      p.setAttribute('d', 'M7 1.5 A5.5 5.5 0 1 1 6.99 1.5 Z');
      break;
    case 'triangle':
      p.setAttribute('d', 'M7 1.5 L13 12.5 L1 12.5 Z');
      break;
    case 'square':
      p.setAttribute('d', 'M2 2 H12 V12 H2 Z');
      break;
    case 'diamond':
      p.setAttribute('d', 'M7 1 L13 7 L7 13 L1 7 Z');
      break;
    case 'hexagon':
      p.setAttribute('d', 'M7 1 L12.2 4 V10 L7 13 L1.8 10 V4 Z');
      break;
    case 'trapezoid':
      p.setAttribute('d', 'M3.5 3 H10.5 L13 11 H1 Z');
      break;
  }
  svg.appendChild(p);
  return svg;
}

interface GlyphState {
  el: SVGSVGElement;
  shape: Shape;
  side: 0 | 1; // polarization 阵营
  driftX: number;
  driftY: number;
  vx: number;
  vy: number;
  clusterX: number; // 0–1 相对坐标
  clusterY: number;
  nextJitterAt: number;
  jitter: { x: number; y: number } | null;
}

function agitationFactor(agitation: number): number {
  if (agitation >= 75) return 1.4; // §10.2
  if (agitation >= 50) return 1.4;
  if (agitation >= 25) return 1.2;
  return 1;
}

function reductionBand(reduction: number): number {
  if (reduction >= 75) return 3;
  if (reduction >= 50) return 2;
  if (reduction >= 25) return 1;
  return 0;
}

export interface ObservationHandle {
  root: HTMLElement;
  update(agitation: number, polarization: number, reduction: number): void;
  remix(): void; // §13 结局 E：2 秒内恢复 6 形并重新混合
}

export function createObservation(reduced: () => boolean): ObservationHandle {
  const root = document.createElement('div');
  root.className = 'observation mat-glass'; // UI_CONTRACT §4.3 玻璃材质层
  root.setAttribute('aria-hidden', 'true'); // §10.5
  root.dataset.testid = 'observation';

  const rand = mulberry32(SEED);
  const glyphs: GlyphState[] = [];

  for (let i = 0; i < GLYPH_COUNT; i++) {
    const shape = ALL_SHAPES[i % ALL_SHAPES.length]!;
    const el = shapeNode(shape);
    root.appendChild(el);
    const angle = rand() * Math.PI * 2;
    const speed = BASE_SPEED * (0.6 + rand() * 0.8);
    glyphs.push({
      el,
      shape,
      side: i % 2 === 0 ? 0 : 1,
      driftX: rand(),
      driftY: rand(),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      clusterX: 0,
      clusterY: 0,
      nextJitterAt: 2000 + rand() * 3000,
      jitter: null,
    });
  }

  let lastAgitation = 0;
  let lastPolarization = 0;
  let lastBand = 0;
  let frozen = new URLSearchParams(window.location.search).has('freeze'); // D29：仅测试启用
  let raf = 0;
  let lastTime = 0;
  let remixing = false;

  function assignClusters(): void {
    for (const g of glyphs) {
      // 100 时：左团 [0.05, 0.42]，右团 [0.58, 0.95]，中央只留空白（§10.4，不画分割线）
      const zone = g.side === 0 ? 0.05 + rand() * 0.37 : 0.58 + rand() * 0.37;
      g.clusterX = zone;
      g.clusterY = 0.12 + rand() * 0.72;
    }
  }
  assignClusters();

  function applyShapes(band: number): void {
    const list = BAND_SHAPES[Math.max(0, Math.min(3, band))]!;
    let swapIdx = 0;
    for (const g of glyphs) {
      if (!list.includes(g.shape)) {
        const nextShape = list[swapIdx % list.length]!;
        swapIdx++;
        g.shape = nextShape;
        const fresh = shapeNode(nextShape);
        fresh.classList.add('fade-swap'); // D25：形状替换 200ms 淡入
        if (!reduced()) {
          fresh.addEventListener('animationend', () => fresh.classList.remove('fade-swap'), { once: true });
        }
        root.replaceChild(fresh, g.el);
        g.el = fresh;
      }
    }
  }

  function ease(t: number): number {
    return t * t * (3 - 2 * t);
  }

  function render(w: number, h: number, polarization: number): void {
    const strength = ease(Math.max(0, Math.min(100, polarization)) / 100);
    for (const g of glyphs) {
      const cx = (g.driftX * (1 - strength) + g.clusterX * strength) * w;
      const cy = (g.driftY * (1 - strength) + g.clusterY * strength) * h;
      const jx = g.jitter ? g.jitter.x : 0;
      const jy = g.jitter ? g.jitter.y : 0;
      g.el.style.transform = `translate(${(cx + jx).toFixed(1)}px, ${(cy + jy).toFixed(1)}px)`;
    }
  }

  function step(time: number): void {
    if (frozen || remixing) return;
    const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
    lastTime = time;
    const w = root.clientWidth || 1;
    const h = root.clientHeight || 1;
    const factor = agitationFactor(lastAgitation);
    const now = time;

    for (const g of glyphs) {
      // D24：布朗漂移
      g.vx += (rand() - 0.5) * 0.6 * dt;
      g.vy += (rand() - 0.5) * 0.6 * dt;
      const speed = Math.hypot(g.vx, g.vy) || 0.0001;
      const target = (BASE_SPEED * factor) / 100;
      const scale = target / speed;
      g.vx *= 0.2 + 0.8 * scale;
      g.vy *= 0.2 + 0.8 * scale;
      g.driftX += (g.vx * dt) / Math.max(1, w);
      g.driftY += (g.vy * dt) / Math.max(1, h);
      // 边界反弹
      if (g.driftX < 0.02) { g.driftX = 0.02; g.vx = Math.abs(g.vx); }
      if (g.driftX > 0.95) { g.driftX = 0.95; g.vx = -Math.abs(g.vx); }
      if (g.driftY < 0.05) { g.driftY = 0.05; g.vy = Math.abs(g.vy); }
      if (g.driftY > 0.85) { g.driftY = 0.85; g.vy = -Math.abs(g.vy); }
      // D24：75+ 偶发 2–3px 快速抖动（每 2–5s）
      if (lastAgitation >= 75 && now >= g.nextJitterAt) {
        g.jitter = { x: (rand() * 2 - 1) * 3, y: (rand() * 2 - 1) * 3 };
        g.nextJitterAt = now + 2000 + rand() * 3000;
        window.setTimeout(() => { g.jitter = null; }, 120);
      }
    }
    render(w, h, lastPolarization);
    raf = requestAnimationFrame(step);
  }

  function start(): void {
    if (frozen || reduced()) {
      render(root.clientWidth || 1, root.clientHeight || 1, lastPolarization);
      return;
    }
    cancelAnimationFrame(raf);
    lastTime = performance.now();
    raf = requestAnimationFrame(step);
  }

  function update(agitation: number, polarization: number, reduction: number): void {
    const band = reductionBand(reduction);
    const bandChanged = band !== lastBand;
    lastAgitation = agitation;
    lastPolarization = polarization;
    if (bandChanged) {
      lastBand = band;
      applyShapes(band);
    }
    if (frozen || reduced()) {
      // §2.3 / D25 RM：状态通过位置/透明度即时表达，不做群体位移动画
      render(root.clientWidth || 1, root.clientHeight || 1, polarization);
      return;
    }
    if (!raf) start();
  }

  // §13 结局 E：2 秒内恢复 6 种形状并重新混合
  function remix(): void {
    remixing = true;
    cancelAnimationFrame(raf);
    lastBand = 0;
    lastAgitation = 0;
    lastPolarization = 0;
    assignClusters();
    for (const g of glyphs) {
      const fresh = shapeNode(ALL_SHAPES[glyphs.indexOf(g) % ALL_SHAPES.length]!);
      fresh.classList.add('fade-swap');
      root.replaceChild(fresh, g.el);
      g.el = fresh;
      g.shape = ALL_SHAPES[glyphs.indexOf(g) % ALL_SHAPES.length]!;
    }
    const t0 = performance.now();
    const from = glyphs.map((g) => ({ x: g.driftX, y: g.driftY }));
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 2000);
      const w = root.clientWidth || 1;
      const h = root.clientHeight || 1;
      glyphs.forEach((g, i) => {
        const f = from[i]!;
        g.driftX = f.x + (g.clusterX - f.x) * k;
        g.driftY = f.y + (g.clusterY - f.y) * k;
      });
      render(w, h, 0);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', () => {
    render(root.clientWidth || 1, root.clientHeight || 1, lastPolarization);
  });

  return { root, update, remix };
}
