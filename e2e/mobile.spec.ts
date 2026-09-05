// TEST_MATRIX §3：mobile.spec —— 390×844 与 360×740（移动 projects）。
import { expect, test } from '@playwright/test';
import { T, playRound, powerOn, skipTutorial } from './helpers';

test.describe('mobile', () => {
  test('no horizontal scroll and controls usable', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    await page.waitForTimeout(400);

    // §92：绝对禁止水平滚动
    const scrollWidth = await page.evaluate(
      () => document.scrollingElement?.scrollWidth ?? 0,
    );
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

    // GAIN 卡位可直选（§93：44×44）
    const stop = page.locator('.gain-stop[data-value="0"]');
    const box = await stop.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(40);

    // IGNITE 始终可达（§125）
    await expect(page.locator(T('ignite'))).toBeVisible();
    await playRound(page, { gain: 0 });
    await expect(page.locator(T('next'))).toBeVisible();

    // Settings 不越界
    await page.locator(T('settings-btn')).click();
    const dialog = page.locator(T('settings-dialog'));
    const dbox = await dialog.boundingBox();
    expect(dbox).not.toBeNull();
    expect(dbox!.x).toBeGreaterThanOrEqual(0);
    expect(dbox!.x + dbox!.width).toBeLessThanOrEqual(innerWidth + 1);
  });
});

// §3.2：settings-mobile 基线（仅 Chromium；D27/D28/D29）
test.describe('visual baselines (mobile, chromium only)', () => {
  test('settings-mobile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'baselines are mobile-chromium only (D19)');
    await page.addInitScript(() => {
      localStorage.setItem('cf.locale', 'zh-CN');
      localStorage.setItem('cf.tutorialSeen', '1');
    });
    await page.goto('/?freeze=1');
    await page.locator(T('power-on')).click();
    await page.waitForTimeout(1500);
    await page.locator(T('settings-btn')).click();
    await page.waitForTimeout(400);
    await expect(page.locator(T('settings-dialog'))).toHaveScreenshot('settings-mobile.png');
  });
});
