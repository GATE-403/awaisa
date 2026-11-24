import { loadRegionFile } from '@awaisa/region/node'
import { defineConfig } from 'vitest/config'

// What next.config.ts inlines in the app: the repository's example region, unless REGION_FILE says.
const region = loadRegionFile({
  file: process.env.REGION_FILE,
  from: import.meta.dirname,
  allowExample: true,
}).region

// Unit tests of pure logic next to it (`<slice>/tests/*.test.ts`); the browser journeys are
// Playwright's (`e2e/`).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    env: { NEXT_PUBLIC_REGION: JSON.stringify(region) },
  },
})
