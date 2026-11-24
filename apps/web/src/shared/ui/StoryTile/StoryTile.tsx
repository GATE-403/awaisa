import NextLink from 'next/link'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { sizedImage } from '@/shared/lib/imageSizes'
import styles from './StoryTile.module.css'

interface StoryTileProps {
  href: string
  label: string
  /**
   * Read after the visible label and note, for screen readers only («Tengri SPA, 2,600 som»).
   * Not an aria-label: the name must contain what is written on the tile (WCAG 2.5.3), so
   * «tap Facial cleansing» in voice control finds it.
   */
  details?: string
  imageUrl?: string | null
  /** Drawn in the frame when there is no picture: the place's own tile, on `tint`. */
  fallback?: ReactNode
  /** A CSS colour washing the frame behind `fallback` (the place's colour). */
  tint?: string
  /** A small square in the corner: the master's face or the place's tile. */
  badge?: ReactNode
  /** A short capsule over the picture. */
  chip?: string
  /** A quiet second line under the label («Due again», «Nearby · 1.2 km»). */
  note?: string
  /** `new` - an accent ring (something not seen yet), `seen` - a grey one, `none` - no ring. */
  ring?: 'new' | 'seen' | 'none'
  isEager?: boolean
  onOpen?: () => void
}

// One story of a row like Instagram's, but a 92pt rounded square: a picture, an optional ring
// that says whether there is something new, a one-line label and a quiet note under it.
export const StoryTile = ({
  href,
  label,
  details,
  imageUrl,
  fallback,
  tint,
  badge,
  chip,
  note,
  ring = 'none',
  isEager = false,
  onOpen,
}: StoryTileProps) => (
  <li className={styles.item}>
    <NextLink href={href} className={styles.tile} data-ring={ring} onClick={onOpen}>
      <span
        className={styles.frame}
        data-picture-frame=''
        data-fallback={!imageUrl && fallback ? '' : undefined}
        style={tint ? ({ '--story-tint': tint } as CSSProperties) : undefined}
      >
        {!imageUrl && fallback}
        {imageUrl && (
          // biome-ignore lint/performance/noImgElement: sized CDN/WebP pictures
          <img
            {...sizedImage(imageUrl, 92)}
            alt=''
            className={styles.image}
            loading={isEager ? 'eager' : 'lazy'}
            decoding='async'
          />
        )}
        {chip && <span className={styles.chip}>{chip}</span>}
        {badge && <span className={styles.badge}>{badge}</span>}
      </span>
      <span className={styles.label}>{label}</span>
      {note && <span className={styles.note}>{note}</span>}
      {details && <span className={styles.srOnly}>{`, ${details}`}</span>}
    </NextLink>
  </li>
)

interface StoryRowProps {
  children: ReactNode
  ariaLabel?: string
  ref?: Ref<HTMLUListElement>
}

export const StoryRow = ({ children, ariaLabel, ref }: StoryRowProps) => (
  <ul ref={ref} className={styles.row} aria-label={ariaLabel} data-edge-fade=''>
    {children}
  </ul>
)
