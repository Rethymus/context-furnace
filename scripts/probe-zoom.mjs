import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/');
await page.getByTestId('power-on').click();
await page.waitForTimeout(1500);
await page.getByTestId('ignite').click();
await page.waitForTimeout(300);
for (let i = 0; i < 3; i++) {
  await page.getByTestId('ignite').click();
  await page.waitForTimeout(1300);
  if (i < 2) { await page.getByTestId('next').click(); await page.waitForTimeout(300); }
}
const feed = page.getByTestId('feed');
await feed.screenshot({ path: 'shots/feed-c4.png' });
const track = page.locator('.track');
await track.screenshot({ path: 'shots/track-c4.png' });
console.log('done');
await browser.close();
