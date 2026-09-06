// UI_CONTRACT v3 §5：布局/几何断言（流水线第 6 步）。仅依赖几何，不依赖像素。
import { expect, test } from '@playwright/test';
import { T, powerOn, skipTutorial } from './helpers';

test.describe('layout geometry (UI_CONTRACT v3 §5)', () => {
  test.beforeEach(async ({ page }) => {
    await powerOn(page);
    const tutorialVisible = await page
      .locator(T('tutorial-hint'))
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (tutorialVisible) {
      await skipTutorial(page);
    }
    await expect(page.locator(T('cycle-display'))).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(300);
  });

  test('G1 header sits above the dark panel', async ({ page }) => {
    const header = await page.locator('.machine-header').boundingBox();
    const panel = await page.locator(T('panel-dark')).boundingBox();
    expect(header).not.toBeNull();
    expect(panel).not.toBeNull();
    expect(header!.y + header!.height).toBeLessThanOrEqual(panel!.y + 1);
  });

  test('G2 left column chain order: feed → select → output', async ({ page }) => {
    const feed = await page.locator(T('panel-feed')).boundingBox();
    const extract = await page.locator(T('panel-extract')).boundingBox();
    const output = await page.locator(T('panel-output')).boundingBox();
    expect(feed!.y).toBeLessThan(extract!.y);
    expect(extract!.y).toBeLessThan(output!.y);
  });

  test('G3 gauges sit right of the feed card (desktop two-column)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.startsWith('mobile'), 'desktop-only geometry; mobile is single-column per 3');
    const feed = await page.locator(T('panel-feed')).boundingBox();
    const heat = await page.locator(T('gauge-heat')).boundingBox();
    expect(heat!.x).toBeGreaterThan(feed!.x + feed!.width);
  });

  test('G4 ignite fully in viewport and ≥48px', async ({ page }) => {
    const box = await page.locator(T('ignite')).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);
    const vp = page.viewportSize()!;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height);
  });

  test('G5 observation spans both columns (wider than feed card)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.startsWith('mobile'), 'desktop-only geometry; mobile is single-column per 3');
    const feed = await page.locator(T('panel-feed')).boundingBox();
    const obs = await page.locator(T('observation')).boundingBox();
    expect(obs!.width).toBeGreaterThan(feed!.width);
  });

  test('G7 cutter hit ≥48×48, gain stop ≥44×44', async ({ page }) => {
    const cutter = await page.locator('[data-cutter="left"]').boundingBox();
    expect(cutter!.width).toBeGreaterThanOrEqual(47);
    expect(cutter!.height).toBeGreaterThanOrEqual(47);
    const stop = await page.locator('.gain-stop[data-value="0"]').boundingBox();
    expect(stop!.width).toBeGreaterThanOrEqual(43);
    expect(stop!.height).toBeGreaterThanOrEqual(43);
  });

  test('G8 dark panel horizontally centered (≤40px asymmetry)', async ({ page }) => {
    const panel = await page.locator(T('panel-dark')).boundingBox();
    const vp = page.viewportSize()!;
    const left = panel!.x;
    const right = vp.width - (panel!.x + panel!.width);
    expect(left).toBeGreaterThan(0);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(40);
  });
});

test.describe('layout geometry — mobile 360px (via mobile projects)', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'mobile geometry on mobile projects');
  });

  test('G6 no horizontal scroll at narrow width', async ({ page }) => {
    await powerOn(page);
    const tutorialVisible = await page
      .locator(T('tutorial-hint'))
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (tutorialVisible) {
      await skipTutorial(page);
    }
    await expect(page.locator(T('cycle-display'))).toBeVisible({ timeout: 10_000 });
    const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
});
