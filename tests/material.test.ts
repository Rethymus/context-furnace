// UI_CONTRACT v4 §4.6：材质与动效系统的静态可验证断言（verify · test:unit 的一部分）。
// 目标：把「参考 Apple」落到可回归检查的参数体系，而非文案描述。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (f: string) => readFileSync(join(ROOT, 'src', 'styles', f), 'utf8');

const tokens = read('tokens.css');
const controls = read('controls.css');
const machine = read('machine.css');
const motion = read('motion.css');
const base = read('base.css');
const cutter = readFileSync(join(ROOT, 'src', 'ui', 'cutter.ts'), 'utf8');

// ── v4.1 令牌完整性 ──
describe('v4 material & motion tokens', () => {
  it('neutral luminance ladder (n0–n5) exists', () => {
    for (const n of ['--n0', '--n1', '--n2', '--n3', '--n4', '--n5']) {
      expect(tokens).toContain(`${n}:`);
    }
  });

  it('material recipe tokens exist (blur ladder, saturation, glass layers, scrim)', () => {
    for (const t of [
      '--mat-blur-s:', '--mat-blur-m:', '--mat-blur-l:', '--mat-sat:',
      '--glass-float-bg:', '--glass-float-edge:', '--glass-dark-bg:', '--glass-dark-edge:',
      '--scrim:', '--scrim-blur:', '--hi-light:',
    ]) {
      expect(tokens).toContain(t);
    }
  });

  it('motion tokens exist (SwiftUI-semantics springs + press pair)', () => {
    for (const t of [
      '--spring-smooth:', '--spring-snappy:', '--spring-bouncy:', '--press-in:',
      '--t-mount:',
    ]) {
      expect(tokens).toContain(t);
    }
  });

  it('focus ring is tokenized with dedicated light/dark values (WCAG 1.4.11 fix)', () => {
    expect(tokens).toContain('--focus-ring:');
    expect(tokens).toContain('#7a5f10'); // 浅色：深琥珀（vs machine ≈3.3:1）
    expect(base).toContain('outline: var(--focus-width) solid var(--focus-ring)');
  });

  it('dual appearance follows the system (HIG: no in-app toggle)', () => {
    expect(tokens).toContain('@media (prefers-color-scheme: dark)');
    // 深色关键映射：软化米白防发光
    const dark = tokens.split('@media (prefers-color-scheme: dark)')[1] ?? '';
    expect(dark).toContain('--paper: #cfc8b4');
  });

  it('degradation matrix: reduced transparency + increased contrast', () => {
    expect(tokens).toContain('@media (prefers-reduced-transparency: reduce)');
    expect(tokens).toContain('@media (prefers-contrast: more)');
  });

  it('knob angle is a registered custom property (springable)', () => {
    expect(tokens).toContain("@property --knob-rot");
  });
});

// ── v4.2 材质层接入 ──
describe('v4 material layer wiring', () => {
  it('machine panel uses thick material (content-layer standard material)', () => {
    expect(machine).toContain('blur(var(--mat-blur-l))');
    // M3-P0 后端点经 --mat-thick-bg* 令牌接线（浅/深计算值与字面 color-mix 一致）
    expect(tokens).toContain('--mat-thick-bg: color-mix(in srgb, var(--machine) 92%, transparent)');
    expect(tokens).toContain('--mat-thick-bg-hi: color-mix(in srgb, var(--machine-hi) 92%, transparent)');
    expect(tokens).toContain('--mat-thick-bg-lo: color-mix(in srgb, var(--machine-lo) 92%, transparent)');
    const panel = machine.split('.machine-panel {')[1]?.split('}')[0] ?? '';
    expect(panel).toContain('var(--mat-thick-bg-hi)');
    expect(panel).toContain('var(--mat-thick-bg)');
    expect(panel).toContain('var(--mat-thick-bg-lo)');
  });

  it('observation window & status line sample the backdrop (dark glass)', () => {
    const obs = machine.split('.observation {')[1]?.split('}')[0] ?? '';
    expect(obs).toContain('backdrop-filter');
    expect(obs).toContain('var(--glass-obs-hi)');
    expect(obs).toContain('var(--glass-obs-lo)');
    const status = machine.split('.status-line {')[1]?.split('}')[0] ?? '';
    expect(status).toContain('backdrop-filter');
    expect(status).toContain('var(--glass-status-hi)');
    expect(status).toContain('var(--glass-status-lo)');
  });

  it('floating layer (toast/plate/tool-btn/ending) is real glass', () => {
    for (const block of [
      controls.split('.toast {')[1]?.split('}')[0] ?? '',
      machine.split('.cycle-plate {')[1]?.split('}')[0] ?? '',
      machine.split('.tool-btn {')[1]?.split('}')[0] ?? '',
      machine.split('.ending-wrap {')[1]?.split('}')[0] ?? '',
    ]) {
      expect(block).toContain('backdrop-filter');
      expect(block).toContain('var(--glass-');
    }
  });
});

