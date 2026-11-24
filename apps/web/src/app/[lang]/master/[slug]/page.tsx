import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { requireCustomer } from '@/shared/api/sessionApi'
import { initLingui } from '@/shared/i18n/server'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { MasterDayPage } from '@/views/masterDay'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`My day`),
    robots: { index: false },
  }
}

// The session is checked on the server; the day itself follows the chosen date on the client.
const MasterDayWithSession = async ({ slug }: { slug: string }) => {
  const customer = await requireCustomer(`/master/${slug}`)

  return (
    <SessionProvider customer={customer}>
      <MasterDayPage slug={slug} />
    </SessionProvider>
  )
}

const MasterRoute = async ({ params }: PageProps<'/[lang]/master/[slug]'>) => {
  await initLingui()

  return (
    <Suspense fallback={<PageSkeleton />}>
      {params.then(({ slug }) => (
        <MasterDayWithSession slug={slug} />
      ))}
    </Suspense>
  )
}

export default MasterRoute
