import path from 'node:path'
import type { NextConfig } from 'next'
import { API_URL, CLIENT_API_PREFIX } from './src/config/api'

const nextConfig: NextConfig = {
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