// ── v4.3 动效系统 ──
describe('v4 motion system', () => {
  it('press feedback pairs: transform + box-shadow move together, with distinct press-in edge', () => {
    const btnActive = controls.split('.btn:active:not(:disabled)')[1]?.split('}')[0] ?? '';
    expect(btnActive).toContain('transform: translateY(2px)');
    expect(btnActive).toContain('box-shadow');
    expect(btnActive).toContain('var(--press-in)');
    const btnBase = controls.split('.btn {')[1]?.split('}')[0] ?? '';
    expect(btnBase).toContain('var(--spring-snappy)');
  });

  it('slot spring on cutters with 1:1 direct-manipulation bypass', () => {
    const cutterRule = controls.split('.cutter {')[1]?.split('}')[0] ?? '';
    expect(cutterRule).toContain('transition: transform var(--spring-snappy)');
    expect(controls).toContain('.cutter.dragging');
    expect(controls.split('.cutter.dragging')[1]?.split('}')[0]).toContain('transition: none');
    expect(cutter).toContain("classList.add('dragging')");
    expect(cutter).toContain("classList.remove('dragging')");
  });

  it('gauge needle & arc are damped (critical-damping spring)', () => {
    expect(machine.split('.gauge-needle {')[1]?.split('}')[0] ?? '').toContain(
      'transition: transform var(--spring-smooth)'
    );
    expect(machine.split('.gauge-arc-fg {')[1]?.split('}')[0] ?? '').toContain(
      'transition: stroke-dashoffset var(--spring-smooth)'
    );
  });

  it('overlay entrances: toast-in (bouncy) and sheet-in (smooth)', () => {
    expect(motion).toContain('@keyframes toast-in');
    expect(motion).toContain('@keyframes sheet-in');
    expect(controls).toContain('animation: toast-in var(--spring-bouncy) both');
    expect(controls).toContain('animation: sheet-in var(--spring-smooth) both');
    expect(controls).toContain('animation: fade-in 200ms ease both'); // 背景幕淡入
  });

  it('push-stone shake keeps frozen exponential-decay parameters', () => {
    expect(motion).toContain('x(t)=A·e^(−t/τ)·sin(2πft)');
    expect(motion).toContain('A=5px、f=3.5Hz、τ=200ms、480ms');
  });

  it('scroll damping: modal contain ×2 (MDN overscroll-behavior)', () => {
    expect(controls).toContain('overscroll-behavior: contain');
    expect(controls.match(/overscroll-behavior: contain/g)?.length).toBeGreaterThanOrEqual(2);
    expect(base).toContain('overscroll-behavior-y: none');
  });

  it('reduced-motion kill-switch still covers everything', () => {
    expect(motion).toContain('@media (prefers-reduced-motion: reduce)');
    expect(motion).toContain('[data-freeze=\'1\']');
  });
});

