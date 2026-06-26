import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'out', 'dist'],
  },
});
