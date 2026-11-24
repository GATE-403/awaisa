import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SessionProvider } from '@/entities/session'
import { getManagedBusinessOnServer, requireCustomer } from '@/shared/api/sessionApi'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { ManagePage } from '@/views/manage'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false },
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

const ManageRoute = ({ params }: PageProps<'/manage/[slug]'>) => (
  <Suspense fallback={<PageSkeleton />}>
    {params.then(({ slug }) => (
      <CabinetWithSession slug={slug} />
    ))}
  </Suspense>
)

export default ManageRoute
