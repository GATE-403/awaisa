import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getVisitReviewOnServer } from '@/shared/api/sessionApi'
import { initLingui } from '@/shared/i18n/server'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { ReviewPage } from '@/views/review'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`Rate your visit`),
    robots: { index: false },
  }
}

// The SMS link is signed, so the visit is read and rendered on the server: the client sees it at
// once and only the stars and comment hydrate.
const ReviewWithVisit = async ({ id, signature }: { id: string; signature: string | null }) => {
  const { data, error } = await getVisitReviewOnServer(id, signature)

  return <ReviewPage bookingId={id} signature={signature} data={data} error={error} />
}

const ReviewRoute = async ({ params, searchParams }: PageProps<'/[lang]/review/[id]'>) => {
  await initLingui()

  return (
    <Suspense fallback={<PageSkeleton />}>
      {Promise.all([params, searchParams]).then(([{ id }, query]) => (
        <ReviewWithVisit id={id} signature={typeof query.s === 'string' ? query.s : null} />
      ))}
    </Suspense>
  )
}

export default ReviewRoute
