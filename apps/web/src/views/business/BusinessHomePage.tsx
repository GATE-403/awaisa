import { msg } from '@lingui/core/macro'
import {
  getBusiness,
  getCertificateSale,
  listPromotions,
  listQuestions,
  listReviews,
  listServicePhotos,
  listSimilarPlaces,
  listSubscriptionPlans,
} from '@/shared/api/serverApi'
import { initLingui } from '@/shared/i18n/server'
import { breadcrumbJsonLd } from '@/shared/lib/seo/breadcrumbJsonLd'
import { buildBusinessJsonLd } from '@/shared/lib/seo/businessJsonLd'
import { JsonLd } from '@/shared/lib/seo/JsonLd'
import { GiftCertificateSection } from '@/views/business/ui/Place/GiftCertificateSection'
import { MastersSection } from '@/views/business/ui/Place/MastersSection'
import { NextSlotCard } from '@/views/business/ui/Place/NextSlotCard'
import { PhotosSection } from '@/views/business/ui/Place/PhotosSection'
import styles from '@/views/business/ui/Place/Place.module.css'
import { PlaceHeader } from '@/views/business/ui/Place/PlaceHeader'
import { PlaceTabs } from '@/views/business/ui/Place/PlaceTabs'
import { QuestionsSection } from '@/views/business/ui/Place/QuestionsSection'
import { ReviewsSection } from '@/views/business/ui/Place/ReviewsSection'
import { ServicesBrowser } from '@/views/business/ui/Place/ServicesBrowser'
import { SimilarPlaces } from '@/views/business/ui/Place/SimilarPlaces'
import { SubscriptionsSection } from '@/views/business/ui/Place/SubscriptionsSection'
import { VisitSection } from '@/views/business/ui/Place/VisitSection'

interface BusinessHomePageProps {
  slug: string
}

export const BusinessHomePage = async ({ slug }: BusinessHomePageProps) => {
  const i18n = await initLingui()
  const [{ business, catalog }, reviews, promotions, questions] = await Promise.all([
    getBusiness(slug),
    listReviews(slug),
    listPromotions(slug),
    listQuestions(slug),
  ])
  const [similar, servicePhotos, subscriptionPlans, certificateSale] = await Promise.all([
    listSimilarPlaces(slug),
    listServicePhotos(slug),
    listSubscriptionPlans(slug),
    getCertificateSale(slug),
  ])
  const quickest = catalog.services.find((service) => service.isPopular) ?? catalog.services[0]

  return (
    // The cover runs the full width of the window; everything else keeps the page column.
    <main className={styles.shell}>
      <JsonLd data={buildBusinessJsonLd({ business, catalog }, reviews, i18n)} />
      {/* The business bar shows this trail; search engines get it as markup. */}
      <JsonLd
        data={breadcrumbJsonLd([
          { label: i18n._(msg`Catalogue`), href: '/' },
          { label: business.name, href: `/${business.slug}` },
        ])}
      />
      <div className={styles.page}>
        <PlaceHeader
          business={business}
          catalog={catalog}
          reviews={reviews}
          promotions={promotions}
        />
        <PlaceTabs
          business={business}
          catalog={catalog}
          works={<PhotosSection business={business} />}
          services={
            <ServicesBrowser business={business} catalog={catalog} servicePhotos={servicePhotos} />
          }
          masters={<MastersSection business={business} specialists={catalog.specialists} />}
        />
        {/* Under the tabs, everything else about the place, as before: what to buy, what people
            say, what to ask, how to get there. */}
        <div className={styles.main}>
          <SubscriptionsSection business={business} plans={subscriptionPlans} />
          <ReviewsSection business={business} reviews={reviews} />
          {certificateSale.amounts.length > 0 && (
            <GiftCertificateSection business={business} amounts={certificateSale.amounts} />
          )}
          <QuestionsSection business={business} questions={questions} />
          <VisitSection business={business} />
        </div>
        {quickest && <NextSlotCard business={business} service={quickest} />}
      </div>
      {/* Set apart from the place itself, after everything about this place. */}
      <SimilarPlaces business={business} places={similar} />
    </main>
  )
}
