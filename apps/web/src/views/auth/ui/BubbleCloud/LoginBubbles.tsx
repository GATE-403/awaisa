import { connection } from 'next/server'
import { listFeed } from '@/shared/api/serverApi'
import { BubbleCloud } from './BubbleCloud'

const BUBBLES = 9

// Real finished work from «Образы»: different places first so the cloud shows the range, then
// more of the same places until every bubble has a picture.
export const LoginBubbles = async () => {
  // Read when the page is asked for, not at build: the static shell keeps the tinted bubbles
  // (the API is not there while building).
  await connection()
  const pages = await Promise.all([
    listFeed(undefined, undefined, undefined).catch(() => null),
    listFeed(undefined, undefined, undefined, 12).catch(() => null),
  ])
  const items = pages.flatMap((page) => page?.items ?? [])
  const seen = new Set<string>()
  const first = items.filter((item) => {
    if (seen.has(item.business.slug)) return false
    seen.add(item.business.slug)
    return true
  })
  const rest = items.filter((item) => !first.includes(item))
  const pictures = [...first, ...rest].slice(0, BUBBLES).map((item) => item.url)

  return <BubbleCloud pictures={pictures} />
}
