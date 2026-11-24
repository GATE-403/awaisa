import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { requireCustomer } from '@/shared/api/sessionApi'
import { initLingui } from '@/shared/i18n/server'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { CreateBusinessPage } from '@/views/forBusiness'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`New business page`),
    robots: { index: false },
  }
}

// Guests are sent to sign in by the server, before the form flashes.
const CreateWithSession = async () => {
  const customer = await requireCustomer('/business/new')

  return (
    <SessionProvider customer={customer}>
      <CreateBusinessPage />
    </SessionProvider>
  )
}

const CreateBusinessRoute = async () => {
  await initLingui()

  return (
    <Suspense fallback={<PageSkeleton />}>
      <CreateWithSession />
    </Suspense>
  )
}

export default CreateBusinessRoute
