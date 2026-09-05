// TEST_MATRIX §3：keyboard.spec —— 纯键盘完成首页→Cycle 02+（§126；D3 Escape）。
import { expect, test } from '@playwright/test';
import { T, powerOn } from './helpers';

test.describe('keyboard', () => {
  test('complete rounds with keyboard only', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    // 教学内：焦点移至 IGNITE 后 Enter（D35，全程键盘）
    await page.locator(T('ignite')).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    await expect(page.locator(T('cycle-display'))).toBeVisible();

    // 两个周期：裁刀 ←→ 移动 → Tab 至 IGNITE → Enter → NEXT
    for (let round = 0; round < 2; round++) {
      const left = page.locator('[data-cutter="left"]');
      await left.focus();
      await page.keyboard.press('ArrowRight'); // 切除 s0
      const right = page.locator('[data-cutter="right"]');
      await right.focus();
      await page.keyboard.press('ArrowLeft'); // 收右侧（保持含 CORE）
      await page.locator(T('ignite')).focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1150);
      await page.locator(T('next')).focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }
    await expect(page.locator(T('cycle-display'))).toContainText(/03/);
  });

  test('Escape closes settings (D3)', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    await page.locator(T('settings-btn')).click();
    await expect(page.locator(T('settings-dialog'))).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator(T('settings-dialog'))).toHaveCount(0);
  });

  test('cutters respond to ArrowLeft/ArrowRight by one segment', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    await page.locator(T('ignite')).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    const left = page.locator('[data-cutter="left"]');
    await left.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.feed-seg.dim')).toHaveCount(1);
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.feed-seg.dim')).toHaveCount(0);
  });
});
