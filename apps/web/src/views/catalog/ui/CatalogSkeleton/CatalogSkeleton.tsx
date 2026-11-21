import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import { ForYouShelfPlaceholder } from '@/features/forYou'
import { T } from '@/shared/i18n'
import { Block, Picture, TextLine } from '@/shared/ui/Placeholder/Placeholder'
import pageStyles from '../../CatalogPage.module.css'
import resultStyles from '../CatalogResults/CatalogResults.module.css'
import { FirstVisitNote } from '../FirstVisitNote/FirstVisitNote'
import feedStyles from '../OffersFeed/OffersFeed.module.css'
import chipStyles from '../SearchChips/SearchChips.module.css'
import styles from './CatalogSkeleton.module.css'

const CARDS = 8

// The catalog while it streams in, built from the page's own classes: «Для вас» with its frames,
// the results' tabs and sorting, then the grid of 3:4 service cards — the same sizes, so the
// page fills in place instead of jumping.
export const CatalogSkeleton = () => (
  <div className={pageStyles.contained} data-page-skeleton='' aria-busy='true'>
    <FirstVisitNote />
    <ForYouShelfPlaceholder
      headAction={
        <NextLink href='/top' className={pageStyles.topLink}>
          <T>Рейтинг ›</T>
        </NextLink>
      }
    />
    {/* «Часто ищут» — wide screens only, like the real row. */}
    <div className={chipStyles.row} aria-hidden='true'>
      <span className={chipStyles.label}>
        <T>Часто ищут</T>
      </span>
      {[12, 9, 14, 10, 11].map((chars) => (
        <Block key={chars} className={styles.chip} style={{ '--chars': chars } as CSSProperties} />
      ))}
    </div>
    <section className={resultStyles.results} aria-label='Загружаем услуги'>
      {/* Browsing everything, the results' heading is visually hidden but keeps its row. */}
      <div className={resultStyles.header} />
      <div className={resultStyles.toolbar}>
        <span className={styles.tabs}>
          <TextLine chars={11} />
          <TextLine chars={9} />
        </span>
        <span className={styles.sort}>
          <TextLine chars={12} />
        </span>
      </div>
      <ul className={feedStyles.grid} aria-hidden='true'>
        {Array.from({ length: CARDS }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: identical placeholders
          <li key={index}>
            <Picture className={feedStyles.placeholder} />
          </li>
        ))}
      </ul>
    </section>
  </div>
)
