import type { Metadata } from 'next'
import { Suspense } from 'react'
import { VisitLinkPage } from '@/views/visitLink'

export const metadata: Metadata = {
  title: 'Your booking',
  robots: { index: false },
}

const VisitLinkRoute = ({ params }: PageProps<'/v/[id]'>) => (
  <Suspense>
    {params.then(({ id }) => (
      <VisitLinkPage bookingId={id} />
    ))}
  </Suspense>
)

export default VisitLinkRoute
