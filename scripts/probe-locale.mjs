import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/');
await page.waitForTimeout(300);
console.log(await page.evaluate(() => ({
  langs: navigator.languages,
  lang: document.documentElement.lang,
  title: document.title,
  stored: localStorage.getItem('cf.locale'),
})));
await page.getByTestId('locale-toggle').click();
await page.waitForTimeout(200);
console.log(await page.evaluate(() => ({
  lang: document.documentElement.lang,
  title: document.title,
  stored: localStorage.getItem('cf.locale'),
  motto: document.querySelector('[data-testid="home-motto"]')?.textContent,
})));
await browser.close();
