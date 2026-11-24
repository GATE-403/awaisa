import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getBusiness } from '@/shared/api/serverApi'
import { initLingui } from '@/shared/i18n/server'
import { buildBusinessMetadata } from '@/shared/lib/seo/businessMetadata'
import { BusinessHomePage, PlaceSkeleton } from '@/views/business'

export const generateMetadata = async ({
  params,
}: PageProps<'/[lang]/[slug]'>): Promise<Metadata> => {
  const i18n = await initLingui()
  const { business } = await getBusiness((await params).slug)
  const name = business.name

  return buildBusinessMetadata({
    business,
    i18n,
    path: `/${business.slug}`,
    title: i18n._(msg`${name} - online booking`),
  })
}

const BusinessRoute = async ({ params }: PageProps<'/[lang]/[slug]'>) => {
  await initLingui()

  return (
    <Suspense fallback={<PlaceSkeleton />}>
      {params.then(({ slug }) => (
        <BusinessHomePage slug={slug} />
      ))}
    </Suspense>
  )
}

export default BusinessRoute
