import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@shared', replacement: path.resolve(__dirname, 'shared') },
      { find: '@', replacement: path.resolve(__dirname, 'client/src') },
    ],
  },
  test: {
    include: [
      'server/**/__tests__/*.test.ts',
      'server/**/__tests__/*.test.tsx',
      'server/**/__tests__/*.test.mts',
      'server/**/__tests__/*.test.js'
    ],
    environment: 'node',
    globals: true,
  },
});
