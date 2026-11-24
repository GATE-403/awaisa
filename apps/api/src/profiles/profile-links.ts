/**
 * Links on a client's profile: Instagram, Telegram, TikTok and a website. People paste a handle,
 * «@name» or a whole link; we keep only the handle (or a clean https address) and build the
 * links ourselves, so a profile never carries an arbitrary URL in place of «Instagram».
 */
const LINK_KINDS = ['instagram', 'telegram', 'tiktok', 'website'] as const

type LinkKind = (typeof LINK_KINDS)[number]
type ProfileLinks = Partial<Record<LinkKind, string>>

const HOSTS: Record<Exclude<LinkKind, 'website'>, RegExp> = {
  instagram: /^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i,
  telegram: /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\//i,
  tiktok: /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?/i,
}

const HANDLE: Record<Exclude<LinkKind, 'website'>, RegExp> = {
  instagram: /^[a-z0-9._]{1,30}$/i,
  telegram: /^[a-z][a-z0-9_]{4,31}$/i,
  tiktok: /^[a-z0-9._]{2,24}$/i,
}

const LABELS: Record<LinkKind, string> = {
  instagram: 'Instagram',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  website: 'Website',
}

/** A handle from what was pasted, or null when it cannot be one. Empty → ''. */
const toHandle = (kind: Exclude<LinkKind, 'website'>, raw: string) => {
  const value = raw
    .trim()
    .replace(HOSTS[kind], '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
  if (value === '') return ''
  return HANDLE[kind].test(value) ? value : null
}

/** A clean https address (host and path, no credentials), or null. Empty → ''. */
const toWebsite = (raw: string) => {
  const value = raw.trim()
  if (value === '') return ''
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return null
    url.protocol = 'https:'
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

/**
 * Cleans what the client typed: each field becomes a handle / address, '' clears it. Returns the
 * kinds that could not be read, so the API can say which one is wrong.
 */
const normalizeLinks = (input: ProfileLinks) => {
  const links: ProfileLinks = {}
  const invalid: LinkKind[] = []
  for (const kind of LINK_KINDS) {
    const raw = input[kind]
    if (raw === undefined) continue
    const value = kind === 'website' ? toWebsite(raw) : toHandle(kind, raw)
    if (value === null) invalid.push(kind)
    else if (value !== '') links[kind] = value
  }
  return { links, invalid }
}

/** What the profile page shows: in a fixed order, each with its label, text and address. */
const linksView = (stored: ProfileLinks | null | undefined) =>
  LINK_KINDS.filter((kind) => stored?.[kind]).map((kind) => {
    const value = stored?.[kind] ?? ''
    const url =
      kind === 'instagram'
        ? `https://instagram.com/${value}`
        : kind === 'telegram'
          ? `https://t.me/${value}`
          : kind === 'tiktok'
            ? `https://www.tiktok.com/@${value}`
            : value
    const text = kind === 'website' ? value.replace(/^https:\/\/(www\.)?/, '') : `@${value}`
    return { kind, label: LABELS[kind], text, url }
  })

export type { LinkKind, ProfileLinks }
export { LABELS as LINK_LABELS, LINK_KINDS, linksView, normalizeLinks }
