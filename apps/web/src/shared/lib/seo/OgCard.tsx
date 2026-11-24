import { colors, palette } from '@awaisa/tokens'
import { PLATFORM } from '@/shared/config/platform'
import { OgMascot } from './OgMascot'
import { mixHex, pickTintHex } from './ogTint'

const LONG_NAME = 22

const theme = colors.light

const Star = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' aria-hidden='true'>
    <path
      fill={theme.rating}
      d='M12 2.5l2.94 6.1 6.56.86-4.8 4.6 1.2 6.52L12 17.4l-5.9 3.18 1.2-6.52-4.8-4.6 6.56-.86z'
    />
  </svg>
)

const Footer = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30 }}>
    <span style={{ color: theme.foreground }}>{PLATFORM.name}</span>
    <span style={{ color: theme.mutedForeground }}>Online booking, no calls</span>
  </div>
)

interface BusinessOgCardProps {
  name: string
  kindLabel: string
  address: string
  rating: number | null
  reviewsCount: number
}

export const BusinessOgCard = ({
  name,
  kindLabel,
  address,
  rating,
  reviewsCount,
}: BusinessOgCardProps) => {
  const tint = pickTintHex(name)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: `linear-gradient(135deg, ${mixHex(tint, theme.background, 0.2)} 0%, ${theme.background} 55%)`,
        color: theme.foreground,
      }}
    >
      <div
        style={{
          width: 168,
          height: 168,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
          background: `linear-gradient(160deg, ${mixHex(tint, palette.white, 0.78)}, ${mixHex(tint, theme.foreground, 0.82)})`,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.16)',
          color: palette.white,
        }}
      >
        <OgMascot size={84} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div
          style={{
            display: 'flex',
            fontSize: name.length > LONG_NAME ? 68 : 88,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          {name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 36,
            color: theme.mutedForeground,
          }}
        >
          {rating !== null && <Star size={34} />}
          {rating !== null && (
            <span style={{ color: theme.foreground }}>
              {rating.toFixed(1)}
              {reviewsCount > 0 ? ` (${reviewsCount})` : ''}
            </span>
          )}
          {rating !== null && <span>·</span>}
          <span>{kindLabel}</span>
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: theme.mutedForeground }}>{address}</div>
      </div>
      <Footer />
    </div>
  )
}

interface PlatformOgCardProps {
  kinds: string[]
}

export const PlatformOgCard = ({ kinds }: PlatformOgCardProps) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 36,
      padding: 80,
      background: `linear-gradient(135deg, ${mixHex(theme.primary, theme.background, 0.16)} 0%, ${theme.background} 60%)`,
      color: theme.foreground,
    }}
  >
    <div style={{ display: 'flex', fontSize: 120, letterSpacing: -4 }}>{PLATFORM.name}</div>
    <div
      style={{
        display: 'flex',
        maxWidth: 960,
        fontSize: 48,
        lineHeight: 1.2,
        color: theme.mutedForeground,
      }}
    >
      {PLATFORM.tagline}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
      {kinds.map((kind) => (
        <div
          key={kind}
          style={{
            display: 'flex',
            padding: '12px 28px',
            borderRadius: 999,
            background: palette.white,
            fontSize: 30,
            color: theme.foreground,
          }}
        >
          {kind}
        </div>
      ))}
    </div>
  </div>
)
