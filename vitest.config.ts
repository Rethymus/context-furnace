import { defineConfig } from 'vitest/config';

// 单测只收 tests/；e2e/*.spec.ts 属于 Playwright（TEST_MATRIX §5 各自独立执行）。
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