// ── v4.7 M3 修复批：RT 降级矩阵接线（P0-1 / P1-1 / P1-3）──
describe('v4 RT degradation wiring (M3-P0/P1)', () => {
  it('thick & dark surfaces consume dual-appearance tokens so RT can take over', () => {
    const panel = machine.split('.machine-panel {')[1]?.split('}')[0] ?? '';
    expect(panel).toContain('linear-gradient');
    const dialog = controls.split('.dialog {')[1]?.split('}')[0] ?? '';
    expect(dialog).toContain('var(--glass-sheet-hi)');
    expect(dialog).toContain('var(--glass-sheet-lo)');
  });

  it('token light values are pixel-frozen to the pre-token literals (zero drift)', () => {
    // 深面玻璃族：浅/深外观同值（暗玻璃叠暗面板），深色块不覆写即双外观冻结
    expect(tokens).toContain('--glass-obs-hi: rgba(35, 33, 27, 0.8)');
    expect(tokens).toContain('--glass-obs-lo: rgba(25, 24, 19, 0.86)');
    expect(tokens).toContain('--glass-status-hi: rgba(38, 36, 32, 0.72)');
    expect(tokens).toContain('--glass-status-lo: rgba(29, 27, 22, 0.78)');
    expect(tokens).toContain('--glass-sheet-hi: rgba(45, 43, 36, 0.86)');
    expect(tokens).toContain('--glass-sheet-lo: rgba(38, 36, 32, 0.9)');
    // 厚材质族：惰性 var 链（浅/深分别解析 machine/machine-hi/machine-lo）
    expect(tokens).toContain('--mat-thick-bg: color-mix(in srgb, var(--machine) 92%, transparent)');
    // 深色块不得覆写厚材质三端点（一旦覆写即绕过 machine 惰性链，深色中段 α 偏离
    // 令牌化前字面 color-mix —— 2026-09-08 复盘修正：遗留 rgba(58,53,42,.94) 已移除；
    // 断言取「声明形」token+冒号，注释里的令牌名不算数）
    const darkBlock = tokens.split('@media (prefers-color-scheme: dark)')[1]?.split('@media (prefers-reduced-transparency')[0] ?? '';
    expect(darkBlock).not.toMatch(/--mat-thick-bg(-hi|-lo)?\s*:/);
  });

  it('RT block collapses every thick/dark surface token to opaque (no translucent endpoint)', () => {
    const rt = tokens.split('@media (prefers-reduced-transparency: reduce)')[1] ?? '';
    for (const t of [
      '--mat-thick-bg:', '--mat-thick-bg-hi:', '--mat-thick-bg-lo:',
      '--glass-obs-hi:', '--glass-obs-lo:',
      '--glass-status-hi:', '--glass-status-lo:',
      '--glass-sheet-hi:', '--glass-sheet-lo:',
    ]) {
      expect(rt).toContain(t);
    }
    // 全部落回不透明 var(--machine*)/var(--coal*) 实色：端点令牌无任何 rgba 字面值
    expect(rt).not.toMatch(/--(mat-thick|glass-(obs|status|sheet))[^;]*rgba/);
  });

  it('RT kills backdrop-filter outright (no blur(0px) sampling layer left) — P1-1', () => {
    const rt = tokens.split('@media (prefers-reduced-transparency: reduce)')[1] ?? '';
    for (const sel of [
      '.machine-panel', '.cycle-plate', '.tool-btn', '.observation',
      '.status-line', '.toast', '.dialog-backdrop', '.ending-wrap',
    ]) {
      expect(rt).toContain(sel);
    }
    expect(rt).toContain('backdrop-filter: none');
    expect(rt).toContain('-webkit-backdrop-filter: none');
    // tokens.css 先于 machine/controls 加载：:root 前缀保证特异性压过基础规则
    expect(rt).toContain(':root .machine-panel');
    expect(rt).toContain(':root .ending-wrap');
  });

  it('dialog drops its own backdrop layer (backdrop-root trapped, visually null) — P1-3', () => {
    const dialog = controls.split('.dialog {')[1]?.split('}')[0] ?? '';
    expect(dialog).not.toMatch(/backdrop-filter\s*:/); // 无 backdrop-filter 声明（注释提及不算）
    // scrim blur 与 panel blur 两层保留
    const backdrop = controls.split('.dialog-backdrop {')[1]?.split('}')[0] ?? '';
    expect(backdrop).toContain('blur(var(--scrim-blur))');
    expect(machine.split('.machine-panel {')[1]?.split('}')[0] ?? '').toContain(
      'blur(var(--mat-blur-l))'
    );
  });
});

