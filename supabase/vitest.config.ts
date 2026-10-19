import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['functions/**/*.ts'],
      exclude: ['functions/**/index.ts', 'functions/**/*.d.ts'],
    },
  },
});
