'use client'

import { Input } from '@awaisa/ui/Input'
import { MagnifyingGlass } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useState } from 'react'
import { formatDuration, formatPrice, useNextSlot } from '@/entities/booking'
import type { Business, Catalog, Service } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import styles from './Place.module.css'

interface ServicesBrowserProps {
  business: Business
  catalog: Catalog
}

interface PopularCardProps {
  business: Business
  service: Service
}

const ALL = 'all'
const SEARCH_FROM = 7
const POPULAR_LIMIT = 3

const bookHref = (business: Business, service: Service) =>
  `/${business.slug}/book?service=${service.id}`

// What people book most, as the same rows as the menu: the first free time on the right is the link's promise.
const PopularRow = ({ business, service }: PopularCardProps) => {
  const slot = useNextSlot(service.id)

  return (
    <li>
      <NextLink
        href={
          slot
            ? `${bookHref(business, service)}&specialist=any&date=${slot.date}&time=${slot.time}`
            : bookHref(business, service)
        }
        className={styles.serviceRow}
        aria-label={`Часто выбирают: ${service.name}`}
      >
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>{service.name}</span>
          <span className={styles.rowMeta}>
            {formatDuration(service.durationMinutes)} · {formatPrice(service.price)}
          </span>
        </span>
        <span className={styles.popularSlot} data-loading={slot === undefined || undefined}>
          {slot === undefined ? '…' : slot === null ? 'Скоро' : `${slot.dayLabel}, ${slot.time}`}
        </span>
      </NextLink>
    </li>
  )
}

// The heart of the page: the menu. Popular first, then every service by category, with a filter
// and a search for long menus; every row books that service.
export const ServicesBrowser = ({ business, catalog }: ServicesBrowserProps) => {
  const [category, setCategory] = useState(ALL)
  const [query, setQuery] = useState('')
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
  const isBrowsing = category === ALL && !needle

  return (
    <section id='services' className={styles.section} aria-labelledby='place-services'>
      <div className={styles.sectionHead}>
        <h2 id='place-services' className={styles.sectionTitle}>
          Услуги и цены
        </h2>
        <span className={styles.sectionCount}>
          {pluralize(catalog.services.length, ['услуга', 'услуги', 'услуг'])}
        </span>
      </div>

      <div className={styles.menuHead}>
        <div className={styles.filters}>
          {catalog.categories.length > 1 && (
            <fieldset className={styles.chips}>
              <legend className={styles.srOnly}>Разделы услуг</legend>
              {[{ id: ALL, name: 'Все' }, ...catalog.categories].map((item) => (
                <button
                  key={item.id}
                  type='button'
                  className={styles.chip}
                  aria-pressed={category === item.id}
                  onClick={() => setCategory(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </fieldset>
          )}
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
            </label>
          )}
        </div>
      </div>

      {isBrowsing && popular.length > 0 && (
        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Часто выбирают</h3>
          <ul className={styles.list}>
            {popular.map((service) => (
              <PopularRow key={service.id} business={business} service={service} />
            ))}
          </ul>
        </div>
      )}
      {groups.length === 0 && (
        <p className={styles.nothing}>
          Ничего не нашли — попробуйте другое слово или раздел «Все».
        </p>
      )}
      {groups.map(({ category: group, services }) => (
        <div key={group.id} className={styles.group}>
          {(catalog.categories.length > 1 || needle) && (
            <h3 className={styles.groupTitle}>{group.name}</h3>
          )}
          <ul className={styles.list}>
            {services.map((service) => (
              <li key={service.id}>
                <NextLink href={bookHref(business, service)} className={styles.serviceRow}>
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{service.name}</span>
                    <span className={styles.rowMeta}>
                      {formatDuration(service.durationMinutes)}
                      {service.description && ` · ${service.description}`}
                    </span>
                  </span>
                  <span className={styles.rowPrice}>{formatPrice(service.price)}</span>
                </NextLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
