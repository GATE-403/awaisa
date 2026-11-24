import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { getMyBusinessesOnServer, requireCustomer } from '@/shared/api/sessionApi'
import { initLingui, redirect } from '@/shared/i18n/server'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { ManageIndexPage } from '@/views/manage'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`My businesses`),
    robots: { index: false },
  }
}

const ManageIndexWithSession = async () => {
  const customer = await requireCustomer('/manage')
  const businesses = await getMyBusinessesOnServer()
  // One business: straight into its cabinet, no list to tap through.
  const [only] = businesses ?? []
  if (businesses?.length === 1 && only) await redirect(`/manage/${only.slug}`)

  return (
    <SessionProvider customer={customer}>
      <ManageIndexPage initialBusinesses={businesses} />
    </SessionProvider>
  )
}

const ManageIndexRoute = async () => {
  await initLingui()

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManageIndexWithSession />
    </Suspense>
  )
}

export default ManageIndexRoute
