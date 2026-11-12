import { systemColors } from '@awaisa/tokens'

// Same hash and order as pickTint (entities/business BusinessTile), resolved to hex because
// ImageResponse cannot read CSS variables; keep both in sync so the shared card matches the tile.
const TINTS = [
  systemColors.light.blue,
  systemColors.light.indigo,
  systemColors.light.purple,
  systemColors.light.pink,
  systemColors.light.orange,
  systemColors.light.green,
  systemColors.light.teal,
]

const pickTintHex = (name: string) => {
  const hash = [...name].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7)
  return TINTS[hash % TINTS.length] ?? systemColors.light.blue
}

const toRgb = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

// color-mix(in srgb, a weight%, b) for the tile gradient, which satori does not support.
const mixHex = (a: string, b: string, weight: number) => {
  const left = toRgb(a)
  const right = toRgb(b)
  const mixed = left.map((channel, index) =>
    Math.round(channel * weight + (right[index] ?? 0) * (1 - weight)),
  )

  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

export { getInitials, mixHex, pickTintHex }
