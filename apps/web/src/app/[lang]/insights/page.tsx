import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { getInsightsOnServer, requireCustomer } from '@/shared/api/sessionApi'
import { initLingui } from '@/shared/i18n/server'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { InsightsPage } from '@/views/insights'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`Funnels`),
    robots: { index: false },
  }
}

// Platform admins only; anyone else gets the ordinary "not found", not a hint that it exists.
const InsightsWithSession = async () => {
  const customer = await requireCustomer('/insights')
  if (!customer.isAdmin) notFound()
  const initial = await getInsightsOnServer(30)

  return (
    <SessionProvider customer={customer}>
      <InsightsPage initial={initial} />
    </SessionProvider>
  )
}

const InsightsRoute = async () => {
  await initLingui()

  return (
    <Suspense fallback={<PageSkeleton />}>
      <InsightsWithSession />
    </Suspense>
  )
}

export default InsightsRoute
