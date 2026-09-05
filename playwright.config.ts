import { defineConfig, devices } from '@playwright/test';

// D19: functional e2e on Chromium/Firefox/WebKit desktop; mobile emulation on
// Chromium + WebKit. Visual baselines are Chromium-only (D28/D19).
// CHROMIUM_CHANNEL (e.g. "chrome") lets a machine with a broken CDN use the
// system Chromium build instead of the bundled one.
const chromiumChannel = process.env.CHROMIUM_CHANNEL
  ? { channel: process.env.CHROMIUM_CHANNEL }
  : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
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
      use: { ...devices['Desktop Webkit'], viewport: { width: 1440, height: 900 } },
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
