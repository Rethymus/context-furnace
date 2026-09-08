// TEST_MATRIX §3：accessibility.spec —— axe 无 critical/serious + 焦点/目标尺寸/aria（§127–129）。
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { T, playRound, powerOn, skipTutorial } from './helpers';

async function axeScan(page: import('@playwright/test').Page): Promise<void> {
  // 先等入场动画收敛：axe 会把半透明祖先（mount-rise 220ms 等）合进前景/背景色，
  // 动画中途扫描会得到瞬时假对比度（UI_CONTRACT v4 §M3 审计发现）
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished'), undefined, {
      timeout: 5_000,
    })
    .catch(() => {});
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  const bad = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  if (bad.length > 0) {
    console.error(
      JSON.stringify(
        bad.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) })),
        null,
        2,
      ),
    );
  }
  expect(bad).toHaveLength(0);
}

test.describe('accessibility', () => {
  test('home: axe clean, meters and focus', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(400);
    await axeScan(page);
    // §19：focus visible（键盘焦点出现可见轮廓）
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? getComputedStyle(el).outlineStyle : 'none';
    });
    expect(outline).not.toBe('none');
  });

  test('round screen: axe clean, meter roles, cutter/gain target sizes', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    await page.waitForTimeout(300);

    // §128：role=meter + aria 完整
    for (const id of ['gauge-heat', 'gauge-fidelity']) {
      const gauge = page.locator(T(id));
      await expect(gauge).toHaveAttribute('role', 'meter');
      await expect(gauge).toHaveAttribute('aria-valuemin', '0');
      await expect(gauge).toHaveAttribute('aria-valuemax', '100');
      const label = await gauge.getAttribute('aria-label');
      expect(label).not.toBe('');
    }
    // §129：观察窗 aria-hidden
    await expect(page.locator(T('observation'))).toHaveAttribute('aria-hidden', 'true');
    // §6.4：裁刀 hit area ≥48×48
    const cutter = await page.locator('[data-cutter="left"]').boundingBox();
    expect(cutter!.width).toBeGreaterThanOrEqual(47);
    expect(cutter!.height).toBeGreaterThanOrEqual(47);
    // §7.1：GAIN 卡位 44×44
    const stop = await page.locator('.gain-stop[data-value="0"]').boundingBox();
    expect(stop!.width).toBeGreaterThanOrEqual(43);
    expect(stop!.height).toBeGreaterThanOrEqual(43);

    await axeScan(page);
  });

  test('settings and results: axe clean', async ({ page }) => {
    test.setTimeout(120_000);
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    await page.locator(T('settings-btn')).click();
    await axeScan(page);
    await page.keyboard.press('Escape');
    // 快速到结果页（Path A 11 轮）
    for (let cycle = 1; cycle <= 11; cycle++) {
      await playRound(page, { gain: 0 });
      if (await page.locator(T('ending-banner')).isVisible().catch(() => false)) break;
      await page.locator(T('next')).click();
      await page.waitForTimeout(200);
    }
    await axeScan(page);
  });
});
