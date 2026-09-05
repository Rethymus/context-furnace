// TEST_MATRIX §3：tutorial.spec —— 固定文本、五步引导、二次跳过（D8/D35）。
import { expect, test } from '@playwright/test';
import { T, powerOn } from './helpers';

test.describe('tutorial', () => {
  test('first visit shows tutorial with frozen text, then Cycle 01', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    const hint = page.locator(T('tutorial-hint'));
    await expect(hint).toBeVisible();
    // §11 固定教学文本（zh 或 en 依 locale）
    const feed = page.locator(T('feed'));
    await expect(feed).toContainText(/高温处理后的金属片|A heated metal plate/);
    // Step 1 提示
    await expect(hint).toContainText(/移动左裁刀|Move the left cutter/);
    // D35：不锁输入——任意时刻 IGNITE 可点
    await page.locator(T('ignite')).click();
    await page.waitForTimeout(400);
    await expect(page.locator(T('cycle-display'))).toContainText(/01/);
  });

  test('second boot skips tutorial (cf.tutorialSeen)', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    await page.locator(T('ignite')).click(); // 完成教学 → 置 seen
    await page.waitForTimeout(300);
    await page.reload();
    await page.locator(T('power-on')).click();
    await page.waitForTimeout(1500);
    // 直接进入周期界面，无教学提示
    await expect(page.locator(T('cycle-display'))).toBeVisible();
    await expect(page.locator(T('tutorial-hint'))).toHaveCount(0);
  });
});
