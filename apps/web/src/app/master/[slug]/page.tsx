import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { requireCustomer } from '@/shared/api/sessionApi'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { MasterDayPage } from '@/views/masterDay'

export const metadata: Metadata = {
  title: 'Мой день',
  robots: { index: false },
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

const MasterRoute = ({ params }: PageProps<'/master/[slug]'>) => (
  <Suspense fallback={<PageSkeleton />}>
    {params.then(({ slug }) => (
      <MasterDayWithSession slug={slug} />
    ))}
  </Suspense>
)

export default MasterRoute
