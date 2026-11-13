'use client'

import { Input } from '@awaisa/ui/Input'
import { MagnifyingGlass, X } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { NextFreeProvider } from '@/entities/business'
import { OfferCard } from '@/entities/offer'
import type { Business, Catalog, Offer, Service } from '@/shared/api/types'
import { useRootFlag } from '@/shared/lib/hooks/useRootFlag'
import { pluralize } from '@/shared/lib/plural'
import chip from '@/shared/ui/Chip/Chip.module.css'
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
  // The chips row continues the business bar: the bar drops its hairline (one line under both).
  useRootFlag(catalog.categories.length > 1 ? 'category-nav' : null)
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
        {/* Only the category chips stay pinned under the business bar; the search scrolls away. */}
        {catalog.categories.length > 1 && (
          <div className={styles.menuHead}>
            <fieldset className={styles.chips}>
              <legend className={styles.srOnly}>Разделы услуг</legend>
              {[{ id: ALL, name: 'Все' }, ...catalog.categories].map((item) => {
                const count =
                  item.id === ALL
                    ? catalog.services.length
                    : catalog.services.filter((service) => service.categoryId === item.id).length
                return (
                  <button
                    key={item.id}
                    type='button'
                    className={chip.chip}
                    aria-pressed={category === item.id}
                    onClick={() => setCategory(item.id)}
                  >
                    {item.name}
                    {/* How many in each, so the choice says what it holds. */}
                    <span className={chip.count}>{count}</span>
                  </button>
                )
              })}
            </fieldset>
          </div>
        )}

        {hasPopular && (
          <div className={styles.group}>
            <h3 className={styles.groupTitle}>Часто выбирают</h3>
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
              <h3 className={styles.groupTitle}>
                {catalog.categories.length > 1 ? group.name : 'Все услуги'}
              </h3>
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
