import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { initLingui } from '@/shared/i18n/server'
import { VisitLinkPage } from '@/views/visitLink'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`Your booking`),
    robots: { index: false },
  }
}

const VisitLinkRoute = async ({ params }: PageProps<'/[lang]/v/[id]'>) => {
  await initLingui()

  return (
    <Suspense>
      {params.then(({ id }) => (
        <VisitLinkPage bookingId={id} />
      ))}
    </Suspense>
  )
}

export default VisitLinkRoute
