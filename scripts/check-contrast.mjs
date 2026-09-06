// UI_CONTRACT §4.4：对比度校验（开发/校验工具，D43 类；不进生产 bundle、不并入 verify）。
// 按 WCAG 2.1 相对亮度公式，对 tokens.css 两套外观的「材质合成最坏背景」逐对计算对比度。
// 运行：node scripts/check-contrast.mjs → 全部 ≥ AA 阈值时退出码 0。
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/tokens.css', 'utf8');

// 提取 :root 基底（深色外观）与 prefers-color-scheme: light 覆盖块
function extractVars(block) {
  const vars = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

const rootBlock = css.slice(css.indexOf(':root'), css.indexOf('@media'));
const lightStart = css.indexOf('@media (prefers-color-scheme: light)');
const lightBlock = css.slice(lightStart);
const dark = extractVars(rootBlock);
const lightOverride = extractVars(lightBlock);

function resolve(name, mode) {
  const table = mode === 'light' ? { ...dark, ...lightOverride } : dark;
  let v = table[name];
  if (v === undefined) throw new Error(`token --${name} (${mode}) not found`);
  // 解析 var() 引用（一层）
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/i);
  if (ref) v = resolve(ref[1], mode);
  return v;
}

function parseColor(v) {
  v = v.trim();
  if (v.startsWith('#')) {
    const h = v.slice(1);
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return {
      r: parseInt(f.slice(0, 2), 16),
      g: parseInt(f.slice(2, 4), 16),
      b: parseInt(f.slice(4, 6), 16),
      a: 1,
    };
  }
  const m = v.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const [r, g, b, a = '1'] = m[1].split(',').map((s) => parseFloat(s.trim()));
    return { r, g, b, a };
  }
  throw new Error(`unsupported color: ${v}`);
}

// src 不透明色上叠加 rgba 填充（CSS 合成）
function over(fg, bg) {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(c1, c2) {
  const l1 = luminance(c1);
  const l2 = luminance(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// 最坏背景合成：环境光斑（glow-warm 全强度）叠在台面上，再被材质填充覆盖
function worstBackdrops(mode) {
  const page = parseColor(resolve('surface-page', mode));
  const glow = parseColor(resolve('glow-warm', mode));
  return { dark: page, blob: over(glow, page) };
}

function materialFill(name, mode, backdrop) {
  return over(parseColor(resolve(name, mode)), backdrop);
}

let failures = 0;
function check(label, ratio, min) {
  const ok = ratio >= min;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${ratio.toFixed(2)}:1  (min ${min}:1)`);
}

for (const mode of ['dark', 'light']) {
  console.log(`\n══ ${mode === 'dark' ? '深色外观（缺省基底）' : '浅色外观'} ══`);
  const backdrops = worstBackdrops(mode);
  const paperDark = materialFill('mat-paper', mode, backdrops.dark); // 深文字最坏背景
  const paperBlob = materialFill('mat-paper', mode, backdrops.blob);
  const glassBlob = materialFill('mat-glass', mode, backdrops.blob); // 玻璃面浅/深文字最坏背景
  const page = backdrops.dark;
  const benchHi = parseColor(resolve('surface-bench-hi', mode));

  // 纸面材质上的文字（最坏 = 最暗合成背景）
  check(`ink / mat-paper (page 合成)`, contrast(parseColor(resolve('ink', mode)), paperDark), 4.5);
  check(`ink-soft / mat-paper (page 合成)`, contrast(parseColor(resolve('ink-soft', mode)), paperDark), 4.5);
  check(`ink-faint / mat-paper (page 合成)`, contrast(parseColor(resolve('ink-faint', mode)), paperDark), 4.5);
  // 仪表大号数字（24px/700 = large text，3:1）
  check(`heat 值 / mat-paper (large 3:1)`, contrast(parseColor(resolve('heat', mode)), paperDark), 3);
  check(`fidelity 值 / mat-paper (large 3:1)`, contrast(parseColor(resolve('fidelity', mode)), paperDark), 3);
  // 弧槽为装饰性底轨（WCAG 1.4.11 豁免：非信息载体，值弧+数字承载信息），
  // 仅要求「可感知」下限，不冒充 3:1
  check(`arc-track / mat-paper (装饰 ≥1.2)`, contrast(parseColor(resolve('arc-track', mode)), paperDark), 1.2);
  check(`heat / mat-paper (UI 3:1)`, contrast(parseColor(resolve('heat', mode)), paperDark), 3);

  // 玻璃材质上的文字（最坏 = 最亮合成背景）
  check(`glass-ink / mat-glass (blob 合成)`, contrast(parseColor(resolve('glass-ink', mode)), glassBlob), 4.5);
  check(`glass-ink-soft / mat-glass (blob 合成)`, contrast(parseColor(resolve('glass-ink-soft', mode)), glassBlob), 4.5);

  // 台面文字
  check(`bench-ink / surface-page`, contrast(parseColor(resolve('bench-ink', mode)), page), 4.5);
  check(`bench-ink / surface-bench-hi`, contrast(parseColor(resolve('bench-ink', mode)), benchHi), 4.5);
  check(`bench-ink-soft / surface-page`, contrast(parseColor(resolve('bench-ink-soft', mode)), page), 4.5);
  check(`amber-text / surface-page (boot-line)`, contrast(parseColor(resolve('amber-text', mode)), page), 4.5);
  // 焦点环 / 主按钮（非文字 3:1；按钮文字 4.5）
  check(`focus / surface-page (UI 3:1)`, contrast(parseColor(resolve('focus', mode)), page), 3);
  const btn = parseColor(resolve('heat', mode));
  const btnText = parseColor(resolve('paper', mode));
  check(`paper / heat (btn-primary 文字)`, contrast(btnText, btn), 4.5);
  // 纸面材质叠光斑后深文字仍可读（环境最亮处）
  check(`ink / mat-paper (blob 合成)`, contrast(parseColor(resolve('ink', mode)), paperBlob), 4.5);
}

console.log(
  failures === 0
    ? '\ncontrast ok: 全部组合 ≥ WCAG AA（两套外观、最坏背景合成）'
    : `\ncontrast FAILED: ${failures} 项未达标`,
);
process.exit(failures === 0 ? 0 : 1);
