// UI_CONTRACT §4.7：产品全功能流程走查（开发探针，D43 类；非正式 e2e）。
// 两条真实玩家路径 + 独立数值对照：
//   路径 1：完整 12 周期通关（键盘保 CORE + 按解锁表用 GAIN）→ 结局 D/C，
//           每周期从 DOM 读 {total, cut, gain, heat, fidelity}，与按 DESIGN_SPEC §9
//           冻结公式独立重算的期望链逐轮对照（数据源：vite ssrLoadModule 直读 src 源码）。
//   路径 2：快进到 Cycle 09 → 拔插头 → 隐藏结局 E。
//   附加：设置面板五项功能操作（语言/声音/音量/动效/重播教学）。
// 运行：npm run build && npx vite preview --port 4173 & 后
//       CHROMIUM_CHANNEL=chrome node scripts/probe-fullrun.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer as createViteServer } from 'vite';

const BASE = process.env.PROBE_BASE_URL ?? 'http://localhost:4173';
const OUT = 'shots/fullrun';
mkdirSync(OUT, { recursive: true });

// ── 独立期望值链（不 import 游戏代码的运行时；只读冻结数据表与规格公式） ──
const vite = await createViteServer({ server: { middlewareMode: true }, logLevel: 'silent' });
const { CARDS } = await vite.ssrLoadModule('/src/game/cards.ts');
const { maxGainForCycle } = await vite.ssrLoadModule('/src/game/constants.ts');
const { ROLE_PENALTY } = await vite.ssrLoadModule('/src/game/constants.ts');
await vite.close();

const DECAY = (c) => (c <= 4 ? 12 : c <= 8 ? 15 : 18); // §9.2
const clamp = (min, max, v) => Math.min(max, Math.max(min, v));

function expectRound(card, coreIdx, cutL, cutR, gain, cur, cycle) {
  // §9.3 cutDamage：选区外 guard segments 的 penalty 和（cap 28）
  let sum = 0;
  card.segments.forEach((seg, i) => {
    if (i < cutL || i > cutR) sum += ROLE_PENALTY[seg.role];
  });
  const cutDamage = Math.min(28, sum);
  const ratio = (cutR - cutL + 1) / card.segments.length;
  const compression = ratio > 0.75 ? 0 : ratio > 0.5 ? 3 : ratio > 0.33 ? 6 : 9;
  const contextHeat = Math.min(10, Math.floor(cutDamage * 0.35));
  const gBonus = [0, 4, 9, 15][gain];
  const heatGain = clamp(10, 38, 10 + compression + contextHeat + gBonus);
  const gPen = [0, 1, 6, 12][gain];
  const fidDamage = Math.min(36, cutDamage + gPen);
  const nextHeat = clamp(0, 100, cur.heat - DECAY(cycle) + heatGain);
  const nextFid = clamp(0, 100, cur.fidelity - fidDamage);
  return { cutDamage, heatGain, fidDamage, nextHeat, nextFid };
}

// ── UI 通道 ──
const browser = await chromium.launch(
  process.env.CHROMIUM_CHANNEL ? { channel: process.env.CHROMIUM_CHANNEL } : {},
);
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'zh-CN',
});
const page = await context.newPage();
const shots = [];
async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  shots.push(name);
}
async function readGauges() {
  return page.evaluate(() => {
    const vals = [...document.querySelectorAll('.gauge-value')].map((e) => Number(e.textContent));
    return { heat: vals[0], fidelity: vals[1] };
  });
}
async function readRound() {
  return page.evaluate(() => {
    const total = document.querySelectorAll('.track-block').length;
    const dim = document.querySelectorAll('.feed-seg.dim').length;
    const checked = document.querySelector('.gain-stop[aria-checked="true"]');
    return { total, cut: total - dim, gain: checked ? Number(checked.dataset.value) : 0 };
  });
}

// ── 路径 1：完整通关（保 CORE + 最高可用 GAIN） ──
const log = { rounds: [], mismatches: [] };
await page.goto(BASE);
await page.waitForTimeout(600);
await shot('01-home');
await page.getByTestId('power-on').click();
await page.waitForTimeout(1800);
await shot('02-boot-tutorial');
await page.getByTestId('ignite').click(); // D35：任意时刻 IGNITE
await page.waitForTimeout(1400);

let cur = { heat: 52, fidelity: 100 }; // §9.1
let peakHeat = 52; // §9.7
const cutTally = [];
let highestGain = 0;
let ending = null;

