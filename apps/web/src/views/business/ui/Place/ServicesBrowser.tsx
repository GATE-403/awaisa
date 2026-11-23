'use client'

import { useEffect, useRef, useState } from 'react'
import { NextFreeProvider } from '@/entities/business'
import { OfferCard } from '@/entities/offer'
import type { Business, Catalog, Offer, Service } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { useRootFlag } from '@/shared/lib/hooks/useRootFlag'
import chipStyles from '@/shared/ui/Chip/Chip.module.css'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { SearchField } from '@/shared/ui/SearchField/SearchField'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import styles from './Place.module.css'

interface ServicesBrowserProps {
  business: Business
  catalog: Catalog
  /** A work photo per service (tagged in the cabinet); the place's cover stands in otherwise. */
  servicePhotos?: Record<string, string>
}

interface ServiceCardProps {
  offer: Offer
  isHit: boolean
}

const ALL = 'all'
const SEARCH_FROM = 7
const POPULAR_LIMIT = 3

// What people book most: the catalog's card with the fire mark. Its free time comes from the
// place's one next-free answer (NextFreeProvider), not a request per card; «Ближайшее окно»
// links straight to a time.
const PopularCard = ({ offer, isHit }: ServiceCardProps) => {
  const t = useT()

  return (
    <li>
      <OfferCard
        offer={offer}
        isHit={isHit}
        isPlaceHidden
        linkLabel={t('Часто выбирают: {name}', { name: offer.name })}
      />
    </li>
  )
}

// The «Услуги» tab, the heart of the page: popular first, then every service by category, with
// chips and a search for long menus; every card books that service.
export const ServicesBrowser = ({
  business,
  catalog,
  servicePhotos = {},
}: ServicesBrowserProps) => {
  const t = useT()
  const [category, setCategory] = useState(ALL)
  const [query, setQuery] = useState('')
  // The chips row continues the business bar: the bar drops its hairline (one line under both).
  const menuHeadRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)
  useRootFlag(catalog.categories.length > 1 && isStuck ? 'category-nav' : null)

  // The chips lie on the page; only once pinned under the business bar do they take its material,
  // so the menu scrolling under them stays readable.
  useEffect(() => {
    const head = menuHeadRef.current
    if (!head) return
    // Pinned, the bar sits a pixel above a root cut 2px below its sticky top: no longer whole.
    const top = Number.parseFloat(getComputedStyle(head).top) || 0
    const observer = new IntersectionObserver(
      ([entry]) =>
        setIsStuck(
          entry ? entry.intersectionRatio < 1 && entry.boundingClientRect.top < top + 2 : false,
        ),
      { rootMargin: `-${Math.ceil(top) + 2}px 0px 0px 0px`, threshold: 1 },
    )
    observer.observe(head)
    return () => observer.disconnect()
  }, [])
  const needle = query.trim().toLowerCase()
  const popular = catalog.services.filter((service) => service.isPopular).slice(0, POPULAR_LIMIT)
  const groups = catalog.categories
    .filter((item) => category === ALL || item.id === category)
    .map((item) => ({
      category: item,
      services: catalog.services.filter(
        (service) =>
          service.categoryId === item.id &&
          (!needle ||
            service.name.toLowerCase().includes(needle) ||
            service.description.toLowerCase().includes(needle)),
      ),
    }))
    .filter((group) => group.services.length > 0)
  const rated = catalog.specialists.filter((specialist) => specialist.rating !== null)
  const rating =
    rated.length > 0
      ? rated.reduce((sum, specialist) => sum + (specialist.rating ?? 0), 0) / rated.length
      : null
  // The services as the catalog shows them, so a card looks the same everywhere.
  const toOffer = (service: Service): Offer => ({
    id: service.id,
    name: service.name,
    price: service.price,
    durationMinutes: service.durationMinutes,
    isPopular: service.isPopular,
    slug: business.slug,
    businessName: business.name,
    kind: business.kind,
    coverUrl: servicePhotos[service.id] ?? business.coverUrl ?? null,
    rating,
    address: business.address ?? null,
    discountPercent: null,
  })
  const isBrowsing = category === ALL && !needle
  const hasPopular = isBrowsing && popular.length > 0

  return (
    <NextFreeProvider slugs={[business.slug]}>
      <div className={styles.menu}>
        {catalog.services.length >= SEARCH_FROM && (
          <SearchField value={query} onChange={setQuery} placeholder={t('Найти услугу')} />
        )}
        {/* Only the category chips stay pinned under the business bar; the search scrolls away. */}
        {catalog.categories.length > 1 && (
          <div ref={menuHeadRef} className={styles.menuHead} data-stuck={isStuck || undefined}>
            {/* The app's filter chips (the booking form's too), each with how many it holds:
                a second row of tabs under the page's own read as one more level of pages. */}
            {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would add a legend over the row. */}
            <div className={styles.chips} role='group' aria-label={t('Разделы услуг')}>
              {[{ id: ALL, name: t('Все') }, ...catalog.categories].map((item) => (
                <button
                  key={item.id}
                  type='button'
                  className={chipStyles.chip}
                  aria-pressed={category === item.id}
                  onClick={() => setCategory(item.id)}
                >
                  {item.name}
                  <span className={chipStyles.count}>
                    {item.id === ALL
                      ? catalog.services.length
                      : catalog.services.filter((service) => service.categoryId === item.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {hasPopular && (
          <div className={styles.group}>
            <SectionCaption>{t('Часто выбирают')}</SectionCaption>
            <ul className={styles.serviceGrid}>
              {popular.map((service, index) => (
                <PopularCard key={service.id} offer={toOffer(service)} isHit={index === 0} />
              ))}
            </ul>
          </div>
        )}
        {needle && groups.length > 0 && (
          <p className={styles.found} aria-live='polite'>
            {t('Нашли {count}', {
              count: t.count(
                groups.reduce((sum, group) => sum + group.services.length, 0),
                ['услугу', 'услуги', 'услуг'],
              ),
            })}
          </p>
        )}
        {groups.length === 0 && (
          <EmptyState
            variant='inline'
            text={t('Ничего не нашли: попробуйте другое слово или раздел «Все».')}
          />
        )}
        {groups.map(({ category: group, services }) => (
          <div key={group.id} className={styles.group}>
            {/* With «Часто выбирают» above, the rest always gets a heading so the two lists read apart. */}
            {(catalog.categories.length > 1 || needle || hasPopular) && (
              <SectionCaption>
                {catalog.categories.length > 1 ? group.name : t('Все услуги')}
              </SectionCaption>
            )}
            <ul className={styles.serviceGrid}>
              {services.map((service) => (
                <li key={service.id}>
                  <OfferCard offer={toOffer(service)} isPlaceHidden />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </NextFreeProvider>
  )
}
