import { ImageResponse } from 'next/og'
import { API_URL } from '@/shared/config/api'
import { pluralize } from '@/shared/lib/plural'
import { SITE_URL } from '@/shared/lib/seo/siteUrl'

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

const ACHIEVEMENT_EMOJI: Record<string, string> = {
  'first-visit': '🎉',
  'visits-10': '💪',
  'visits-25': '🏆',
  regular: '👑',
  explorer: '🧭',
  'places-5': '🗺️',
  'early-bird': '🌅',
  'first-review': '💬',
  critic: '⭐',
  friend: '🤝',
  'friends-3': '🥳',
  year: '🎂',
}

type StoryProfile = {
  id: string
  handle: string | null
  name: string
  avatarUrl: string | null
  accent: string
  status: string
  statusEmoji: string
  level: { level: number }
  achievements: { id: string; title: string; earned: boolean }[]
  favoriteMaster: { name: string; businessName: string } | null
  stats: { visits: number; places: number; reviews: number }
}

// A 9:16 story card (1080 × 1920) for Instagram and Telegram: the face on a wash of the profile's
// colour, the name and status, one line of facts, the level, the earned achievements as emoji,
// «Мой мастер», and the short address to type — the invitation travels with the picture.
export const GET = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const response = await fetch(`${API_URL}/profiles/${encodeURIComponent(id)}`)
  if (!response.ok) return new Response('Not found', { status: 404 })
  const profile = (await response.json()) as StoryProfile
  const accent = ACCENT_HEX[profile.accent] ?? '#0a84ff'
  const earned = profile.achievements.filter((item) => item.earned)
  const address = `${new URL(SITE_URL).host}/u/${profile.handle ?? profile.id}`

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: '220px 96px 140px',
        background: `radial-gradient(90% 55% at 50% 0%, ${accent}55, #000 80%)`,
        color: '#fff',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 360,
          height: 360,
          borderRadius: 180,
          background: '#2c2c2e',
          overflow: 'hidden',
          fontSize: 140,
          fontWeight: 700,
        }}
      >
        {profile.avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: OG images render plain img
          <img
            src={profile.avatarUrl}
            alt=''
            width={360}
            height={360}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          profile.name.charAt(0)
        )}
      </div>
      <div style={{ display: 'flex', marginTop: 56, fontSize: 104, fontWeight: 700 }}>
        {profile.name}
      </div>
      {(profile.status || profile.statusEmoji) && (
        <div style={{ display: 'flex', marginTop: 16, fontSize: 44, color: '#ebebf5' }}>
          {`${profile.statusEmoji} ${profile.status}`.trim()}
        </div>
      )}
      <div style={{ display: 'flex', marginTop: 24, fontSize: 40, color: '#a1a1a6' }}>
        {[
          pluralize(profile.stats.visits, ['визит', 'визита', 'визитов']),
          pluralize(profile.stats.places, ['место', 'места', 'мест']),
          pluralize(profile.stats.reviews, ['отзыв', 'отзыва', 'отзывов']),
        ].join(' · ')}
      </div>
      <div style={{ display: 'flex', marginTop: 20, fontSize: 44, fontWeight: 700, color: accent }}>
        {`Уровень ${profile.level.level}`}
      </div>
      {earned.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 24,
            marginTop: 72,
            fontSize: 84,
          }}
        >
          {earned.slice(0, 8).map((item) => (
            <div key={item.id} style={{ display: 'flex' }}>
              {ACHIEVEMENT_EMOJI[item.id] ?? '🏅'}
            </div>
          ))}
        </div>
      )}
      {profile.favoriteMaster && (
        <div
          style={{
            display: 'flex',
            marginTop: 64,
            padding: '20px 40px',
            borderRadius: 60,
            background: '#1c1c1e',
            fontSize: 40,
            color: '#ebebf5',
          }}
        >
          {`Мой мастер — ${profile.favoriteMaster.name.split(' ')[0]} · ${profile.favoriteMaster.businessName}`}
        </div>
      )}
      <div style={{ display: 'flex', flex: 1 }} />
      <div style={{ display: 'flex', fontSize: 40, color: '#a1a1a6' }}>
        Записывайся к мастерам через Awaisa
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 12,
          // A handle fits large; the 20-character id is set smaller so it stays on one line.
          fontSize: profile.handle ? 56 : 40,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {address}
      </div>
    </div>,
    { width: 1080, height: 1920, emoji: 'twemoji' },
  )
}
