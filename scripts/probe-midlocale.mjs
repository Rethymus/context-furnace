import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto('http://localhost:4173/');
await page.getByTestId('power-on').click();
await page.waitForTimeout(1500);
await page.getByTestId('ignite').click(); // 教学完成
await page.waitForTimeout(300);
await page.getByTestId('ignite').click(); // C1
await page.waitForTimeout(1300);
await page.getByTestId('next').click();
await page.waitForTimeout(300);
const left = page.locator('[data-cutter="left"]');
await left.focus();
await page.keyboard.press('ArrowRight');
console.log('before:', await page.evaluate(() => ({
  lang: document.documentElement.lang,
  feed: document.querySelector('[data-testid="feed"]')?.textContent?.slice(0, 12),
  dim: document.querySelectorAll('.feed-seg.dim').length,
})));
await page.getByTestId('locale-toggle').click();
await page.waitForTimeout(400);
console.log('after:', await page.evaluate(() => ({
  lang: document.documentElement.lang,
  feed: document.querySelector('[data-testid="feed"]')?.textContent?.slice(0, 12),
  dim: document.querySelectorAll('.feed-seg.dim').length,
  cycle: document.querySelector('[data-testid="cycle-display"]')?.textContent,
})));
await browser.close();
