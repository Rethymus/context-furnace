import { webkit } from '@playwright/test';
const b = await webkit.launch();
const page = await b.newPage();
page.on('console', m => console.log('PAGE:', m.text()));
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
await page.goto('http://localhost:4173/');
const r = await page.evaluate(() => {
  try {
    const C = window.AudioContext;
    if (!C) return { has: false };
    const ctx = new C();
    return { has: true, state: ctx.state, sampleRate: ctx.sampleRate };
  } catch (e) {
    return { has: true, threw: String(e) };
  }
});
console.log('direct construct:', JSON.stringify(r));
const r2 = await page.evaluate(() => {
  try {
    class Sub extends AudioContext { constructor(...a) { super(...a); window.__made = true; } }
    const c = new Sub();
    return { ok: true, made: window.__made === true, state: c.state };
  } catch (e) {
    return { threw: String(e) };
  }
});
console.log('subclass construct:', JSON.stringify(r2));
await b.close();
