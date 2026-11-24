import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { getManagedBusinessOnServer, requireCustomer } from '@/shared/api/sessionApi'
import { initLingui } from '@/shared/i18n/server'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { ManagePage } from '@/views/manage'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`Dashboard`),
    robots: { index: false },
  }
}

const CabinetWithSession = async ({ slug }: { slug: string }) => {
  const customer = await requireCustomer(`/manage/${slug}`)
  const data = await getManagedBusinessOnServer(slug)

  return (
    <SessionProvider customer={customer}>
      <ManagePage slug={slug} initialData={data} />
    </SessionProvider>
  )
}

const ManageRoute = async ({ params }: PageProps<'/[lang]/manage/[slug]'>) => {
  await initLingui()

  return (
    <Suspense fallback={<PageSkeleton />}>
      {params.then(({ slug }) => (
        <CabinetWithSession slug={slug} />
      ))}
    </Suspense>
  )
}

export default ManageRoute