// ── v4.5 M2 层次深化 ──
describe('v4 M2 depth pass', () => {
  it('burning window transmits firelight through the observation glass (CSS state class only)', () => {
    expect(tokens).toContain('--stage-ember:');
    expect(tokens).toContain('--stage-ember-deep:');
    const before = machine.split('.observation::before')[1]?.split('}')[0] ?? '';
    expect(before).toContain('var(--stage-ember)');
    expect(before).toContain('transition: opacity var(--spring-smooth)'); // RM kill-switch 覆盖（*::before）
    expect(machine).toContain('.machine.burning .observation::before');
    // RT 塌缩：透射是材质效果，降级矩阵内整体失效
    const rt = tokens.split('@media (prefers-reduced-transparency: reduce)')[1] ?? '';
    expect(rt).toContain('--stage-ember: transparent');
    expect(rt).toContain('--stage-ember-deep: transparent');
  });

  it('tool-btn hover specular uses the M4 static tokens; hover stays distinct from active', () => {
    expect(tokens).toContain('--mat-spec-hi: rgba(255, 252, 240, 0.5)');
    expect(tokens).toContain('--mat-spec-lo: rgba(122, 106, 74, 0.28)');
    const dark = tokens.split('@media (prefers-color-scheme: dark)')[1]?.split('@media (prefers-reduced-transparency')[0] ?? '';
    expect(dark).toContain('--mat-spec-hi: rgba(255, 252, 240, 0.22)');
    expect(dark).toContain('--mat-spec-lo: rgba(0, 0, 0, 0.35)');
    const hover = machine.split('.tool-btn:hover:not(:active)')[1]?.split('}')[0] ?? '';
    expect(hover).toContain('var(--mat-spec-hi)');
    const act = machine.split('.tool-btn:active')[1]?.split('}')[0] ?? '';
    // v4.8 M4 LG-1 修订：激活态以一行令牌覆写抬升 conic 顶带（--mat-spec-hi-act）；
    // hover 的 inset 高光环仍不进 :active（受压收回悬浮高光的层级语义保持）
    expect(act).not.toContain('inset 0 0 0 1px var(--mat-spec-hi)');
    // RT / contrast-more 塌缩为平边框色（M4 草案 §4）
    const rt = tokens.split('@media (prefers-reduced-transparency: reduce)')[1]?.split('@media (prefers-contrast: more)')[0] ?? '';
    expect(rt).toContain('--mat-spec-hi: var(--glass-float-edge)');
    const cm = tokens.split('@media (prefers-contrast: more)')[1] ?? '';
    expect(cm).toContain('--mat-spec-hi: var(--glass-float-edge)');
  });

  it('tutorial note carries the paper material (paper + hairline edge + inner highlight)', () => {
    expect(tokens).toContain('--paper-hi: rgba(255, 255, 255, 0.65)');
    const note = machine.split('.tutorial-note {')[1]?.split('}')[0] ?? '';
    expect(note).toContain('background-color: var(--paper)'); // v4.8 M5 IL-5：纸纹层后底色走长hand
    expect(note).toContain('var(--paper-edge)');
    expect(note).toContain('inset 0 1px 0 var(--paper-hi)');
    expect(note).toContain('var(--shadow-card)');
  });

  it('ending curtain: glass sheet over a scrimmed stage, text stays on dark glass', () => {
    const wrap = machine.split('.ending-wrap {')[1]?.split('}')[0] ?? '';
    expect(wrap).toContain('var(--glass-sheet-hi)');
    expect(wrap).toContain('var(--glass-sheet-lo)');
    expect(wrap).toContain('blur(var(--mat-blur-m))');
    const stage = machine.split('.stage--ending {')[1]?.split('}')[0] ?? '';
    expect(stage).toContain('position: relative');
    const curtain = machine.split('.stage--ending::before')[1]?.split('}')[0] ?? '';
    expect(curtain).toContain('background: var(--scrim)');
  });
});

