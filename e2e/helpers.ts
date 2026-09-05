// e2e 共享助手：真实流程走查（PRESENTATION_SPEC §19：不使用任何状态强制参数）。
import type { Page } from '@playwright/test';

export const T = (id: string): string => `[data-testid="${id}"]`;

export async function powerOn(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator(T('power-on')).click();
}

// 教学页直接 IGNITE（D35：任意时刻可点）
export async function skipTutorial(page: Page): Promise<void> {
  await page.locator(T('ignite')).click();
  await page.waitForTimeout(300);
}

// 走一轮：可选增益档 → IGNITE → 等反馈动画 → 回到可交互
export async function playRound(
  page: Page,
  opts: { gain?: number; leftMoves?: number; rightMoves?: number } = {},
): Promise<void> {
  if (opts.leftMoves) {
    const left = page.locator('[data-cutter="left"]');
    await left.focus();
    for (let i = 0; i < opts.leftMoves; i++) await page.keyboard.press('ArrowRight');
  }
  if (opts.rightMoves) {
    const right = page.locator('[data-cutter="right"]');
    await right.focus();
    for (let i = 0; i < opts.rightMoves; i++) await page.keyboard.press('ArrowLeft');
  }
  if (opts.gain && opts.gain > 0) {
    await page.locator(`.gain-stop[data-value="${opts.gain}"]`).click();
  }
  await page.locator(T('ignite')).click();
  await page.waitForTimeout(1150); // §8.3 950ms 反馈 + 余量
}

export async function nextInput(page: Page): Promise<void> {
  await page.locator(T('next')).click();
  await page.waitForTimeout(250);
}

export interface WalkOpts {
  gainFor: (cycle: number) => number;
  cutFirst?: boolean; // 每轮切除 s0（D2 Path B 脚本）
  untilCycle?: number; // 到达该周期后停止（含）
}

// 按 D2/§2.4 脚本连续走查
export async function walk(page: Page, opts: WalkOpts): Promise<number> {
  let cyclesPlayed = 0;
  for (let cycle = 1; cycle <= (opts.untilCycle ?? 12); cycle++) {
    if (await page.locator(T('ending-banner')).isVisible().catch(() => false)) break;
    await playRound(page, {
      gain: opts.gainFor(cycle),
      leftMoves: opts.cutFirst ? 1 : 0,
    });
    cyclesPlayed = cycle;
    const endingVisible = await page.locator(T('ending-banner')).isVisible().catch(() => false);
    if (endingVisible) break;
    if (cycle < (opts.untilCycle ?? 12)) {
      await nextInput(page);
    } else if (!endingVisible) {
      // Cycle 12 无终局时仍需 next 才显示结局
      const nextVisible = await page.locator(T('next')).isVisible().catch(() => false);
      if (nextVisible) {
        await nextInput(page);
      }
    }
  }
  return cyclesPlayed;
}

export const PATH_B_GAIN = (cycle: number): number => (cycle <= 4 ? 0 : cycle <= 6 ? 1 : 2);
export const PATH_C_GAIN = (cycle: number): number => (cycle <= 4 ? 0 : 1);
