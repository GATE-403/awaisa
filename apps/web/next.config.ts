import path from 'node:path'
import type { NextConfig } from 'next'
import { API_URL, CLIENT_API_PREFIX } from './src/shared/config/api'

const nextConfig: NextConfig = {
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
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
}

export default nextConfig
