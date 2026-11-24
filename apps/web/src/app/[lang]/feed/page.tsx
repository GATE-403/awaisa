import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { listFeed } from '@/shared/api/serverApi'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { initLingui } from '@/shared/i18n/server'
import { FeedPage } from '@/views/feed'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`Looks`),
    description: i18n._(
      msg`Haircuts, manicures and colouring by specialists nearby, and booking the same in one tap.`,
    ),
    // Kinds, a place and a shared photo (`?start=`) are views of this one page.
    alternates: { canonical: '/feed' },
  }
}

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

// The first page comes from the server cache; the feed loads the rest as it scrolls.
const FeedWithItems = async ({ query }: { query: Record<string, unknown> }) => {
  const kind = BUSINESS_KINDS.find((item) => item.value === query.kind)?.value
  const business = text(query.business)
  const start = text(query.start)
  const page = await listFeed(kind, business, start).catch(() => null)

  return <FeedPage kind={kind} business={business} start={start} initialPage={page} />
}

const FeedRoute = async ({ searchParams }: PageProps<'/[lang]/feed'>) => {
  await initLingui()

  return (
    <Suspense fallback={<FeedPage isPending />}>
      {searchParams.then((query) => (
        <FeedWithItems query={query} />
      ))}
    </Suspense>
  )
}

export default FeedRoute
