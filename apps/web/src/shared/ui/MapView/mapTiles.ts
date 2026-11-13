import type { Theme } from '@/shared/lib/theme'

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

// Real dark tiles only from a keyed provider (CARTO and MapTiler both want a key now): set
// NEXT_PUBLIC_MAP_TILES_URL_DARK, e.g. MapTiler's
// https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=… — without it the dark theme
// dims the light tiles with a CSS filter (MapView.module.css), slower to pan but keyless.
const DARK_TILE_URL = process.env.NEXT_PUBLIC_MAP_TILES_URL_DARK ?? null

const DARK_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION_DARK ?? TILE_ATTRIBUTION

// Fewer tile loads while zooming or panning: tiles update when the gesture ends, and a small
// buffer around the view is kept.
const TILE_OPTIONS = {
  attribution: TILE_ATTRIBUTION,
  maxZoom: 19,
  updateWhenZooming: false,
  keepBuffer: 2,
}

const DARK_TILE_OPTIONS = { ...TILE_OPTIONS, attribution: DARK_ATTRIBUTION }

const isDarkTheme = (theme: Theme) =>
  theme === 'dark' ||
  (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

export {
  DARK_TILE_OPTIONS,
  DARK_TILE_URL,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  isDarkTheme,
  TILE_OPTIONS,
  TILE_URL,
}
