// TEST_MATRIX §3：home.spec —— 首页、POWER ON 前、禁词、lang/title。
import { expect, test } from '@playwright/test';
import { T } from './helpers';

test.describe('home', () => {
  test('renders unpowered device with POWER ON as the only primary action', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(T('home-title'))).toBeVisible();
    await expect(page.locator(T('power-on'))).toBeVisible();
    // 原规格 §7：禁止「开始游戏 / Play Game / New Game」
    await expect(page.getByText('开始游戏')).toHaveCount(0);
    await expect(page.getByText('Play Game')).toHaveCount(0);
    await expect(page.getByText('New Game')).toHaveCount(0);
    // 铭文与型号
    await expect(page.locator(T('home-motto'))).toContainText(/本机只负责加工|Processing only/);
    // D34：只有 title/favicon/viewport/lang
    const metas = await page.locator('meta[name="description"], meta[property^="og:"]').count();
    expect(metas).toBe(0);
  });

  test('detection chain sets <html lang> and <title> (§65/D18)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'en'] });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page).toHaveTitle('断章取火器');
  });

  test('en-US fallback when navigator is non-zh', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR'] });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(page).toHaveTitle('Context Furnace');
  });

  test('no AudioContext before POWER ON (§130 / audio spec)', async ({ page }) => {
    await page.addInitScript(`
      window.__audioProbe = { contexts: 0 };
      const Original = window.AudioContext;
      class Probe extends Original {
        constructor(...args) {
          super(...args);
          window.__audioProbe.contexts++;
        }
      }
      Object.defineProperty(window, 'AudioContext', { value: Probe, writable: true });
    `);
    await page.goto('/');
    await page.waitForTimeout(500);
    const count = await page.evaluate(() => (window.__audioProbe as { contexts: number }).contexts);
    expect(count).toBe(0);
  });
});
