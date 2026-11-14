import type { CSSProperties } from 'react'
import styles from './BusinessTile.module.css'

interface BusinessTileProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  /** The owner's logo: shown in the same circle instead of the monogram. */
  logoUrl?: string | null
}

const TINTS = [
  'var(--system-blue)',
  'var(--system-indigo)',
  'var(--system-purple)',
  'var(--system-pink)',
  'var(--system-orange)',
  'var(--system-green)',
  'var(--system-teal)',
]

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

// The same name always gets the same colour, so a business is recognisable at a glance.
export const pickTint = (name: string) => {
  const hash = [...name].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7)
  return TINTS[hash % TINTS.length] ?? TINTS[0]
}

/** Avatar monogram colours from a name: people get the same vivid tints as app-icon tiles. */
export const monogramTint = (name: string) => {
  const tint = pickTint(name)
  return {
    '--system-monogram-from': `color-mix(in srgb, ${tint} 72%, white)`,
    '--system-monogram-to': `color-mix(in srgb, ${tint} 88%, black)`,
  } as CSSProperties
}

export const BusinessTile = ({ name, size = 'md', className, logoUrl }: BusinessTileProps) => (
  <span
    className={className ? `${styles.tile} ${className}` : styles.tile}
    data-size={size}
    data-logo={logoUrl ? '' : undefined}
    style={{ '--tint': pickTint(name) } as CSSProperties}
    aria-hidden='true'
  >
    {logoUrl ? (
      // biome-ignore lint/performance/noImgElement: a 512² WebP from our API, shown small
      <img src={logoUrl} alt='' className={styles.logo} loading='lazy' decoding='async' />
    ) : (
      getInitials(name)
    )}
  </span>
)
