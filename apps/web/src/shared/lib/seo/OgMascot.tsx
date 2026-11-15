import { MASCOT_PATH } from '@/shared/ui/Mascot/Mascot'

interface OgMascotProps {
  /** Width in px; the height follows the mascot's 30:32 shape. */
  size: number
  color?: string
}

// The mascot for generated images (share cards, stories): a plain SVG that satori draws, where
// the app shows it in place of initials.
export const OgMascot = ({ size, color = '#fff' }: OgMascotProps) => (
  <svg width={size} height={Math.round((size * 32) / 30)} viewBox='0 0 30 32' aria-hidden='true'>
    <path fillRule='evenodd' clipRule='evenodd' d={MASCOT_PATH} fill={color} />
  </svg>
)
