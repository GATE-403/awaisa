import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageSkeleton } from '@/shared/ui/PageSkeleton/PageSkeleton'
import { ManagePage } from '@/views/manage'

export const metadata: Metadata = {
  title: 'Кабинет',
  robots: { index: false },
}

const ManageRoute = ({ params }: PageProps<'/manage/[slug]'>) => (
  <Suspense fallback={<PageSkeleton />}>
    {params.then(({ slug }) => (
      <ManagePage slug={slug} />
    ))}
  </Suspense>
)

export default ManageRoute
