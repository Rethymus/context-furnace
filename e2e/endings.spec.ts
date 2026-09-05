// TEST_MATRIX §3：endings.spec —— 五结局全触发（A/B/C/D/E）。
import { expect, test } from '@playwright/test';
import { PATH_B_GAIN, PATH_C_GAIN, T, nextInput, playRound, powerOn, skipTutorial } from './helpers';

test.describe('endings', () => {
  // §2.1 Path A：全选 + gain 0 → Cycle 11 COLD END
  test('A: cold end when heat runs out', async ({ page }) => {
    test.setTimeout(120_000);
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    for (let cycle = 1; cycle <= 11; cycle++) {
      await playRound(page, { gain: 0 });
      const ending = page.locator(T('ending-banner'));
      if (await ending.isVisible().catch(() => false)) {
        await expect(ending).toContainText(/设备停机|Equipment offline/);
        return;
      }
      await nextInput(page);
    }
    throw new Error('COLD END not reached by cycle 11');
  });

  // §2.3 Path C：仅保 CORE → Cycle 04 SIGNAL LOST
  test('B: signal lost under maximum distortion', async ({ page }) => {
    test.setTimeout(120_000);
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    for (let cycle = 1; cycle <= 4; cycle++) {
      const totals = [7, 6, 7, 6];
      const cores = [2, 3, 4, 2];
      const coreIdx = cores[cycle - 1]!;
      const total = totals[cycle - 1]!;
      // CORE-only：左裁刀右移 coreIdx 格，右裁刀左移到 coreIdx+1
      const left = page.locator('[data-cutter="left"]');
      await left.focus();
      for (let i = 0; i < coreIdx; i++) await page.keyboard.press('ArrowRight');
      const right = page.locator('[data-cutter="right"]');
      await right.focus();
      for (let i = 0; i < total - coreIdx - 1; i++) await page.keyboard.press('ArrowLeft');
      await playRound(page, { gain: 0 });
      const ending = page.locator(T('ending-banner'));
      if (await ending.isVisible().catch(() => false)) {
        await expect(ending).toContainText(/信号失真|Signal lost/);
        return;
      }
      if (cycle < 4) await nextInput(page);
    }
    throw new Error('SIGNAL LOST not reached by cycle 4');
  });

  // §2.2 Path B：切 s0 + 阶梯增益 → Cycle 12 完成 → D
  test('D: peak efficiency at cycle 12', async ({ page }) => {
    test.setTimeout(180_000);
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    for (let cycle = 1; cycle <= 12; cycle++) {
      await playRound(page, { gain: PATH_B_GAIN(cycle), leftMoves: 1 });
      const ending = page.locator(T('ending-banner'));
      if (cycle >= 12 || (await ending.isVisible().catch(() => false))) {
        await expect(ending).toContainText(/效率标兵|Peak efficiency/);
        return;
      }
      await nextInput(page);
    }
  });

  // §2.4 Ending C 脚本：全选 + C05 起 gain 1 → STABLE RUN
  test('C: stable run with balanced gains', async ({ page }) => {
    test.setTimeout(180_000);
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    for (let cycle = 1; cycle <= 12; cycle++) {
      await playRound(page, { gain: PATH_C_GAIN(cycle) });
      const ending = page.locator(T('ending-banner'));
      if (cycle >= 12 || (await ending.isVisible().catch(() => false))) {
        await expect(ending).toContainText(/稳态运行|Stable run/);
        return;
      }
      await nextInput(page);
    }
  });

  // §2.5 Ending E：Cycle 09 拔插头（无提示元素）
  test('E: hidden plug ending from cycle 9', async ({ page }) => {
    test.setTimeout(180_000);
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    // 走到 Cycle 09（Path B 脚本存活）
    for (let cycle = 1; cycle <= 8; cycle++) {
      await playRound(page, { gain: PATH_B_GAIN(cycle), leftMoves: 1 });
      await nextInput(page);
    }
    // C09 前不出现插头（C08 时已隐藏）
    // C09 出现且无任何提示
    const plug = page.locator(T('plug'));
    await expect(plug).toBeVisible();
    expect(await plug.getAttribute('title')).toBe(null);
    await plug.click();
    const ending = page.locator(T('ending-banner'));
    await expect(ending).toContainText(/设备已停止工作|Equipment offline/);
    // E 无正文：横幅内无 <p>
    expect(await ending.locator('p').count()).toBe(0);
  });
});
