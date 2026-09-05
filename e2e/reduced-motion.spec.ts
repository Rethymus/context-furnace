// TEST_MATRIX §3：reduced-motion.spec —— RM 下无扫描/震动/群体位移，状态仍明确（§131/D25/D26）。
import { expect, test } from '@playwright/test';
import { T, playRound, powerOn, skipTutorial } from './helpers';

test.use({ reducedMotion: 'reduce' });

test.describe('reduced motion', () => {
  test('flame does not flicker; states remain explicit', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    await playRound(page, { gain: 0 });
    const animation = await page
      .locator('[data-testid="furnace-glow"]')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animation === 'none' || animation === '').toBeTruthy();
    // 数值仍明确
    await expect(page.locator(`${T('gauge-heat')} .gauge-value`)).not.toHaveText('0');
    await expect(page.locator(T('next'))).toBeVisible();
  });

  test('observation window stays aria-hidden and static under RM', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    const obs = page.locator(T('observation'));
    await expect(obs).toHaveAttribute('aria-hidden', 'true');
    const count = await obs.locator('.glyph').count();
    expect(count).toBe(18); // §10.1 / §10.6
    // RM 下位置不随时间变化（无 rAF 群体位移）
    const p1 = await obs.locator('.glyph').first().evaluate((el) => el.style.transform);
    await page.waitForTimeout(800);
    const p2 = await obs.locator('.glyph').first().evaluate((el) => el.style.transform);
    expect(p2).toBe(p1);
  });
});
