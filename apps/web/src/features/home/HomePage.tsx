import { Skeleton } from '@awaisa/ui/Skeleton'
import { Suspense } from 'react'
import { CategoryLinks } from './components/CategoryLinks/CategoryLinks'
import shelves from './components/HomeShelves/HomeShelves.module.css'
import { MastersShelf } from './components/HomeShelves/MastersShelf'
import { PerksShelf } from './components/HomeShelves/PerksShelf'
import { PopularShelf } from './components/HomeShelves/PopularShelf'
import { VisitShelf } from './components/HomeShelves/VisitShelf'
import { StoreHero } from './components/StoreHero/StoreHero'
import styles from './HomePage.module.css'

export const HomePage = () => (
  <main className={styles.page}>
    <StoreHero />
    <Suspense fallback={<div className={styles.categoriesPlaceholder} />}>
      <CategoryLinks />
    </Suspense>
    <div className={styles.shelves}>
      <Suspense fallback={<Skeleton className={shelves.skeleton} />}>
        <PopularShelf />
      </Suspense>
      <Suspense fallback={<Skeleton className={shelves.skeleton} />}>
        <MastersShelf />
      </Suspense>
      <PerksShelf />
      <VisitShelf />
    </div>
  </main>
)
