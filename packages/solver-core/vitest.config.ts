import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '../index.js': path.resolve(__dirname, './dist/index.js'),
      '../types.js': path.resolve(__dirname, './dist/types.js'),
    },
  },
});