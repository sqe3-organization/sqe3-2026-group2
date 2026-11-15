import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    reporters: ['verbose'],
    include: ['tests/**/*.test.ts'],
  },
});
