import { API_URL } from '@/shared/config/api'

// The face as a data URL the renderer can draw: our own photos are WebP, which it cannot read,
// so the API gives them as a PNG; a picture that does not load leaves the mascot (a broken
// image used to fail the whole card).
export const loadProfilePhoto = async (
  profile: { id: string; avatarUrl: string | null },
  width: number,
) => {
  if (!profile.avatarUrl) return null
  const isOwn = profile.avatarUrl.startsWith('/') || profile.avatarUrl.endsWith('.webp')
  const url = isOwn
    ? `${API_URL}/profiles/${encodeURIComponent(profile.id)}/avatar.png?w=${width}`
    : profile.avatarUrl
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const type = response.headers.get('content-type') ?? ''
    if (!response.ok || !/image\/(png|jpeg|gif)/.test(type)) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    return `data:${type.split(';')[0]};base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}
