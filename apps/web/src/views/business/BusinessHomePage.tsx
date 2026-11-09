import { getBusiness } from '@/shared/api/serverApi'
import { CategoryLinks } from '@/views/business/ui/CategoryLinks/CategoryLinks'
import { MastersShelf } from '@/views/business/ui/HomeShelves/MastersShelf'
import { PerksShelf } from '@/views/business/ui/HomeShelves/PerksShelf'
import { PopularShelf } from '@/views/business/ui/HomeShelves/PopularShelf'
import { VisitShelf } from '@/views/business/ui/HomeShelves/VisitShelf'
import { WorkShelf } from '@/views/business/ui/HomeShelves/WorkShelf'
import { StoreHero } from '@/views/business/ui/StoreHero/StoreHero'
import styles from './BusinessHomePage.module.css'

interface BusinessHomePageProps {
  slug: string
}

export const BusinessHomePage = async ({ slug }: BusinessHomePageProps) => {
  const { business, catalog } = await getBusiness(slug)

  return (
    <main className={styles.page}>
      <StoreHero business={business} services={catalog.services} />
      <CategoryLinks business={business} catalog={catalog} />
      <div className={styles.shelves}>
        <PopularShelf business={business} catalog={catalog} />
        <WorkShelf business={business} />
        <MastersShelf business={business} specialists={catalog.specialists} />
        <PerksShelf />
        <VisitShelf business={business} />
      </div>
    </main>
  )
}
