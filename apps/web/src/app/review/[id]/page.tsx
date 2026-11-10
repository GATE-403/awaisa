import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ReviewPage } from '@/views/review'

export const metadata: Metadata = {
  title: 'Оценить визит',
  robots: { index: false },
}

const ReviewRoute = ({ params }: PageProps<'/review/[id]'>) => (
  <Suspense>
    {params.then(({ id }) => (
      <ReviewPage bookingId={id} />
    ))}
  </Suspense>
)

export default ReviewRoute
