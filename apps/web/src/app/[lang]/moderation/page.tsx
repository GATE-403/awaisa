import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { getModerationOnServer, requireCustomer } from '@/shared/api/sessionApi'
import { initLingui } from '@/shared/i18n/server'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { ModerationPage } from '@/views/moderation'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`Moderation`),
    robots: { index: false },
  }
}

// Platform admins only; anyone else gets the ordinary "not found", not a hint that it exists.
const ModerationWithSession = async () => {
  const customer = await requireCustomer('/moderation')
  if (!customer.isAdmin) notFound()
  const initial = await getModerationOnServer()

  return (
    <SessionProvider customer={customer}>
      <ModerationPage initial={initial} />
    </SessionProvider>
  )
}

const ModerationRoute = async () => {
  await initLingui()

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModerationWithSession />
    </Suspense>
  )
}

export default ModerationRoute
