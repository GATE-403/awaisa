// Presets a client picks for their profile; the web draws them from tokens (no free colours, so
// every profile stays in the app's palette).
const BANNERS = [
  'aurora',
  'sunset',
  'ocean',
  'forest',
  'berry',
  'graphite',
  'sand',
  'night',
] as const

const ACCENTS = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'green', 'teal'] as const

type Banner = (typeof BANNERS)[number]
type Accent = (typeof ACCENTS)[number]

/** Not chosen yet: picked from the id, so a new profile already looks like its own. */
const defaultStyle = (id: string) => {
  const seed = Number.parseInt(id.slice(0, 8), 16) || 0
  return {
    banner: BANNERS[seed % BANNERS.length] as Banner,
    accent: ACCENTS[Math.floor(seed / 8) % ACCENTS.length] as Accent,
  }
}

export type { Accent, Banner }
export { ACCENTS, BANNERS, defaultStyle }
