import path from 'node:path'
import { loadRegionFile } from '@awaisa/region/node'
import { linguiMacroSwcPlugin } from '@lingui/swc-plugin/options'
import type { NextConfig } from 'next'
import { API_URL, CLIENT_API_PREFIX } from './src/shared/config/api'
import { EMOJI_DATA_URL, EMOJIBASE_VERSION } from './src/shared/ui/EmojiPicker/config'

// The installation's country and city (region.json above this folder, or REGION_FILE), inlined
// into the bundle: the code knows no country of its own. Without one the repository's
// region.example.json is used, with a warning (the API refuses to start in production then).
const installationRegion = loadRegionFile({
  file: process.env.REGION_FILE,
  from: import.meta.dirname,
  allowExample: true,
})
if (installationRegion.isExample && process.env.NODE_ENV === 'production') {
  console.warn(`No region.json: building with ${installationRegion.file}`)
}

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_REGION: JSON.stringify(installationRegion.region) },
  // E2E builds into its own folder so `next build` never touches a running `next dev`'s files.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Links from before the platform (bookmarks, old SMS) pointed at the single salon.
  redirects: async () => [
    { source: '/book', destination: '/awaisa-studio/book', permanent: false },
    { source: '/services', destination: '/awaisa-studio/services', permanent: false },
    { source: '/admin', destination: '/manage', permanent: false },
    // Profile and bookings are one page now.
    { source: '/profile', destination: '/bookings', permanent: false },
  ],
  // The push worker is always fetched fresh, so a fix to it reaches every device at once.
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
  ],
  rewrites: async () => [
    { source: `${CLIENT_API_PREFIX}/:path*`, destination: `${API_URL}/:path*` },
    // The emoji picker's data through our origin (`shared/ui/EmojiPicker/config.ts`).
    {
      source: `${EMOJI_DATA_URL}/:path*`,
      destination: `https://cdn.jsdelivr.net/npm/emojibase-data@${EMOJIBASE_VERSION}/:path*`,
    },
  ],
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  // The story picture reads Inter from disk (images get no web fonts): ship it with the route.
  outputFileTracingIncludes: { '/u/[id]/story': ['./assets/fonts/**'] },
  poweredByHeader: false,
  // The build checks the app, not its tests: some tests import the API's source to compare both
  // sides, and the Docker image of the web (turbo prune web) has no apps/api. `pnpm typecheck`
  // still checks everything with tsconfig.json.
  typescript: { tsconfigPath: 'tsconfig.build.json' },
  transpilePackages: ['@awaisa/ui', '@awaisa/tokens', '@awaisa/contracts', '@awaisa/region'],
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],
  experimental: {
    // Lingui's macros (`t`, `Trans`, `Plural`) are compiled to message ids at build time.
    swcPlugins: [linguiMacroSwcPlugin()],
    agentFeedback: true,
    // Icons and the UI kit are imported per name: only those modules are compiled and shipped
    // (faster dev starts on a phone, smaller bundles).
    optimizePackageImports: ['@phosphor-icons/react', '@base-ui/react'],
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
}

export default nextConfig
