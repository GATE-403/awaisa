import { getBusiness, listPromotions, listReviews } from '@/shared/api/serverApi'
import { buildBusinessJsonLd } from '@/shared/lib/seo/businessJsonLd'
import { JsonLd } from '@/shared/lib/seo/JsonLd'
import { MastersSection } from '@/views/business/ui/Place/MastersSection'
import { NextSlotCard } from '@/views/business/ui/Place/NextSlotCard'
import { PhotosSection } from '@/views/business/ui/Place/PhotosSection'
import styles from '@/views/business/ui/Place/Place.module.css'
import { PlaceHeader } from '@/views/business/ui/Place/PlaceHeader'
import { PromotionsStrip } from '@/views/business/ui/Place/PromotionsStrip'
import { ReviewsSection } from '@/views/business/ui/Place/ReviewsSection'
import { ServicesBrowser } from '@/views/business/ui/Place/ServicesBrowser'
import { VisitSection } from '@/views/business/ui/Place/VisitSection'

interface BusinessHomePageProps {
  slug: string
}

export const BusinessHomePage = async ({ slug }: BusinessHomePageProps) => {
  const [{ business, catalog }, reviews, promotions] = await Promise.all([
    getBusiness(slug),
    listReviews(slug),
    listPromotions(slug),
  ])
  const quickest = catalog.services.find((service) => service.isPopular) ?? catalog.services[0]

  return (
    <main className={styles.page}>
      <JsonLd data={buildBusinessJsonLd({ business, catalog }, reviews)} />
      <PlaceHeader business={business} catalog={catalog} reviews={reviews} />
      <PromotionsStrip promotions={promotions} />
      <div className={styles.body}>
        <div className={styles.main}>
          <ServicesBrowser business={business} catalog={catalog} />
          <MastersSection business={business} specialists={catalog.specialists} />
          <ReviewsSection business={business} reviews={reviews} />
          <PhotosSection business={business} />
        </div>
        <div className={styles.aside}>
          {quickest && <NextSlotCard business={business} service={quickest} />}
          <VisitSection business={business} />
        </div>
      </div>
    </main>
  )
}
