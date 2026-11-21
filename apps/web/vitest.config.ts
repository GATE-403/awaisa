import { defineConfig } from 'vitest/config'

// Unit tests of pure logic next to it (`<slice>/tests/*.test.ts`); the browser journeys are
// Playwright's (`e2e/`).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
