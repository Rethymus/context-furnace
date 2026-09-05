import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.addInitScript(() => {
  localStorage.setItem('cf.locale', 'zh-CN');
  localStorage.setItem('cf.tutorialSeen', '1');
});
await page.goto('http://localhost:4173/?freeze=1');
await page.getByTestId('power-on').click();
await page.waitForTimeout(1500);
for (let c = 1; c <= 7; c++) {
  const left = page.locator('[data-cutter="left"]');
  await left.focus();
  await page.keyboard.press('ArrowRight');
  if (c >= 5) await page.locator('.gain-stop[data-value="1"]').click();
  await page.getByTestId('ignite').click();
  await page.waitForTimeout(1300);
  const nextVisible = await page.getByTestId('next').isVisible().catch(() => false);
  const endingVisible = await page.getByTestId('ending-banner').isVisible().catch(() => false);
  console.log(`cycle ${c}: next=${nextVisible} ending=${endingVisible} heat=${await page.locator('[data-testid="gauge-heat"] .gauge-value').textContent()}`);
  if (!nextVisible && !endingVisible) break;
  if (c < 7) await page.getByTestId('next').click();
  await page.waitForTimeout(300);
}
await browser.close();
