import { Suspense } from 'react'
import { getBusiness, PRERENDER_SLUG } from '@/shared/api/serverApi'
import { initLingui } from '@/shared/i18n/server'
import { BusinessBar, BusinessBarSkeleton } from '@/widgets/BusinessBar'

const BusinessBarSlot = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { business } = await getBusiness((await params).slug)

  return <BusinessBar business={business} />
}

// No slug is known at build time: one that never exists keeps the build valid, and every real
// place is rendered on its first visit and then served whole from the cache (ISR with Cache
// Components), redrawn when its data's cacheLife runs out or an owner's save calls updateTag.
// Without it each visit rendered the whole page again: the first ceiling under load.
export const generateStaticParams = async () => [{ slug: PRERENDER_SLUG }]

// Every page of a business (overview, services, booking) shares its local navigation bar.
const BusinessLayout = async ({ children, params }: LayoutProps<'/[lang]/[slug]'>) => {
  await initLingui()

  return (
    <>
      <Suspense fallback={<BusinessBarSkeleton />}>
        <BusinessBarSlot params={params} />
      </Suspense>
      {children}
    </>
  )
}

export default BusinessLayout
