// 视觉冒烟：首页 → POWER ON → 截图（供无障碍视觉检查，非正式 e2e）。
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('shots', { recursive: true });
const browser = await chromium.launch(
  process.env.CHROMIUM_CHANNEL ? { channel: process.env.CHROMIUM_CHANNEL } : {},
);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/');
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/home-zh.png', fullPage: true });

// 中文版完整流程走查（截图主界面 C04 与 C05）
await page.getByTestId('power-on').click();
await page.waitForTimeout(1500);
// 教学出现 → 直接 IGNITE（D35 任意时刻可点）→ 进入 Cycle 01
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/tutorial-zh.png', fullPage: true });
await page.getByTestId('ignite').click();
await page.waitForTimeout(300);
// 完整跑 3 轮到 C04 画面（full select + gain 0）
for (let i = 0; i < 3; i++) {
  await page.getByTestId('ignite').click();
  await page.waitForTimeout(1300);
  await page.getByTestId('next').click();
  await page.waitForTimeout(300);
}
await page.screenshot({ path: 'shots/cycle4-zh.png', fullPage: true });

// 切英文
await page.getByTestId('locale-toggle').click();
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/cycle4-en.png', fullPage: true });

// 设置面板
await page.getByTestId('settings-btn').click();
await page.waitForTimeout(200);
await page.screenshot({ path: 'shots/settings-zh.png' });

await browser.close();
console.log('smoke shots written');
