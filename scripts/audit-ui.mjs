// UI 材质/动效量化审计（临时工具，不入 verify）：采集计算样式、对比度、动效清单。
// 用法：先 npm run build && npm run preview，然后 node scripts/audit-ui.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.CAPTURE_BASE_URL ?? 'http://localhost:4173';
const OUT = join(process.cwd(), 'shots', 'audit');
mkdirSync(OUT, { recursive: true });

// WCAG 相对亮度与对比度
function srgb(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
function lum(r, g, b) { return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b); }
function contrast(fg, bg) {
  const l1 = lum(...fg), l2 = lum(...bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function parseRgb(s) {
  const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
const HEX = { paper: [247, 242, 226], ink: [34, 32, 26], inkSoft: [85, 80, 60], coal: [38, 36, 32], onCoal: [228, 222, 203], onCoalDim: [179, 172, 151], machine: [213, 201, 171], desk: [182, 171, 148], heat: [164, 58, 47], warn: [212, 167, 44], heatBright: [192, 80, 63] };
const PAIRS = [
  ['ink / paper 正文', HEX.ink, HEX.paper],
  ['inkSoft / paper 次级', HEX.inkSoft, HEX.paper],
  ['inkSoft / machine 面板标签', HEX.inkSoft, HEX.machine],
  ['onCoal / coal 深面正文', HEX.onCoal, HEX.coal],
  ['onCoalDim / coal 深面次级', HEX.onCoalDim, HEX.coal],
  ['heat(红) / paper', HEX.heat, HEX.paper],
  ['warn(黄焦点) / machine', HEX.warn, HEX.machine],
  ['warn(黄焦点) / coal', HEX.warn, HEX.coal],
  ['#f9f4e4 白字 / heat 主按钮', [249, 244, 228], HEX.heat],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
await page.goto(BASE);

const report = { contrastPairs: PAIRS.map(([n, f, b]) => ({ pair: n, ratio: +contrast(f, b).toFixed(2) })) };

async function surfaceProbe(state) {
  const rows = await page.evaluate(() => {
    const sels = ['.machine-panel', '.panel:not(.on-dark)', '.observation', '.status-line', '.dialog', '.dialog-backdrop', '.toast', '.btn-primary', '.gain-knob', '.cycle-plate'];
    return sels.map((s) => {
      const el = document.querySelector(s);
      if (!el) return { sel: s, present: false };
      const cs = getComputedStyle(el);
      return {
        sel: s, present: true,
        bg: cs.backgroundColor, bgImage: cs.backgroundImage !== 'none',
        alpha: cs.backgroundColor.match(/rgba?\([\d.]+,\s*[\d.]+,\s*[\d.]+,\s*([\d.]+)\)/)?.[1] ?? '1',
        backdropFilter: cs.backdropFilter === 'none' ? null : cs.backdropFilter,
        boxShadow: cs.boxShadow === 'none' ? null : cs.boxShadow.slice(0, 120),
        transition: cs.transitionDuration + ' ' + cs.transitionTimingFunction,
        overscroll: cs.overscrollBehavior,
      };
    });
  });
  report[state] = rows;
}

await page.screenshot({ path: join(OUT, 'home.png') });
await page.getByTestId('power-on').click();
await page.waitForTimeout(1500);
await page.getByTestId('ignite').click(); // 完成教学
await page.waitForTimeout(400);
for (let c = 1; c <= 3; c++) { // 到 C04 编辑态
  await page.getByTestId('ignite').click();
  await page.waitForTimeout(1100);
  if (c < 3) { await page.getByTestId('next').click(); await page.waitForTimeout(300); }
}
await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, 'cycle.png') });
await surfaceProbe('cycle');

// 设置浮层
await page.getByTestId('settings-open').click().catch(async () => {
  await page.keyboard.press('Tab'); // 兜底：focus 首个工具钮
});
await page.waitForTimeout(350);
await page.screenshot({ path: join(OUT, 'settings.png') });
await surfaceProbe('settings');

// 焦点环采样：Tab 到裁刀
const focusInfo = await page.evaluate(() => {
  const el = document.querySelector('[data-cutter="left"]');
  el?.focus();
  const cs = el ? getComputedStyle(el) : null;
  return cs ? { outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor, offset: cs.outlineOffset } : null;
});
report.focusRing = focusInfo;

// 深色模式模拟：仅探针（当前应无适配）
const dark = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
await dark.goto(BASE);
report.darkScheme = await dark.evaluate(() => {
  const cs = getComputedStyle(document.body);
  return { bodyBg: cs.backgroundColor, adapted: !!document.querySelector('[data-appearance="dark"], .dark') };
});
await dark.close();

await browser.close();
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
