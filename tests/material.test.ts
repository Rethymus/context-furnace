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
    expect(machine).toContain('color-mix(in srgb, var(--machine) 92%, transparent)');
  });

  it('observation window & status line sample the backdrop (dark glass)', () => {
    const obs = machine.split('.observation {')[1]?.split('}')[0] ?? '';
    expect(obs).toContain('backdrop-filter');
    const status = machine.split('.status-line {')[1]?.split('}')[0] ?? '';
    expect(status).toContain('backdrop-filter');
  });

  it('floating layer (toast/dialog/plate/tool-btn) is real glass', () => {
    for (const block of [
      controls.split('.toast {')[1]?.split('}')[0] ?? '',
      controls.split('.dialog {')[1]?.split('}')[0] ?? '',
      machine.split('.cycle-plate {')[1]?.split('}')[0] ?? '',
      machine.split('.tool-btn {')[1]?.split('}')[0] ?? '',
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
