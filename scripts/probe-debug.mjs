import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => console.log('PAGE:', m.text()));
page.on('pageerror', (e) => console.log('ERROR:', e.message));
await page.goto('http://localhost:4173/');
await page.getByTestId('power-on').click();
await page.waitForTimeout(1500);
await page.getByTestId('ignite').click(); // 教学完成
await page.waitForTimeout(400);
const info = await page.evaluate(() => {
  const segs = [...document.querySelectorAll('.feed-seg')].map((s) => ({
    i: s.dataset.index, cls: s.className, text: s.textContent.slice(0, 6),
  }));
  const cutters = [...document.querySelectorAll('.cutter')].map((c) => {
    const r = c.getBoundingClientRect();
    const blade = c.querySelector('.cutter-blade')?.getBoundingClientRect();
    return { which: c.dataset.cutter, btn: { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) }, blade: blade ? { x: Math.round(blade.x), w: Math.round(blade.width), h: Math.round(blade.height) } : null };
  });
  return { segs, cutters };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
