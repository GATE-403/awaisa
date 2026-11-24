import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { API_URL } from '@/shared/config/api'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { pluralize, pluralWord } from '@/shared/lib/plural'
import { OgMascot } from '@/shared/lib/seo/OgMascot'
import { loadProfilePhoto } from '@/shared/lib/seo/profilePhoto'
import { SITE_URL } from '@/shared/lib/seo/siteUrl'
import { MASCOT_PATH } from '@/shared/ui/Mascot/Mascot'

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

// Inter from disk (traced into the build by `outputFileTracingIncludes`): the image renderer's own
// font has one weight, so the bold words read as regular ones.
const loadFonts = async () => {
  const dir = join(process.cwd(), 'assets/fonts')
  const [regular, semibold] = await Promise.all([
    readFile(join(dir, 'Inter-Regular.otf')),
    readFile(join(dir, 'Inter-SemiBold.otf')),
  ])
  return [
    { name: 'Inter', data: regular, weight: 400 as const, style: 'normal' as const },
    { name: 'Inter', data: semibold, weight: 600 as const, style: 'normal' as const },
  ]
}

// The light frame's pattern: mascots barely there, two per tile, the second turned and set half
// a tile over (`shared/ui/Mascot/mascotTile.ts`), in the label colour at 3%.
const patternTile = () =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 96 96'>` +
      `<g fill='#1d1d1f' fill-opacity='0.028'>` +
      `<path transform='translate(12 10) scale(0.8)' fill-rule='evenodd' d='${MASCOT_PATH}'/>` +
      `<path transform='translate(60 58) rotate(-14 12 13) scale(0.8)' fill-rule='evenodd' d='${MASCOT_PATH}'/>` +
      '</g></svg>',
  )}")`

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
// top, one rounded photo card glowing in the profile's colour - the name over the photo, the
// face, handle and facts with a white capsule at its foot - and the address to type under it.
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
  // A lone emoji under the name read as noise: the status shows only with its words.
  const status = profile.status.trim() ? `${profile.statusEmoji} ${profile.status}`.trim() : ''
  const chip = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '18px 34px',
    borderRadius: 60,
    border: '2px solid #d1d1d6',
    background: 'rgba(255,255,255,0.7)',
    fontSize: 34,
    fontWeight: 600,
    color: '#1d1d1f',
  } as const
  // The card's numbers, big and bold over a quiet word, like a stat on a medal.
  const facts = [
    {
      value: profile.stats.visits,
      label: pluralize(profile.stats.visits, ['visit', 'visits']).replace(/^\d+ /, ''),
    },
    {
      value: profile.stats.places,
      label: pluralize(profile.stats.places, ['place', 'places']).replace(/^\d+ /, ''),
    },
    {
      value: earned.length,
      label: pluralWord(earned.length, ['medal', 'medals']),
    },
  ]
  const fonts = await loadFonts()
  const photo = await loadProfilePhoto(profile, 820)

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: '150px 90px 120px',
        backgroundColor: '#f7f7f8',
        backgroundImage: patternTile(),
        backgroundRepeat: 'repeat',
        backgroundSize: '180px 180px',
        color: '#1d1d1f',
        fontFamily: 'Inter',
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
          // A plain soft shadow: a glow in the profile's colour read as out of place.
          boxShadow: '0 40px 90px rgba(0,0,0,0.18)',
          color: '#fff',
        }}
      >
        {photo ? (
          // biome-ignore lint/performance/noImgElement: OG images render plain img
          <img
            src={photo}
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
              height: 820,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <OgMascot size={260} color='rgba(255,255,255,0.92)' />
          </div>
        )}
        {/* Dark at the top for the name, a deep veil at the foot for the numbers and the row. */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width: 820,
            height: 1150,
            background: `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.62) 82%, rgba(0,0,0,0.72) 100%)`,
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            padding: '72px 56px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 92,
              fontWeight: 600,
              letterSpacing: -3,
              lineHeight: 1.05,
              textAlign: 'center',
            }}
          >
            {profile.name}
          </div>
          {status && (
            <div
              style={{
                display: 'flex',
                marginTop: 14,
                fontSize: 38,
                color: 'rgba(255,255,255,0.82)',
              }}
            >
              {status}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flex: 1 }} />
        <div
          style={{
            display: 'flex',
            position: 'relative',
            justifyContent: 'space-between',
            padding: '0 64px 44px',
          }}
        >
          {facts.map((fact, index) => (
            <div
              key={fact.label}
              // The three numbers sit on the card's left edge, centre and right edge.
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: ['flex-start', 'center', 'flex-end'][index] ?? 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 104,
                  fontWeight: 600,
                  letterSpacing: -4,
                  lineHeight: 1,
                }}
              >
                {String(fact.value)}
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: 8,
                  fontSize: 32,
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                {fact.label}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            gap: 24,
            margin: '0 32px 32px',
            padding: '20px 20px 20px 24px',
            borderRadius: 64,
            background: 'rgba(255,255,255,0.16)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
              width: 84,
              height: 84,
              borderRadius: 42,
              overflow: 'hidden',
              border: '3px solid rgba(255,255,255,0.85)',
              background: accent,
            }}
          >
            {photo ? (
              // biome-ignore lint/performance/noImgElement: OG images render plain img
              <img src={photo} alt='' width={84} height={84} style={{ objectFit: 'cover' }} />
            ) : (
              <OgMascot size={40} />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'block',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                fontSize: 36,
                fontWeight: 600,
              }}
            >
              {handle}
            </div>
            <div style={{ display: 'flex', fontSize: 28, color: 'rgba(255,255,255,0.8)' }}>
              {`Уровень ${profile.level.level} в Awaisa`}
            </div>
          </div>
          {/* A link sticker's look: a white capsule, the glyph and the word in one line. */}
          <div
            style={{
              display: 'flex',
              flexShrink: 0,
              alignItems: 'center',
              gap: 10,
              height: 84,
              padding: '0 36px',
              borderRadius: 42,
              background: '#fff',
              color: accent,
              fontSize: 34,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ display: 'flex', fontSize: 40, lineHeight: 1 }}>+</div>
            <div style={{ display: 'flex', color: '#1d1d1f' }}>Профиль</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }} />
      <div style={{ display: 'flex', fontSize: 34, color: '#6e6e73' }}>
        {profile.favoriteMaster
          ? `Мой мастер - ${profile.favoriteMaster.name.split(' ')[0]} · ${profile.favoriteMaster.businessName}`
          : 'Записывайся к мастерам через Awaisa'}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 10,
          fontSize: profile.handle ? 48 : 36,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {address}
      </div>
    </div>,
    { width: 1080, height: 1920, emoji: 'twemoji', fonts },
  )
}
