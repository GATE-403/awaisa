import { getBusiness } from '@/common/api/serverApi'
import styles from './BusinessHomePage.module.css'
import { CategoryLinks } from './components/CategoryLinks/CategoryLinks'
import { MastersShelf } from './components/HomeShelves/MastersShelf'
import { PerksShelf } from './components/HomeShelves/PerksShelf'
import { PopularShelf } from './components/HomeShelves/PopularShelf'
import { VisitShelf } from './components/HomeShelves/VisitShelf'
import { StoreHero } from './components/StoreHero/StoreHero'

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
        <MastersShelf business={business} specialists={catalog.specialists} />
        <PerksShelf />
        <VisitShelf business={business} />
      </div>
    </main>
  )
}
