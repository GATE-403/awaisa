import type { CSSProperties } from 'react'
import styles from './BusinessTile.module.css'

interface BusinessTileProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
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
const pickTint = (name: string) => {
  const hash = [...name].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7)
  return TINTS[hash % TINTS.length] ?? TINTS[0]
}

export const BusinessTile = ({ name, size = 'md', className }: BusinessTileProps) => (
  <span
    className={className ? `${styles.tile} ${className}` : styles.tile}
    data-size={size}
    style={{ '--tint': pickTint(name) } as CSSProperties}
    aria-hidden='true'
  >
    {getInitials(name)}
  </span>
)
