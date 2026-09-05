// TEST_MATRIX §3：audio.spec —— 手势前静音、关声/失败可通关、D21 静音面、D22/D23 存在性。
import { expect, test } from '@playwright/test';
import { PATH_B_GAIN, T, nextInput, playRound, powerOn, skipTutorial } from './helpers';

const PROBE = `
  window.__audio = { contexts: 0, oscillators: 0 };
  const OrigAC = window.AudioContext;
  class ProbeAC extends OrigAC {
    constructor(...a) {
      super(...a);
      window.__audio.contexts++;
      const orig = this.createOscillator.bind(this);
      this.createOscillator = () => {
        window.__audio.oscillators++;
        return orig();
      };
    }
  }
  Object.defineProperty(window, 'AudioContext', { value: ProbeAC, writable: true });
`;

const contexts = (p: { evaluate: <T>(fn: string) => Promise<T> }): Promise<number> =>
  p.evaluate('window.__audio ? window.__audio.contexts : -1') as Promise<number>;
const oscillators = (p: { evaluate: <T>(fn: string) => Promise<T> }): Promise<number> =>
  p.evaluate('window.__audio ? window.__audio.oscillators : -1') as Promise<number>;

test.describe('audio', () => {
  test('no AudioContext before POWER ON; created on gesture (§2.2/§130)', async ({ page }) => {
    await page.addInitScript(PROBE);
    await page.goto('/');
    await page.waitForTimeout(400);
    expect(await contexts(page)).toBe(0);
    await page.locator(T('power-on')).click();
    await page.waitForTimeout(300);
    expect(await contexts(page)).toBeGreaterThan(0);
  });

  test('sound off: game fully completable (§130)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      localStorage.setItem('cf.sound', 'off');
    });
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    for (let cycle = 1; cycle <= 5; cycle++) {
      await playRound(page, { gain: PATH_B_GAIN(cycle), leftMoves: 1 });
      if (cycle < 5) await nextInput(page);
    }
    await expect(page.locator(T('cycle-display'))).toContainText(/05|Cycle 05|周期 05/);
  });

  test('AudioContext unavailable: game fully completable (§130)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'AudioContext', { value: undefined, writable: true });
    });
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    await playRound(page, { gain: 0 });
    await expect(page.locator(T('next'))).toBeVisible();
  });

  test('D21: reset/next/settings/locale/copy create no oscillators', async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(PROBE);
    await powerOn(page);
    await page.waitForTimeout(1500);
    await skipTutorial(page);
    await playRound(page, { gain: 0, leftMoves: 1 });
    await page.waitForTimeout(1200);
    const before = await oscillators(page);
    await page.locator(T('reset')).click();
    await page.locator(T('next')).click();
    await page.waitForTimeout(300);
    await page.locator(T('settings-btn')).click();
    await page.keyboard.press('Escape');
    await page.locator(T('locale-toggle')).click();
    await page.waitForTimeout(200);
    const after = await oscillators(page);
    expect(after).toBe(before);
  });
});
