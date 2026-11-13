import type { Metadata } from 'next'
import { Suspense } from 'react'
import { listFeed } from '@/shared/api/serverApi'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { FeedPage } from '@/views/feed'

export const metadata: Metadata = {
  title: 'Работы мастеров',
  description: 'Стрижки, маникюр и окрашивание мастеров рядом — и запись на то же в один тап.',
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

const FeedRoute = ({ searchParams }: PageProps<'/feed'>) => (
  <Suspense fallback={<FeedPage isPending />}>
    {searchParams.then((query) => (
      <FeedWithItems query={query} />
    ))}
  </Suspense>
)

export default FeedRoute
