import { ImageResponse } from 'next/og'
import { API_URL } from '@/shared/config/api'
import { pluralize } from '@/shared/lib/plural'
import { OG_IMAGE_SIZE } from '@/shared/lib/seo/businessMetadata'
import { loadProfilePhoto } from '@/shared/lib/seo/profilePhoto'

export const alt = 'Profile on Awaisa'
export const size = OG_IMAGE_SIZE
export const contentType = 'image/png'

// Images cannot read CSS variables: the profile colours as plain values (`entities/profile`).
const ACCENT_HEX: Record<string, string> = {
  blue: '#0a84ff',
  indigo: '#5e5ce6',
  purple: '#bf5af2',
  pink: '#ff375f',
  red: '#ff453a',
  orange: '#ff9f0a',
  green: '#30d158',
  teal: '#40c8e0',
}

type OgProfile = {
  name: string
  avatarUrl: string | null
  accent: string
  status: string
  statusEmoji: string
  level: { level: number }
  achievements: { title: string; earned: boolean }[]
  stats: { visits: number; places: number; reviews: number }
}

// A shared profile as a quiet card: the face on a soft wash of the profile's colour, the name,
// one line of facts, the level and the earned achievements.
const ProfileOgImage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const response = await fetch(`${API_URL}/profiles/${encodeURIComponent(id)}`)
  const profile = response.ok ? ((await response.json()) as OgProfile) : null
  const accent = ACCENT_HEX[profile?.accent ?? ''] ?? '#0a84ff'
  const earned = profile?.achievements.filter((item) => item.earned) ?? []
  const photo = profile ? await loadProfilePhoto({ id, avatarUrl: profile.avatarUrl }, 336) : null

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: `radial-gradient(80% 70% at 50% 0%, ${accent}33, #000 75%)`,
        color: '#fff',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 168,
          height: 168,
          borderRadius: 84,
          background: '#2c2c2e',
          overflow: 'hidden',
          fontSize: 64,
          fontWeight: 700,
        }}
      >
        {photo ? (
          // biome-ignore lint/performance/noImgElement: OG images render plain img
          <img src={photo} alt='' width={168} height={168} style={{ objectFit: 'cover' }} />
        ) : (
          (profile?.name ?? 'A').charAt(0)
        )}
      </div>
      <div style={{ display: 'flex', marginTop: 28, fontSize: 64, fontWeight: 700 }}>
        {profile?.name ?? 'Profile'}
      </div>
      <div style={{ display: 'flex', marginTop: 8, fontSize: 30, color: '#a1a1a6' }}>
        {profile
          ? (profile.status && `${profile.statusEmoji} ${profile.status}`.trim()) ||
            `${pluralize(profile.stats.visits, ['visit', 'visits'])} · ${pluralize(profile.stats.places, ['place', 'places'])} · ${pluralize(profile.stats.reviews, ['review', 'reviews'])}`
          : 'Awaisa'}
      </div>
      {profile && (
        <div
          style={{ display: 'flex', marginTop: 14, fontSize: 30, fontWeight: 700, color: accent }}
        >
          {`Level ${profile.level.level} · ${pluralize(earned.length, ['achievement', 'achievements'])}`}
        </div>
      )}
    </div>,
    size,
  )
}

// biome-ignore lint/style/noDefaultExport: Next reads metadata routes from the default export
export default ProfileOgImage
