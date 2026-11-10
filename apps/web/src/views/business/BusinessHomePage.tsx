import { getBusiness } from '@/shared/api/serverApi'
import { MastersSection } from '@/views/business/ui/Place/MastersSection'
import { NextSlotCard } from '@/views/business/ui/Place/NextSlotCard'
import { PhotosSection } from '@/views/business/ui/Place/PhotosSection'
import styles from '@/views/business/ui/Place/Place.module.css'
import { PlaceHeader } from '@/views/business/ui/Place/PlaceHeader'
import { ServicesSection } from '@/views/business/ui/Place/ServicesSection'
import { VisitSection } from '@/views/business/ui/Place/VisitSection'

interface BusinessHomePageProps {
  slug: string
}

export const BusinessHomePage = async ({ slug }: BusinessHomePageProps) => {
  const { business, catalog } = await getBusiness(slug)
  const quickest = catalog.services.find((service) => service.isPopular) ?? catalog.services[0]

  return (
    <main className={styles.page}>
      <PlaceHeader business={business} catalog={catalog} />
      <div className={styles.body}>
        <div className={styles.main}>
          <ServicesSection business={business} catalog={catalog} />
          <MastersSection business={business} specialists={catalog.specialists} />
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
