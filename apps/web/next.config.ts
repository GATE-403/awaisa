import path from 'node:path'
import type { NextConfig } from 'next'
import { API_URL, CLIENT_API_PREFIX } from './src/shared/config/api'

const nextConfig: NextConfig = {
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
  rewrites: async () => [
    { source: `${CLIENT_API_PREFIX}/:path*`, destination: `${API_URL}/:path*` },
  ],
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  poweredByHeader: false,
  transpilePackages: ['@awaisa/ui', '@awaisa/tokens'],
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],
  experimental: {
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
