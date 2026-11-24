import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getBusiness } from '@/shared/api/serverApi'
import { PLATFORM } from '@/shared/config/platform'
import { initLingui } from '@/shared/i18n/server'
import { buildBusinessMetadata, describeBusiness } from '@/shared/lib/seo/businessMetadata'
import { ServicesPage, ServicesSkeleton } from '@/views/services'

export const generateMetadata = async ({
  params,
}: PageProps<'/[lang]/[slug]/services'>): Promise<Metadata> => {
  const i18n = await initLingui()
  const { business } = await getBusiness((await params).slug)
  const name = business.name
  const platform = PLATFORM.name
  const about = describeBusiness(business, i18n)

  return buildBusinessMetadata({
    business,
    i18n,
    path: `/${business.slug}/services`,
    title: i18n._(msg`Services and prices - ${name} · ${platform}`),
    description: i18n._(msg`Services and prices at ${name}: ${about}`),
    fallbackImage: `/${business.slug}/opengraph-image`,
  })
}

const ServicesRoute = async ({ params }: PageProps<'/[lang]/[slug]/services'>) => {
  await initLingui()

  return (
    <Suspense fallback={<ServicesSkeleton />}>
      {params.then(({ slug }) => (
        <ServicesPage slug={slug} />
      ))}
    </Suspense>
  )
}

export default ServicesRoute
