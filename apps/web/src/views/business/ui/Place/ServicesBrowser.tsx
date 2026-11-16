'use client'

import { Input } from '@awaisa/ui/Input'
import { MagnifyingGlass, X } from '@phosphor-icons/react/ssr'
import { useEffect, useRef, useState } from 'react'
import { NextFreeProvider } from '@/entities/business'
import { OfferCard } from '@/entities/offer'
import type { Business, Catalog, Offer, Service } from '@/shared/api/types'
import { useRootFlag } from '@/shared/lib/hooks/useRootFlag'
import { pluralize } from '@/shared/lib/plural'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
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
const PopularCard = ({ offer, isHit }: ServiceCardProps) => (
  <li>
    <OfferCard
      offer={offer}
      isHit={isHit}
      isPlaceHidden
      linkLabel={`Часто выбирают: ${offer.name}`}
    />
  </li>
)

// The heart of the page: the menu. Popular first, then every service by category, with a filter
// and a search for long menus; every row books that service.
export const ServicesBrowser = ({
  business,
  catalog,
  servicePhotos = {},
}: ServicesBrowserProps) => {
  const [category, setCategory] = useState(ALL)
  const [query, setQuery] = useState('')
  // The tabs row continues the business bar: the bar drops its hairline (one line under both).
  const menuHeadRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)
  useRootFlag(catalog.categories.length > 1 && isStuck ? 'category-nav' : null)

  // The tabs lie on the page; only once pinned under the business bar do they take its material,
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
      <section id='services' className={styles.section} aria-labelledby='place-services'>
        <div className={styles.sectionHead}>
          <h2 id='place-services' className={styles.sectionTitle}>
            Услуги и цены
          </h2>
          <span className={styles.sectionCount}>
            {pluralize(catalog.services.length, ['услуга', 'услуги', 'услуг'])}
          </span>
        </div>

        {catalog.services.length >= SEARCH_FROM && (
          <label className={styles.search}>
            <MagnifyingGlass weight='bold' aria-hidden className={styles.searchIcon} />
            <Input
              type='search'
              aria-label='Найти услугу'
              placeholder='Найти услугу'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={styles.searchInput}
            />
            {query && (
              <button
                type='button'
                className={styles.searchClear}
                onClick={() => setQuery('')}
                aria-label='Очистить поиск'
              >
                <X weight='bold' aria-hidden />
              </button>
            )}
          </label>
        )}
        {/* Only the category tabs stay pinned under the business bar; the search scrolls away. */}
        {catalog.categories.length > 1 && (
          <div ref={menuHeadRef} className={styles.menuHead} data-stuck={isStuck || undefined}>
            {/* The app's one tab style; each tab says how many services it holds. */}
            <TextTabs
              label='Разделы услуг'
              items={[{ id: ALL, name: 'Все' }, ...catalog.categories].map((item) => ({
                label: item.name,
                isActive: category === item.id,
                onSelect: () => setCategory(item.id),
                count:
                  item.id === ALL
                    ? catalog.services.length
                    : catalog.services.filter((service) => service.categoryId === item.id).length,
              }))}
            />
          </div>
        )}

        {hasPopular && (
          <div className={styles.group}>
            <SectionCaption>Часто выбирают</SectionCaption>
            <ul className={styles.serviceGrid}>
              {popular.map((service, index) => (
                <PopularCard key={service.id} offer={toOffer(service)} isHit={index === 0} />
              ))}
            </ul>
          </div>
        )}
        {needle && groups.length > 0 && (
          <p className={styles.found} aria-live='polite'>
            Нашли{' '}
            {pluralize(
              groups.reduce((sum, group) => sum + group.services.length, 0),
              ['услугу', 'услуги', 'услуг'],
            )}
          </p>
        )}
        {groups.length === 0 && (
          <p className={styles.nothing}>
            Ничего не нашли — попробуйте другое слово или раздел «Все».
          </p>
        )}
        {groups.map(({ category: group, services }) => (
          <div key={group.id} className={styles.group}>
            {/* With «Часто выбирают» above, the rest always gets a heading so the two lists read apart. */}
            {(catalog.categories.length > 1 || needle || hasPopular) && (
              <SectionCaption>
                {catalog.categories.length > 1 ? group.name : 'Все услуги'}
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
      </section>
    </NextFreeProvider>
  )
}
