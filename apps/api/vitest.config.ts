import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [],
  test: {
    include: ['src/lib/__tests__/**/*.test.ts', 'src/routes/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['dist/**', 'node_modules/**', '**/*.test.ts'],
    },
  },
});