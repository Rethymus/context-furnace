// TEST_MATRIX §3：locale.spec —— 切换保状态（§121）、<html lang>/<title> 实时（D18）。
import { expect, test } from '@playwright/test';
import { T, playRound, powerOn, skipTutorial } from './helpers';

test.describe('locale', () => {
  test('stored cf.locale wins over navigator (§65)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cf.locale', 'en-US');
      Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN'] });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  });

  test('mid-game zh→en switch preserves cycle/cut/gain/heat/fidelity (§121)', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    // 走 2 轮到 Cycle 03，设置 left=1
    for (let i = 0; i < 2; i++) {
      await playRound(page, { gain: 0 });
      await page.locator(T('next')).click();
      await page.waitForTimeout(250);
    }
    const left = page.locator('[data-cutter="left"]');
    await left.focus();
    await page.keyboard.press('ArrowRight'); // left=1
    // 记录切换前状态
    const before = {
      cycle: await page.locator(T('cycle-display')).textContent(),
      heat: await page.locator(`${T('gauge-heat')} .gauge-value`).textContent(),
      fidelity: await page.locator(`${T('gauge-fidelity')} .gauge-value`).textContent(),
      dimCount: await page.locator('.feed-seg.dim').count(),
    };
    await page.locator(T('locale-toggle')).click();
    await page.waitForTimeout(300);

    // §121：数值保持（文案本地化改变，数字不变）
    const cycleNum = (s: string | null): string => s?.replace(/\D/g, '').slice(0, 2) ?? '';
    expect(cycleNum(await page.locator(T('cycle-display')).textContent())).toBe(cycleNum(before.cycle));
    expect(cycleNum(await page.locator(T('cycle-display')).textContent())).toBe('03');
    expect(await page.locator(`${T('gauge-heat')} .gauge-value`).textContent()).toBe(before.heat);
    expect(await page.locator(`${T('gauge-fidelity')} .gauge-value`).textContent()).toBe(before.fidelity);
    expect(await page.locator('.feed-seg.dim').count()).toBe(before.dimCount);
    // 文字确实变了（Playwright 默认 locale=en-US → 启动为英文，切换后为中文；Cycle 03 = C03）
    await expect(page.locator(T('feed'))).toContainText('技术说明');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page).toHaveTitle('断章取火器');
  });
});