// ── v4.7 M3-P1-2：mount-rise 玻璃祖先不淡入 ──
describe('v4 mount-rise glass ancestors (M3-P1-2)', () => {
  it('glass ancestors animate transform-only (no opacity<1 truncation window)', () => {
    expect(motion).toContain('.machine > .machine-header');
    expect(motion).toContain('.machine > .machine-panel');
    expect(motion).toContain('.machine > .ending-wrap');
    const solid = motion.match(/@keyframes mount-rise-solid\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(solid).toContain('transform: translateY(4px)');
    expect(solid).not.toContain('opacity');
    // 入场动画本体保留：淡入变体仍服务非玻璃子块
    expect(motion).toContain('@keyframes mount-rise');
    const rise = motion.match(/@keyframes mount-rise\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(rise).toContain('opacity: 0');
  });
});

// ── v4.8 M4 液态玻璃语汇（2026-09-08 所有者批复 K3 同批）──
describe('v4 M4 liquid glass vocabulary', () => {
  it('M4 tokens exist (specular act, lensing pair, press glow, cap shift)', () => {
    for (const t of [
      '--mat-spec-hi-act:', '--glass-lens-out:', '--glass-lens-rim:', '--press-glow:', '--cap-shift:',
    ]) {
      expect(tokens).toContain(t);
    }
  });

  it('edge specular = padding-box/border-box double background conic (no mask, no svg filter)', () => {
    const tb = machine.split('.tool-btn {')[1]?.split('}')[0] ?? '';
    expect(tb).toContain('padding-box');
    expect(tb).toContain('border-box');
    expect(tb).toContain('conic-gradient(');
    expect(tb).toContain('var(--mat-spec-hi)');
    expect(tb).toContain('var(--mat-spec-lo)');
    expect(machine).not.toContain('mask-image'); // §2.8 否决项回归锁
    expect(machine).not.toContain('feDisplacementMap'); // §2.8 否决项回归锁
  });

  it('activation raises specular via one-line local token override', () => {
    const act = machine.split('.tool-btn:active')[1]?.split('}')[0] ?? '';
    expect(act).toContain('--mat-spec-hi: var(--mat-spec-hi-act)');
  });

  it('press liquid feel: cap displaces on the press-in edge (pair contract extended)', () => {
    const capAct = machine.split('.tool-btn:active::after')[1]?.split('}')[0] ?? '';
    expect(capAct).toContain('translateY(var(--cap-shift))');
    expect(capAct).toContain('var(--press-in)');
    const act = machine.split('.tool-btn:active')[1]?.split('}')[0] ?? '';
    expect(act).toContain('transform: translateY(1px)'); // 按压反馈对不被削弱
    expect(act).toContain('inset 0 2px 4px var(--press-glow)'); // energize 内发光
    expect(act).toContain('var(--press-in)');
  });

  it('lensing rims attach to the floating layer only (content layer stays clean)', () => {
    for (const block of [
      controls.split('.toast {')[1]?.split('}')[0] ?? '',
      controls.split('.dialog {')[1]?.split('}')[0] ?? '',
      machine.split('.cycle-plate {')[1]?.split('}')[0] ?? '',
      machine.split('.tool-btn {')[1]?.split('}')[0] ?? '',
    ]) {
      expect(block).toContain('var(--glass-lens-');
    }
    for (const anchor of ['.machine-panel {', '.observation {', '.tutorial-note {']) {
      const block = machine.split(anchor)[1]?.split('}')[0] ?? '';
      expect(block).not.toContain('spec');
      expect(block).not.toContain('lens');
    }
  });

  it('knob detent stays on snappy spring (micro-overshoot locked; bouncy forbidden)', () => {
    const p = controls.split('.gain-pointer {')[1]?.split('}')[0] ?? '';
    expect(p).toContain('transition: --knob-rot var(--spring-snappy)');
    expect(p).not.toContain('bouncy'); // M4 §2.6 量纲分析的行为锁
  });

  it('degradation matrix collapses M4 tokens (RT block redefines them)', () => {
    const rt = tokens.split('@media (prefers-reduced-transparency: reduce)')[1]?.split('@media (prefers-contrast: more)')[0] ?? '';
    expect(rt).toContain('--mat-spec-hi-act: var(--glass-float-edge)');
    expect(rt).toContain('--glass-lens-out: transparent');
    expect(rt).toContain('--glass-lens-rim: transparent');
    expect(rt).toContain('--press-glow: transparent');
    expect(rt).toContain('--cap-shift: 0px');
  });
});

// ── v4.8 M5 插画与沉浸语汇（2026-09-08 所有者批复 K2 全项）──
describe('v4 M5 illustration vocabulary', () => {
  it('M5 tokens exist (ember bed, bench stencil, engraving, ending imagery, paper grain)', () => {
    for (const t of [
      '--ember-bed:', '--ember-bed-deep:', '--bench-mark:', '--bench-mark-soft:',
      '--engrave-ink:', '--imagery-ash:', '--imagery-noise:', '--imagery-grid:',
      '--imagery-glow:', '--imagery-ghost:', '--imagery-ghost-line:', '--paper-grain:',
    ]) {
      expect(tokens).toContain(t);
    }
  });

  it('ending imagery layers exist for all five endings, above scrim and below glass, no backdrop', () => {
    const common = machine.split('.stage--ending::after')[1]?.split('}')[0] ?? '';
    expect(common).toContain('z-index: -1'); // scrim(::before) 之上、.ending-wrap 之下
    for (const e of ['ending-a', 'ending-b', 'ending-c', 'ending-d', 'ending-e']) {
      const block = machine.split(`.stage--ending.${e}::after`)[1]?.split('}')[0] ?? '';
      expect(block.length).toBeGreaterThan(0);
      expect(block).toContain('var(--imagery-');
      expect(block).not.toContain('backdrop-filter'); // M3 §1.3：不给采样模糊加面积
    }
  });

  it('ember bed is driven by --ember-level from GameState.heat (D26 same path as flame)', () => {
    const bed = machine.split('.furnace-card::after')[1]?.split('}')[0] ?? '';
    expect(bed).toContain('var(--ember-level, 0)');
    expect(bed).toContain('var(--ember-bed)');
    const mts = readFileSync(join(ROOT, 'src', 'ui', 'machine.ts'), 'utf8');
    expect(mts).toContain("setProperty('--ember-level'");
  });

  it('act engraving hooks the data-act state on the machine element (zero-semantics pseudo)', () => {
    for (const a of ['1', '2', '3']) {
      const block = machine.split(`.machine[data-act='${a}'] .machine-panel::after`)[1]?.split('}')[0] ?? '';
      expect(block).toContain('var(--engrave-ink)');
    }
    const mts = readFileSync(join(ROOT, 'src', 'ui', 'machine.ts'), 'utf8');
    expect(mts).toContain('dataset.act = String(this.state.act)');
    const pseudo = machine.split('.machine-panel::after')[1]?.split('}')[0] ?? '';
    expect(pseudo).toContain("content: ''"); // 零文本
  });

  it('bench stencil lives on the round stage only (home/ending override wholesale)', () => {
    const stage = machine.split('.stage {')[1]?.split('}')[0] ?? '';
    expect(stage).toContain('var(--bench-mark)');
    const home = machine.split('.stage--home {')[1]?.split('}')[0] ?? '';
    expect(home).not.toContain('bench-mark');
  });

  it('paper grain uses crosshatch only (no feTurbulence, no raster assets) and collapses in CM', () => {
    for (const anchor of ['.panel:not(.on-dark) {', '.tutorial-note {', '.result-card {']) {
      const block = machine.split(anchor)[1]?.split('}')[0] ?? '';
      expect(block).toContain('var(--paper-grain)');
    }
    for (const f of ['tokens.css', 'controls.css', 'machine.css', 'motion.css', 'base.css', 'responsive.css']) {
      expect(read(f)).not.toContain('feTurbulence'); // 拒绝清单回归锁
      expect(read(f)).not.toMatch(/url\([^)]*\.(png|jpe?g|webp)/i); // 禁光栅资产
    }
    const rt = tokens.split('@media (prefers-reduced-transparency: reduce)')[1]?.split('@media (prefers-contrast: more)')[0] ?? '';
    expect(rt).toContain('--ember-bed: transparent');
    expect(rt).toContain('--imagery-ash: transparent');
    const cm = tokens.split('@media (prefers-contrast: more)')[1] ?? '';
    expect(cm).toContain('--bench-mark: transparent');
    expect(cm).toContain('--engrave-ink: transparent');
    expect(cm).toContain('--paper-grain: transparent');
  });
});

// ── v4.9 M6 结局版画（2026-09-09 所有者授权「LLM 直写 SVG」路线首批入库）──
describe('v4 M6 ending woodcuts', () => {
  const mts = readFileSync(join(ROOT, 'src', 'ui', 'machine.ts'), 'utf8');
  const woodcuts = mts.split('const ENDING_WOODCUTS')[1]?.split('};')[0] ?? '';

  it('five woodcuts are embedded and mounted as an aria-hidden plate above the banner', () => {
    expect((woodcuts.match(/<svg/g) ?? []).length).toBe(5);
    for (const e of ["'a':", "'b':", "'c':", "'d':", "'e':"]) {
      expect(woodcuts).toContain(e);
    }
    expect(mts).toContain("plate.className = 'ending-plate'");
    expect(mts).toContain("plate.setAttribute('aria-hidden', 'true')");
    expect(mts).toContain('endWrap.appendChild(plate)');
    // 挂载先于横幅（版画板位于结算玻璃幕顶部）
    expect(mts.indexOf('endWrap.appendChild(plate)')).toBeLessThan(mts.indexOf('renderEndingBanner(endWrap'));
    const plate = machine.split('.ending-plate {')[1]?.split('}')[0] ?? '';
    expect(plate).toContain('min(300px, 78vw)'); // svh 不支持时的回退上限
    // 满屏 tableau 预算：900 高视口 machine 须保持 842 零滚动，≥~1031px 视口达 300 满幅
    expect(plate).toContain('clamp(140px, calc(100svh * 1.5 - 1220px), 300px)');
  });

  it('woodcuts carry zero text nodes (player-visible text stays in CONTENT_SPEC)', () => {
    expect(woodcuts).not.toContain('<text');
    expect(woodcuts).not.toContain('<tspan');
  });

  it('woodcut fills stay inside the art sub-palette (no hardening)', () => {
    const ART = new Set([
      '#17150f', '#26231c', '#38342a', '#55503f', '#8d8368', '#d8d0ba',
      '#b6ab94', '#d5c9ab', '#f7f2e2', '#22201a', '#262420', '#e4decb',
      '#a43a2f', '#c0503f', '#e48034', '#b44622', '#7c2a20',
      '#0d0c09', '#b3ac97', '#2c625a', // 深黑/on-coal-dim（暗幕件）；fidelity 绿（C 语义锚）
    ]);
    const used = woodcuts.match(/#[0-9a-f]{6}\b/g) ?? [];
    const off = [...new Set(used.filter((c) => !ART.has(c)))];
    expect(off).toEqual([]);
    // 五件统一画幅
    expect((woodcuts.match(/viewBox="0 0 320 200"/g) ?? []).length).toBe(5);
  });
});

// ── v5.0 M7 全程插画与微动效（2026-09-09 所有者批复 K1–K5；LLM 直写 SVG 第二批）──
describe('v5 M7 illustrations & micro-motion', () => {
  const mts = readFileSync(join(ROOT, 'src', 'ui', 'machine.ts'), 'utf8');
  const motion = readFileSync(join(ROOT, 'src', 'styles', 'motion.css'), 'utf8');
  const sealsBlock = mts.split('const CARD_SEALS')[1]?.split('];')[0] ?? '';
  const homeBlock = mts.split('const HOME_STANDBY')[1]?.split(';\r\n')[0] ?? mts.split('const HOME_STANDBY')[1]?.split(';\n')[0] ?? '';
  const interiorBlock = mts.split('const FURNACE_INTERIOR')[1]?.split(';\r\n')[0] ?? mts.split('const FURNACE_INTERIOR')[1]?.split(';\n')[0] ?? '';
  const allArt = sealsBlock + homeBlock + interiorBlock;

  it('twelve card seals + home standby + furnace interior are embedded', () => {
    expect((sealsBlock.match(/<svg/g) ?? []).length).toBe(12);
    expect((sealsBlock.match(/viewBox="0 0 96 96"/g) ?? []).length).toBe(12);
    expect(homeBlock).toContain('viewBox="0 0 320 200"');
    expect(interiorBlock).toContain('viewBox="0 0 480 120"');
  });

  it('mounts are aria-hidden; seal floats in feed body and swaps per cycle', () => {
    expect(mts).toContain("homePlate.className = 'home-plate'");
    expect(mts).toContain("homePlate.setAttribute('aria-hidden', 'true')");
    expect(mts).toContain("cardSeal.className = 'card-seal'");
    expect(mts).toContain("cardSeal.setAttribute('aria-hidden', 'true')");
    expect(mts).toContain('feedPanel.body.prepend(cardSeal)'); // 浮动落款：文字环绕
    expect(mts).toContain("interior.className = 'furnace-interior'");
    expect(mts).toContain('observation.root.prepend(interior)'); // 火焰层之下
    expect(mts).toContain('CARD_SEALS[this.state.cycle - 1] ??');
    // H2 点亮钩子挂在 470ms 纸卡脉冲同拍
    expect(mts).toContain("querySelector<HTMLElement>('.home-plate')?.classList.add('plate-lit')");
  });

  it('illustrations carry zero text nodes', () => {
    expect(allArt).not.toContain('<text');
    expect(allArt).not.toContain('<tspan');
  });

  it('fills stay inside the art sub-palette; teal confined to C12 seal', () => {
    const ART = new Set([
      '#17150f', '#26231c', '#38342a', '#55503f', '#8d8368', '#d8d0ba',
      '#b6ab94', '#d5c9ab', '#f7f2e2', '#22201a', '#262420', '#e4decb',
      '#a43a2f', '#c0503f', '#e48034', '#b44622', '#7c2a20',
      '#0d0c09', '#b3ac97', '#2c625a',
    ]);
    const used = allArt.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
    expect([...new Set(used.filter((c) => !ART.has(c.toLowerCase())))]).toEqual([]);
    const entries = sealsBlock.split("',");
    const tealOffenders = entries.filter((e) => e.toLowerCase().includes('#2c625a') && !e.includes('C12'));
    expect(tealOffenders).toEqual([]);
  });

  it('mw-* animation vocabulary drives the illustrations; freeze/RM covered by global kill-switch', () => {
    for (const kf of ['mw-rise', 'mw-march', 'mw-pulse', 'mw-flicker', 'mw-drift', 'mw-tilt', 'mw-enter', 'door-glow']) {
      expect(motion).toContain(`@keyframes ${kf}`);
    }
    // 类已在 SVG 内（候选库 animate 注入）
    for (const cls of ['mw-rise', 'mw-march', 'mw-pulse', 'mw-flicker', 'mw-drift', 'mw-tilt']) {
      expect(allArt).toContain(`class="${cls}"`);
    }
    // H2 冷态/点亮与 G5 辉光
    expect(motion).toContain('.home-plate.plate-lit');
    expect(motion).toContain('.machine.burning .observation::after');
    // freeze 全局关断（D29）不因新词汇表面失效
    expect(motion).toContain("[data-freeze='1'] *");
  });

  it('layout budgets locked: home tableau sizing + seal float + interior layering', () => {
    const mach = readFileSync(join(ROOT, 'src', 'styles', 'machine.css'), 'utf8');
    const plateCss = mach.split('.home-plate {')[1]?.split('}')[0] ?? '';
    expect(plateCss).toContain('clamp(140px, calc(100svh * 1.5 - 1220px), 300px)');
    const sealCss = mach.split('.card-seal {')[1]?.split('}')[0] ?? '';
    expect(sealCss).toContain('float: right');
    const intCss = mach.split('.furnace-interior {')[1]?.split('}')[0] ?? '';
    expect(intCss).toContain('z-index: -1');
    expect(mach).toContain('.machine.burning .furnace-interior .embers');
  });
});

// ── v4.6 防硬化回归：styles/*.css 的 hex 白名单（新增裸 hex 须显式入册并审对比度） ──
describe('v4 hex allowlist (anti-hardening)', () => {
  const ALLOWLIST = new Set([
    '#0d0c09', '#0d0c0a', '#12100c', '#15150f', '#16140f', '#17150f', '#171613', '#171a1c',
    '#1b1613', '#1c1a16', '#1d1b16', '#1e1a15', '#1f1b15', '#201d17', '#201e19', '#211f19',
    '#22201a', '#241f19', '#24261f', '#26221a', '#26231c', '#262420', '#262b2e', '#2a2822',
    '#2b261e', '#2b2721', '#2c625a', '#2d2b24', '#312723', '#322d22', '#332c24', '#33302a',
    '#37302a', '#38342a', '#3a342a', '#3a3527', '#3a352a', '#3c3931', '#3f3a2b', '#453f30',
    '#45402f', '#45423a', '#463d31', '#47847a', '#4a3a08', '#4a443a', '#4a463a', '#4f4936',
    '#55503c', '#55503f', '#5e5744', '#6b6350', '#7a5f10', '#7c2a20', '#7d745c', '#8d8368',
    '#948a72', '#a2977f', '#a43a2f', '#a89a76', '#ac9f7d', '#b2453a', '#b3ac97', '#b6ab94',
    '#bfb392', '#c0503f', '#c14a38', '#c4bca4', '#c6bca7', '#c8bb9b', '#c9bfa2', '#cabf9f',
    '#cdc3a4', '#cfc8b4', '#d4622f', '#d4a72c', '#d5c9ab', '#d86a56', '#d8d0ba', '#d9a05b',
    '#ded5bb', '#e0d6bc', '#e4decb', '#e8c14f', '#e9e1c8', '#efe8d0', '#f0e9d6', '#f5efdd',
    '#f7f2e2', '#f9f4e4', '#a89f87', '#fbf6e6', '#fbf6e7',
  ]);

  it('no hex literal outside the registered allowlist', () => {
    const offenders: string[] = [];
    for (const f of readdirSync(join(ROOT, 'src', 'styles'))) {
      const hexes = read(f).match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      for (const h of hexes) if (!ALLOWLIST.has(h.toLowerCase())) offenders.push(`${f}: ${h}`);
    }
    expect(offenders).toEqual([]);
  });
});
