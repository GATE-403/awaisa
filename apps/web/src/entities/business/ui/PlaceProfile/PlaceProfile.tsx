import type { CSSProperties, ImgHTMLAttributes, ReactElement, ReactNode } from 'react'
import { MASCOT_TILE } from '@/shared/ui/Mascot/mascotTile'
import { BusinessTile, pickTint } from '../BusinessTile/BusinessTile'
import styles from './PlaceProfile.module.css'

interface PlaceProfileProps {
  /** The place's name: its tint washes the empty cover. */
  name: string
  hasCover: boolean
  /** What lies on the cover: the picture (`PlaceCoverImage`) and any button over it. */
  cover?: ReactNode
  /** Wraps the cover's frame (the public page's catalog → cover view transition). */
  coverFrame?: (frame: ReactElement) => ReactNode
  /** The logo over the cover's edge (`PlaceLogo`, or a button around it). */
  logo: ReactNode
  /** At the logo's line end: one primary capsule and a `GlyphGroup` of the same height. */
  actions?: ReactNode
  /** Phones: the cabinet floats its actions at the window's foot instead. */
  isActionsHiddenOnPhone?: boolean
  /** The bio: `PlaceName`, `PlaceLine`s, `PlaceDescription`. */
  children: ReactNode
  /** Under the bio: facts, promotions, what the page still lacks. */
  footer?: ReactNode
}

interface PlaceLogoProps {
  name: string
  logoUrl?: string | null
  isBusy?: boolean
  /** A badge on its corner (the cabinet's camera). */
  children?: ReactNode
}

interface PlaceNameProps {
  as?: 'h1' | 'h2' | 'p'
  children: ReactNode
}

interface PlaceLineProps {
  tone?: 'open' | 'danger'
  children: ReactNode
}

// A place's page laid out like a profile in Instagram, one head for the public page and the
// owner's «Page»: the cover the window's whole width with square edges, the logo over its
// edge, on the same line one primary action and the thin glyphs, then a bio set close.
export const PlaceProfile = ({
  name,
  hasCover,
  cover,
  coverFrame = (frame) => frame,
  logo,
  actions,
  isActionsHiddenOnPhone,
  children,
  footer,
}: PlaceProfileProps) => (
  <header
    className={styles.head}
    style={{ '--place-tint': pickTint(name), '--mascot-tile': MASCOT_TILE } as CSSProperties}
  >
    {coverFrame(
      <figure
        className={styles.cover}
        data-empty={!hasCover || undefined}
        data-picture-frame={hasCover ? '' : undefined}
      >
        {cover}
      </figure>,
    )}
    <div className={styles.profileRow}>
      {logo}
      {actions && (
        <div className={styles.actions} data-phone-hidden={isActionsHiddenOnPhone || undefined}>
          {actions}
        </div>
      )}
    </div>
    <div className={styles.bio}>{children}</div>
    {footer}
  </header>
)

export const PlaceCoverImage = (props: ImgHTMLAttributes<HTMLImageElement>) => (
  // biome-ignore lint/performance/noImgElement: already resized WebP from our API
  <img alt='' {...props} className={styles.coverImage} />
)

export const PlaceLogo = ({ name, logoUrl, isBusy, children }: PlaceLogoProps) => (
  <span className={styles.logo} data-busy={isBusy || undefined}>
    <BusinessTile name={name} logoUrl={logoUrl} size='lg' />
    {children}
  </span>
)

export const PlaceName = ({ as: Heading = 'h2', children }: PlaceNameProps) => (
  <Heading className={styles.name}>{children}</Heading>
)

export const PlaceLine = ({ tone, children }: PlaceLineProps) => (
  <p className={styles.line} data-tone={tone}>
    {children}
  </p>
)

export const PlaceDescription = ({ children }: { children: ReactNode }) => (
  <p className={styles.description}>{children}</p>
)