for (let cycle = 1; cycle <= 12 && !ending; cycle++) {
  const card = CARDS[cycle - 1];
  const coreIdx = card.segments.findIndex((s) => s.id === card.coreSegmentId);
  const n = card.segments.length;

  // CUT：保持全选（D9 默认；cutDamage=0 → 保真损耗仅来自 GAIN，可打满 12 轮）
  // GAIN：用当前解锁的最高档（§27 时刻表的自然使用）
  const gain = maxGainForCycle(cycle);
  if (gain > 0) await page.locator(`.gain-stop[data-value="${gain}"]`).click();
  highestGain = Math.max(highestGain, gain);

  const before = await readGauges();
  const dom = await readRound();
  await page.getByTestId('ignite').click();
  await page.waitForTimeout(1400); // §8.3 950ms 反馈窗 + 余量
  const after = await readGauges();

  const exp = expectRound(card, coreIdx, 0, n - 1, gain, cur, cycle);
  const round = {
    cycle,
    dom,
    domHeatBefore: before.heat,
    domHeatAfter: after.heat,
    domFidBefore: before.fidelity,
    domFidAfter: after.fidelity,
    expHeatAfter: exp.nextHeat,
    expFidAfter: exp.nextFid,
    expCutDamage: exp.cutDamage,
    expHeatGain: exp.heatGain,
  };
  log.rounds.push(round);
  if (after.heat !== exp.nextHeat || after.fidelity !== exp.nextFid) {
    log.mismatches.push(round);
  }
  peakHeat = Math.max(peakHeat, after.heat);
  cutTally.push(1 - dom.cut / dom.total);
  if (cycle === 1) await shot('03-cycle1-result');
  if (cycle === 6) await shot('04-cycle6');
  cur = { heat: after.heat, fidelity: after.fidelity };

  const banner = page.locator('[data-testid="ending-banner"]');
  if (await banner.isVisible().catch(() => false)) {
    ending = await banner.innerText();
    await shot('05-ending');
    break;
  }
  await page.getByTestId('next').click();
  await page.waitForTimeout(500);
}

// 结局页统计（§14.1）与 §9.7 重算对照
await page.waitForTimeout(400);
await shot('06-result');
log.stats = await page.evaluate(() =>
  [...document.querySelectorAll('.result-list li')].map((li) => li.innerText.replace(/\n/g, ' ')),
);
const avgCutPct = Math.round((cutTally.reduce((a, b) => a + b, 0) / cutTally.length) * 100);
log.expectedStats = { peakHeat, avgCutPct, highestGain, endingReached: ending ?? '(none)' };
log.endingText = ending;

// ── 路径 2：隐藏结局 E（打完 8 轮进入 Cycle 09 编辑态 → 拔插头；canUnplug: cycle≥9 + ROUND_EDITING） ──
const logE = { rounds: 0, ending: null };
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
const p2 = await ctx2.newPage();
await p2.goto(BASE);
await p2.waitForTimeout(500);
await p2.getByTestId('power-on').click();
await p2.waitForTimeout(1500);
await p2.getByTestId('ignite').click();
await p2.waitForTimeout(1300);
for (let c = 1; c <= 8; c++) {
  await p2.getByTestId('ignite').click();
  await p2.waitForTimeout(1300);
  await p2.getByTestId('next').click();
  await p2.waitForTimeout(400);
  logE.rounds++;
}
const plugVisible = await p2.getByTestId('plug').isVisible().catch(() => false);
logE.plugVisibleAtC09 = plugVisible;
if (plugVisible) {
  await p2.getByTestId('plug').click();
  await p2.waitForTimeout(900);
  logE.ending = await p2.locator('[data-testid="ending-banner"]').innerText().catch(() => null);
  await p2.screenshot({ path: `${OUT}/07-ending-E.png` });
  shots.push('07-ending-E');
}
await ctx2.close();

// ── 设置面板五项功能操作 ──
const logS = {};
const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
const p3 = await ctx3.newPage();
await p3.goto(BASE);
await p3.waitForTimeout(500);
await p3.getByTestId('settings-btn').click();
await p3.waitForTimeout(500);
logS.languageSwitch = await p3.getByTestId('settings-dialog').locator('select').first().inputValue();
await p3.locator('[data-testid="sound-toggle"]').click();
logS.soundToggledTo = await p3.getByTestId('sound-toggle').innerText();
await p3.locator('[data-testid="volume"]').fill('30');
logS.volumeSet = await p3.locator('[data-testid="volume"]').inputValue();
await p3.locator('[data-testid="motion-select"]').selectOption('full');
logS.motionSet = await p3.locator('[data-testid="motion-select"]').inputValue();
logS.replayDisabledAtHome = await p3.getByTestId('replay-tutorial').isDisabled();
await p3.keyboard.press('Escape');
await p3.waitForTimeout(300);
logS.escapeClosed = (await p3.getByTestId('settings-dialog').count()) === 0;
await p3.getByTestId('locale-toggle').click();
await p3.waitForTimeout(300);
logS.headerLocaleToggledToEn = await p3.evaluate(() => document.documentElement.lang);
await ctx3.close();

writeFileSync(`${OUT}/fullrun-log.json`, JSON.stringify({ log, logE, logS }, null, 2));
console.log('rounds:', log.rounds.length, '| mismatches:', log.mismatches.length);
console.log('ending:', log.endingText ? log.endingText.split('\n')[0] : '(none)');
console.log('stats(dom):', JSON.stringify(log.stats));
console.log('stats(exp):', JSON.stringify(log.expectedStats));
console.log('endingE:', JSON.stringify(logE));
console.log('settings:', JSON.stringify(logS));
await browser.close();
