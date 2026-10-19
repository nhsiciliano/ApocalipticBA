import { defineConfig } from 'vitest/config';

/** Contra el stack local (`pnpm db:start` + `pnpm db:reset`). Ver tests/integration/setup.ts. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
