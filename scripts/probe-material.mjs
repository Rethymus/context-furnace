// UI_CONTRACT §4：材质/动效视觉探查（开发工具，D43 类；非正式 e2e）。
// 采集浅/深外观 × 关键状态截图至 shots/material/，供人工视觉复核。
// 运行：npm run build && npm run preview & 后 node scripts/probe-material.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.PROBE_BASE_URL ?? 'http://localhost:4173';
const OUT = 'shots/material';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(
  process.env.CHROMIUM_CHANNEL ? { channel: process.env.CHROMIUM_CHANNEL } : {},
);

async function shoot(name, { colorScheme = 'light', viewport = { width: 1440, height: 900 }, reducedMotion = 'no-preference' } = {}, actions = null) {
  const context = await browser.newContext({ colorScheme, viewport, reducedMotion });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForTimeout(700);
  if (actions) await actions(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  await context.close();
  console.log(`shot: ${name}`);
}

// 教学跳过 + 走 N 轮（与 e2e helpers 同步的真实流程）
async function skipTutorial(page) {
  await page.getByTestId('power-on').click();
  await page.waitForTimeout(1500);
  await page.getByTestId('ignite').click();
  await page.waitForTimeout(300);
}

async function playRound(page, { gain = 0, leftMoves = 0 } = {}) {
  if (leftMoves) {
    const left = page.locator('[data-cutter="left"]');
    await left.focus();
    for (let i = 0; i < leftMoves; i++) await page.keyboard.press('ArrowRight');
  }
  if (gain > 0) await page.locator(`.gain-stop[data-value="${gain}"]`).click();
  await page.getByTestId('ignite').click();
  await page.waitForTimeout(1150);
}

async function cycle4(page) {
  await skipTutorial(page);
  for (let c = 1; c <= 3; c++) {
    await playRound(page, { gain: 0, leftMoves: c === 1 ? 1 : 0 });
    await page.getByTestId('next').click();
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(700);
}

// 1–2 首页（浅 / 深）
await shoot('home-light');
await shoot('home-dark', { colorScheme: 'dark' });

// 3–4 主界面 C04（浅 / 深）
await shoot('cycle4-light', {}, cycle4);
await shoot('cycle4-dark', { colorScheme: 'dark' }, cycle4);

// 5–6 设置浮层（浅 / 深；入场动画结束后）
async function openSettings(page) {
  await page.getByTestId('settings-btn').click();
  await page.waitForTimeout(650);
}
await shoot('settings-light', {}, openSettings);
await shoot('settings-dark', { colorScheme: 'dark' }, openSettings);

// 7 入炉瞬间（shake + 炉口 + 锁定）
await shoot('burning-light', {}, async (page) => {
  await skipTutorial(page);
  await page.getByTestId('ignite').click();
  await page.waitForTimeout(300);
});

// 8 toast（Cycle 05 载入解锁提示）
await shoot('toast-light', {}, async (page) => {
  await skipTutorial(page);
  for (let c = 1; c <= 4; c++) {
    await playRound(page, { gain: 0 });
    await page.getByTestId('next').click();
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(500); // toast 弹簧入场中后段
});

// 9 RM 模式（完整流程可玩 + 状态明确）
await shoot('cycle4-rm', { reducedMotion: 'reduce' }, async (page) => {
  await skipTutorial(page);
  await playRound(page, { gain: 0, leftMoves: 1 });
  await page.getByTestId('next').click();
  await page.waitForTimeout(400);
});

// 10 按压态（IGNITE 按下）
await shoot('pressed-light', {}, async (page) => {
  await skipTutorial(page);
  const box = await page.getByTestId('ignite').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(220);
});

// 11–12 移动端（浅 / 深）
await shoot('mobile-cycle4-light', { viewport: { width: 390, height: 844 } }, cycle4);
await shoot('mobile-cycle4-dark', { colorScheme: 'dark', viewport: { width: 390, height: 844 } }, cycle4);

await browser.close();
console.log('probe shots done');
