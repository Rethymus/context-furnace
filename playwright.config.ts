import { defineConfig, devices } from '@playwright/test';

// D19: functional e2e on Chromium/Firefox/WebKit desktop; mobile emulation on
// Chromium + WebKit. Visual baselines are Chromium-only (D28/D19).
// CHROMIUM_CHANNEL (e.g. "chrome") lets a machine with a broken CDN use the
// system Chromium build instead of the bundled one.
const chromiumChannel = process.env.CHROMIUM_CHANNEL
  ? { channel: process.env.CHROMIUM_CHANNEL }
  : {};

// E2E_PORT isolates concurrent local runs on one machine: two sessions sharing
// the fixed 4173 keep killing each other's webServer (reuseExistingServer
// latches onto a foreign server, then loses it mid-run → 2026-09-08 integration
// session: three full-verify attempts died this way with zero assertion
// failures). Default stays 4173; CI is unaffected.
const e2ePort = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !process.env.CI,
  // 本地 retries 对齐 CI=1：WebKit/Windows 对计时器饥饿零容忍，四次全量 verify
  // 各倒一个不同的 webkit 测试（ignite 不稳定 / waitForTimeout 超预算 /
  // cycle-display 未现 ×2），隔离复跑与 CI 均绿——资源饥饿非产品回归
  // （2026-09-13 取证）。本地 0 重试比 CI 更严，属配置不对称而非质量门。
  retries: 1,
  // 本地限 4：12 逻辑核机全开（undefined → 8+ workers）加剧上饥饿。
  // CI 保持 2。
  workers: process.env.CI ? 2 : 4,
  reporter: 'list',
  timeout: 90_000, // WebKit/慢机余量（长流程单测另行加码）
  use: {
    baseURL: `http://localhost:${e2ePort}`,
    // Local runs disable traces: with retain-on-failure the post-pass trace
    // cleanup races browserContext.close's trace flush under parallel load,
    // failing passed tests with ENOENT (reproduced 2026-09-08: repeat-each=6
    // workers=6 → 4 failed, all browserContext.close ENOENT, zero pixel
    // diffs). CI keeps retain-on-failure (retries: 1 records failure traces).
    trace: process.env.CI ? 'retain-on-failure' : 'off',
  },
  webServer: {
    command: `npm run preview -- --port ${e2ePort} --strictPort`,
    url: `http://localhost:${e2ePort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, ...chromiumChannel },
    },
    {
      name: 'desktop-firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'desktop-webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], ...chromiumChannel },
    },
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 14'] },
    },
  ],
});
