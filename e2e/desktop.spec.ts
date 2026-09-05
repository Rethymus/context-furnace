// TEST_MATRIX §3：desktop.spec —— 1440×900 全流程（Path B 脚本）、解锁提示、锁定、FEED 高亮、复制（D14/D16）。
import { expect, test } from '@playwright/test';
import { PATH_B_GAIN, T, nextInput, playRound, powerOn, skipTutorial } from './helpers';

test.describe('desktop full run', () => {
  test('home → boot → tutorial → 12 cycles → Peak efficiency ending → results', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);

    // C05：GAIN 1 解锁提示出现（§27，载入时显示 1.2s）
    let sawToast = false;
    for (let cycle = 1; cycle <= 12; cycle++) {
      if (cycle === 5) {
        // 提示随 Cycle 05 载入出现；用 expect 自动等待消除计时抖动
        await expect(page.locator(T('gain-unlock-toast'))).toBeVisible({ timeout: 2000 });
        sawToast = true;
      }
      await playRound(page, { gain: PATH_B_GAIN(cycle), leftMoves: 1 });
      const ending = page.locator(T('ending-banner'));
      if (await ending.isVisible().catch(() => false)) break;
      if (cycle < 12) await nextInput(page);
    }
    expect(sawToast).toBeTruthy();

    // Path B 终局：heat 66、fidelity 14 → D 效率标兵
    const banner = page.locator(T('ending-banner'));
    await expect(banner).toContainText(/效率标兵|Peak efficiency/);
    await expect(banner).toContainText(/本周期燃烧效率创下新高|This cycle set a new combustion record/);

    // §14.1：结果页五项
    const results = page.locator(T('results'));
    await expect(results).toContainText(/最高炉温|Peak heat/);
    await expect(results).toContainText(/最终保真度|Final fidelity/);
    await expect(results).toContainText(/平均切除比例|Average cut/);
    await expect(results).toContainText(/最高增益|Highest gain used/);
    await expect(results).toContainText(/设备状态|Machine status/);
    await expect(results).toContainText('66');
    await expect(results).toContainText('14');

    // §84：不显示分数/星级/排名
    const gamified = await results.getByText(/\b(score|stars?|rank)\b|排名|星级|分数/i).count();
    expect(gamified).toBe(0);

    // D16：复制反馈
    await page.locator(T('copy')).click();
    await expect(page.locator(T('copied'))).toBeVisible();
    await expect(page.locator(T('copied'))).toBeHidden({ timeout: 2500 });

    // D33：重新运行回到首页
    await page.locator(T('restart')).click();
    await expect(page.locator(T('power-on'))).toBeVisible();
  });

  test('FEED highlight tracks the selection (D14)', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    // 全选：所有段 lit；左裁刀右移一格后首段 dim
    await expect(page.locator('.feed-seg.lit')).toHaveCount(7);
    const left = page.locator('[data-cutter="left"]');
    await left.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.feed-seg.lit')).toHaveCount(6);
    await expect(page.locator('.feed-seg.dim')).toHaveCount(1);
    await page.locator(T('reset')).click(); // D9：复原
    await expect(page.locator('.feed-seg.lit')).toHaveCount(7);
  });

  test('IGNITE locks the round (§8.2)', async ({ page }) => {
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    await page.locator(T('ignite')).click();
    // ROUND_BURNING 期间控件锁定
    await expect(page.locator(T('ignite'))).toBeDisabled();
    await expect(page.locator('[data-cutter="left"]')).toBeDisabled();
    // 反馈动画后出现 NEXT（若本轮无终局）
    await page.waitForTimeout(1150);
    await expect(page.locator(T('next'))).toBeVisible();
    // 机器消息出现（§12）
    await expect(page.locator(T('status'))).not.toBeEmpty();
  });
});
