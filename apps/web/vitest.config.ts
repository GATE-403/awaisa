import { loadRegionFile } from '@awaisa/region/node'
import { transformAsync } from '@babel/core'
import { defineConfig } from 'vitest/config'

// What next.config.ts inlines in the app: the repository's example region, unless REGION_FILE says.
const region = loadRegionFile({
  file: process.env.REGION_FILE,
  from: import.meta.dirname,
  allowExample: true,
}).region

// Next compiles Lingui's macros (`msg`, `t`, `plural`) with its SWC plugin; Vitest has no SWC, so
// the same macros go through Lingui's Babel plugin here, for the files that import them.
const linguiMacros = () => ({
  name: 'lingui-macros',
  enforce: 'pre' as const,
  transform: async (code: string, id: string) => {
    if (!/\.[jt]sx?$/.test(id) || id.includes('node_modules') || !code.includes('/macro')) return
    const result = await transformAsync(code, {
      filename: id,
      babelrc: false,
      configFile: false,
      sourceMaps: true,
      parserOpts: { plugins: ['typescript', 'jsx'] },
      plugins: ['@lingui/babel-plugin-lingui-macro'],
    })
    return result?.code ? { code: result.code, map: result.map } : undefined
  },
})

// Unit tests of pure logic next to it (`<slice>/tests/*.test.ts`); the browser journeys are
// Playwright's (`e2e/`).
export default defineConfig({
  plugins: [linguiMacros()],
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    env: { NEXT_PUBLIC_REGION: JSON.stringify(region) },
  },
})
