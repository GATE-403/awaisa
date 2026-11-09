import type { Theme } from '@/common/utils/theme'

// Bishkek: the default view before any business or location is known.
const DEFAULT_CENTER = { latitude: 42.8746, longitude: 74.5698 }
const DEFAULT_ZOOM = 12

// OpenStreetMap tiles need no key but are meant for light use; production sets a keyed provider
// (2GIS, MapTiler, Stadia…) through NEXT_PUBLIC_MAP_TILES_URL and NEXT_PUBLIC_MAP_ATTRIBUTION.
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILES_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const TILE_OPTIONS = { attribution: TILE_ATTRIBUTION, maxZoom: 19 }

const isDarkTheme = (theme: Theme) =>
  theme === 'dark' ||
  (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

export { DEFAULT_CENTER, DEFAULT_ZOOM, isDarkTheme, TILE_OPTIONS, TILE_URL }
