import {
  getBusiness,
  listBusinesses,
  listPromotions,
  listQuestions,
  listReviews,
  listServicePhotos,
} from '@/shared/api/serverApi'
import { buildBusinessJsonLd } from '@/shared/lib/seo/businessJsonLd'
import { JsonLd } from '@/shared/lib/seo/JsonLd'
import { MastersSection } from '@/views/business/ui/Place/MastersSection'
import { NextSlotCard } from '@/views/business/ui/Place/NextSlotCard'
import { PhotosSection } from '@/views/business/ui/Place/PhotosSection'
import styles from '@/views/business/ui/Place/Place.module.css'
import { PlaceHeader } from '@/views/business/ui/Place/PlaceHeader'
import { PromotionsStrip } from '@/views/business/ui/Place/PromotionsStrip'
import { QuestionsSection } from '@/views/business/ui/Place/QuestionsSection'
import { ReviewsSection } from '@/views/business/ui/Place/ReviewsSection'
import { ServicesBrowser } from '@/views/business/ui/Place/ServicesBrowser'
import { SimilarPlaces } from '@/views/business/ui/Place/SimilarPlaces'
import { VisitSection } from '@/views/business/ui/Place/VisitSection'

interface BusinessHomePageProps {
  slug: string
}

export const BusinessHomePage = async ({ slug }: BusinessHomePageProps) => {
  const [{ business, catalog }, reviews, promotions, questions] = await Promise.all([
    getBusiness(slug),
    listReviews(slug),
    listPromotions(slug),
    listQuestions(slug),
  ])
  // Others of the same kind for «Похожие места»; the page renders without them.
  const [similar, servicePhotos] = await Promise.all([
    listBusinesses(business.kind, undefined).catch(() => []),
    listServicePhotos(slug),
  ])
  const quickest = catalog.services.find((service) => service.isPopular) ?? catalog.services[0]

  return (
    // The cover runs the full width of the window; everything else keeps the page column.
    <main className={styles.shell}>
      <JsonLd data={buildBusinessJsonLd({ business, catalog }, reviews)} />
      <PlaceHeader business={business} catalog={catalog} reviews={reviews} />
      <div className={styles.page}>
        <PromotionsStrip promotions={promotions} />
        <div className={styles.body}>
          <div className={styles.main}>
            <ServicesBrowser business={business} catalog={catalog} servicePhotos={servicePhotos} />
            <MastersSection business={business} specialists={catalog.specialists} />
            <ReviewsSection business={business} reviews={reviews} />
            <PhotosSection business={business} />
            <QuestionsSection business={business} questions={questions} />
          </div>
          <div className={styles.aside}>
            {quickest && <NextSlotCard business={business} service={quickest} />}
            <VisitSection business={business} />
          </div>
        </div>
      </div>
      {/* Set apart from the place itself: a band of its own, after everything about this place. */}
      <SimilarPlaces business={business} places={similar} />
    </main>
  )
}
