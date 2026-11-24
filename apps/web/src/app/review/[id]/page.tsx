import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getVisitReviewOnServer } from '@/shared/api/sessionApi'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { ReviewPage } from '@/views/review'

export const metadata: Metadata = {
  title: 'Rate your visit',
  robots: { index: false },
}

// The SMS link is signed, so the visit is read and rendered on the server: the client sees it at
// once and only the stars and comment hydrate.
const ReviewWithVisit = async ({ id, signature }: { id: string; signature: string | null }) => {
  const { data, error } = await getVisitReviewOnServer(id, signature)

  return <ReviewPage bookingId={id} signature={signature} data={data} error={error} />
}

const ReviewRoute = ({ params, searchParams }: PageProps<'/review/[id]'>) => (
  <Suspense fallback={<PageSkeleton />}>
    {Promise.all([params, searchParams]).then(([{ id }, query]) => (
      <ReviewWithVisit id={id} signature={typeof query.s === 'string' ? query.s : null} />
    ))}
  </Suspense>
)

export default ReviewRoute
