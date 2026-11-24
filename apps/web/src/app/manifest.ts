import type { MetadataRoute } from 'next'
import { PLATFORM } from '@/shared/config/platform'

// Installable from the browser ("Add to Home Screen"): the cabinet then gets pushes on iPhone too.
const manifest = (): MetadataRoute.Manifest => ({
  name: PLATFORM.name,
  short_name: PLATFORM.name,
  description: PLATFORM.tagline,
  lang: 'en',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#f5f5f7',
  theme_color: '#f5f5f7',
  icons: [
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
  ],
})

// biome-ignore lint/style/noDefaultExport: Next reads metadata routes from the default export
export default manifest
