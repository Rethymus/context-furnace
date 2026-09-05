// TEST_MATRIX §3：offline.spec —— 构建后阻断一切外部请求，完整启动并通关（§132）。
import { expect, test } from '@playwright/test';
import { T, playRound, powerOn, skipTutorial } from './helpers';

test.describe('offline', () => {
  test('runs complete cycles with all external requests aborted', async ({ page }) => {
    // 拦截一切非 localhost 请求
    await page.route(/^(?!http:\/\/localhost)/, (route) => route.abort());
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    for (let cycle = 1; cycle <= 3; cycle++) {
      await playRound(page, { gain: 0 });
      if (cycle < 3) {
        await page.locator(T('next')).click();
        await page.waitForTimeout(200);
      }
    }
    await expect(page.locator(T('cycle-display'))).toContainText(/03/);
  });
});
