import type { LiHTMLAttributes, ReactNode } from 'react'
import styles from './PhotoGrid.module.css'

interface PhotoGridProps {
  children: ReactNode
  isBusy?: boolean
}

interface PhotoGridTileProps extends Omit<LiHTMLAttributes<HTMLLIElement>, 'onClick'> {
  src: string
  /** The tile is a button: what it opens, for screen readers. */
  label: string
  onOpen: () => void
  /** Marks over the photo (the cabinet's «?» and hidden eye). */
  children?: ReactNode
  isDimmed?: boolean
}

// Work as a profile's grid in Instagram: square photos three a row that nearly touch, square
// edges; on phones it runs from edge to edge of the screen, out of the page's gutter.
export const PhotoGrid = ({ children, isBusy }: PhotoGridProps) => (
  <ul className={styles.grid} aria-busy={isBusy || undefined}>
    {children}
  </ul>
)

export const PhotoGridTile = ({
  src,
  label,
  onOpen,
  children,
  isDimmed,
  ...props
}: PhotoGridTileProps) => (
  <li className={styles.tile} data-dimmed={isDimmed || undefined} {...props}>
    <button type='button' className={styles.button} aria-label={label} onClick={onOpen}>
      {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
      <img
        src={src}
        alt=''
        className={styles.image}
        loading='lazy'
        decoding='async'
        draggable={false}
      />
      {children}
    </button>
  </li>
)
