import { ImageResponse } from 'next/og'
import { API_URL } from '@/shared/config/api'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { pluralize } from '@/shared/lib/plural'
import { OgMascot } from '@/shared/lib/seo/OgMascot'
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
  since: string | null
  stats: { visits: number; places: number; reviews: number }
}

const formatSince = (iso: string | null) => {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat('ru-RU', {
        month: 'short',
        year: 'numeric',
        timeZone: BUSINESS_TIME_ZONE,
      })
        .format(date)
        .replace(' г.', '')
}

// A 9:16 story card (1080 × 1920) in a quiet, light frame: chips with the level and the date on
// top, one rounded photo card glowing in the profile's colour — the name over the photo, the
// face, handle and facts with a white capsule at its foot — and the address to type under it.
export const GET = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const response = await fetch(`${API_URL}/profiles/${encodeURIComponent(id)}`)
  if (!response.ok) return new Response('Not found', { status: 404 })
  const profile = (await response.json()) as StoryProfile
  const accent = ACCENT_HEX[profile.accent] ?? '#0a84ff'
  const earned = profile.achievements.filter((item) => item.earned)
  const host = new URL(SITE_URL).host
  const address = `${host}/u/${profile.handle ?? profile.id}`
  const handle = profile.handle ? `@${profile.handle}` : profile.name
  const since = formatSince(profile.since)
  const status = `${profile.statusEmoji} ${profile.status}`.trim()
  const chip = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '18px 34px',
    borderRadius: 60,
    border: '2px solid #c7c7cc',
    fontSize: 34,
    fontWeight: 600,
    color: '#1d1d1f',
  } as const

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: '150px 90px 120px',
        background: '#f7f7f8',
        color: '#1d1d1f',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
        <div style={chip}>
          {`${earned.length > 0 ? (ACHIEVEMENT_EMOJI[earned[0]?.id ?? ''] ?? '✨') : '✨'} Уровень ${profile.level.level}`}
        </div>
        {since && <div style={chip}>{`с ${since}`}</div>}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          width: 820,
          height: 1150,
          marginTop: 150,
          borderRadius: 96,
          overflow: 'hidden',
          background: `linear-gradient(160deg, ${accent}cc, ${accent})`,
          // The glow under the card, in the profile's colour.
          boxShadow: `0 70px 180px ${accent}77`,
          color: '#fff',
        }}
      >
        {profile.avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: OG images render plain img
          <img
            src={profile.avatarUrl}
            alt=''
            width={820}
            height={1150}
            style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              left: 0,
              width: 820,
              height: 860,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <OgMascot size={300} color='rgba(255,255,255,0.92)' />
          </div>
        )}
        {/* Soft at the top for the name, a warm veil of the colour at the foot for the row. */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width: 820,
            height: 1150,
            background: `linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 58%, ${accent}aa 86%, ${accent}ee 100%)`,
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            paddingTop: 72,
          }}
        >
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 700 }}>{profile.name}</div>
          {status && (
            <div style={{ display: 'flex', marginTop: 10, fontSize: 38, opacity: 0.92 }}>
              {status}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flex: 1 }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            gap: 26,
            padding: '0 56px 56px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 96,
              height: 96,
              borderRadius: 48,
              overflow: 'hidden',
              border: '3px solid rgba(255,255,255,0.85)',
              background: accent,
              fontSize: 38,
              fontWeight: 700,
            }}
          >
            {profile.avatarUrl ? (
              // biome-ignore lint/performance/noImgElement: OG images render plain img
              <img
                src={profile.avatarUrl}
                alt=''
                width={96}
                height={96}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <OgMascot size={46} />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: 340 }}>
            <div
              style={{
                display: 'block',
                width: 340,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                fontSize: 38,
                fontWeight: 700,
              }}
            >
              {handle}
            </div>
            <div style={{ display: 'flex', fontSize: 30, opacity: 0.85 }}>
              {[
                pluralize(profile.stats.visits, ['визит', 'визита', 'визитов']),
                pluralize(profile.stats.places, ['место', 'места', 'мест']),
              ].join(' · ')}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '26px 40px',
              borderRadius: 36,
              background: '#fff',
              color: '#1d1d1f',
              fontSize: 36,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            + Профиль
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }} />
      <div style={{ display: 'flex', fontSize: 34, color: '#6e6e73' }}>
        {profile.favoriteMaster
          ? `Мой мастер — ${profile.favoriteMaster.name.split(' ')[0]} · ${profile.favoriteMaster.businessName}`
          : 'Записывайся к мастерам через Awaisa'}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 10,
          fontSize: profile.handle ? 48 : 36,
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
