import { defineConfig } from 'vitest/config';

// Database rules tests (MSP-45). Run with `npm run test:rules`, which starts
// the Firebase emulator on this computer. They never touch the real project.
export default defineConfig({
  test: {
    include: ['rules-tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    fileParallelism: false,
  },
});
