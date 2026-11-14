'use client'

import { ArrowRight, MagnifyingGlass, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { BusinessTile } from '@/entities/business'
import { RecentVisits } from '@/features/rebook'
import { listOffersPage, searchBusinesses } from '@/shared/api/clientApi'
import type { BusinessCard, Offer } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import { pluralize } from '@/shared/lib/plural'
import styles from './HeaderSearch.module.css'

const QUICK_SEARCHES = ['Мужская стрижка', 'Маникюр', 'Окрашивание', 'Массаж', 'Брови']

const MIN_QUERY_LENGTH = 2
const SUGGEST_DELAY_MS = 200
const MAX_SUGGESTIONS = 6
const MAX_SERVICES = 4

type ServiceSuggestion = { name: string; minPrice: number; places: number }

// What people type is mostly a service («стрижка»), so services lead: one row per service name
// with its lowest price and how many places do it, before the places themselves.
const groupServices = (offers: Offer[]): ServiceSuggestion[] => {
  const byName = new Map<string, ServiceSuggestion & { slugs: Set<string> }>()
  for (const offer of offers) {
    const key = offer.name.trim().toLocaleLowerCase('ru')
    const known = byName.get(key)
    if (known) {
      known.minPrice = Math.min(known.minPrice, offer.price)
      known.slugs.add(offer.slug)
      known.places = known.slugs.size
    } else {
      byName.set(key, {
        name: offer.name,
        minPrice: offer.price,
        places: 1,
        slugs: new Set([offer.slug]),
      })
    }
  }
  return [...byName.values()]
    .sort((first, second) => second.places - first.places)
    .slice(0, MAX_SERVICES)
    .map(({ name, minPrice, places }) => ({ name, minPrice, places }))
}

// The store's search field lives in the header, like on a marketplace: type, see places, press Enter.
export const HeaderSearch = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const urlQuery = pathname === '/' ? (searchParams.get('q') ?? '') : ''
  const [draft, setDraft] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<BusinessCard[]>([])
  const [services, setServices] = useState<ServiceSuggestion[]>([])
  const query = draft ?? urlQuery
  const trimmed = query.trim()
  const hasQuery = trimmed.length >= MIN_QUERY_LENGTH

  useEffect(() => {
    if (!hasQuery || !isOpen) return

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      searchBusinesses(trimmed, controller.signal)
        .then((items) => setSuggestions(items.slice(0, MAX_SUGGESTIONS)))
        .catch(() => undefined)
      listOffersPage({ q: trimmed, offset: 0, limit: 40, sort: 'popular' }, controller.signal)
        .then((offers) => setServices(groupServices(offers)))
        .catch(() => undefined)
    }, SUGGEST_DELAY_MS)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [hasQuery, isOpen, trimmed])

  const close = () => setIsOpen(false)

  // Phones: open, the suggestions are a full screen of their own, so the page under them stays put.
  useEffect(() => {
    if (!isOpen || !window.matchMedia('(max-width: 767px)').matches) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [isOpen])

  const cancel = () => {
    close()
    setDraft('')
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }

  // A tap anywhere outside closes the suggestions (blur alone misses taps on non-focusable areas).
  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const search = (value: string) => {
    close()
    setDraft(null)
    router.push(`/?${new URLSearchParams({ q: value })}`)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (trimmed) search(trimmed)
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: closes the suggestions when focus leaves the search or on Escape
    <div
      ref={rootRef}
      className={styles.root}
      onBlur={(event) => {
        if (event.relatedTarget && !rootRef.current?.contains(event.relatedTarget)) close()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') close()
      }}
    >
      <search className={styles.search} data-open={isOpen || undefined}>
        <form className={styles.form} onSubmit={handleSubmit} data-open={isOpen || undefined}>
          <MagnifyingGlass className={styles.icon} weight='bold' aria-hidden />
          <input
            type='search'
            className={styles.input}
            value={query}
            onChange={(event) => {
              setDraft(event.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder='Услуга, салон или мастер'
            aria-label='Поиск салонов и мастеров'
            aria-describedby={isOpen ? listId : undefined}
            enterKeyHint='search'
            autoComplete='off'
          />
          {query && (
            <button
              type='button'
              className={styles.clear}
              aria-label='Очистить поиск'
              onClick={() => {
                setDraft('')
                setSuggestions([])
              }}
            >
              <X weight='bold' aria-hidden />
            </button>
          )}
          <button type='submit' className={styles.submit} aria-label='Найти'>
            <MagnifyingGlass weight='bold' aria-hidden />
          </button>
        </form>
        {/* Phones, like iOS search: «Отмена» beside the field while the suggestions are open. */}
        {isOpen && (
          <button type='button' className={styles.cancel} onClick={cancel}>
            Отмена
          </button>
        )}
      </search>

      {isOpen && (
        <div id={listId} className={styles.panel}>
          {hasQuery ? (
            <section aria-label='Подсказки'>
              {services.length > 0 && (
                <>
                  <p className={styles.heading}>Услуги</p>
                  <ul className={styles.list}>
                    {services.map((service) => (
                      <li key={service.name}>
                        <button
                          type='button'
                          className={styles.place}
                          onClick={() => search(service.name)}
                        >
                          <MagnifyingGlass className={styles.quickIcon} aria-hidden />
                          <span className={styles.placeText}>
                            <span className={styles.placeName}>{service.name}</span>
                            <span className={styles.placeMeta}>
                              от {formatPrice(service.minPrice)} ·{' '}
                              {pluralize(service.places, ['место', 'места', 'мест'])}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {(suggestions.length > 0 || services.length === 0) && (
                <p className={styles.heading}>
                  {suggestions.length > 0 ? 'Места' : 'Нажмите Enter, чтобы искать по услугам'}
                </p>
              )}
              <ul className={styles.list}>
                {suggestions.map((business) => (
                  <li key={business.slug}>
                    <NextLink href={`/${business.slug}`} className={styles.place} onClick={close}>
                      <BusinessTile name={business.name} logoUrl={business.logoUrl} size='sm' />
                      <span className={styles.placeText}>
                        <span className={styles.placeName}>{business.name}</span>
                        <span className={styles.placeMeta}>
                          {[getKindLabel(business.kind), business.address]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </NextLink>
                  </li>
                ))}
                <li>
                  <button type='button' className={styles.all} onClick={() => search(trimmed)}>
                    <ArrowRight weight='bold' aria-hidden />
                    Все услуги и места по «{trimmed}»
                  </button>
                </li>
              </ul>
            </section>
          ) : (
            <>
              <RecentVisits onSelect={close} />
              <section aria-label='Часто ищут'>
                <p className={styles.heading}>Часто ищут</p>
                <ul className={styles.list}>
                  {QUICK_SEARCHES.map((item) => (
                    <li key={item}>
                      <button type='button' className={styles.quick} onClick={() => search(item)}>
                        <MagnifyingGlass className={styles.quickIcon} aria-hidden />
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  )
}
