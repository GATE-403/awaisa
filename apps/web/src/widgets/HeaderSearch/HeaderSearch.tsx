'use client'

import { msg, ph, plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import {
  ArrowRight,
  ClockCounterClockwise,
  MagnifyingGlass,
  NavigationArrow,
  X,
} from '@phosphor-icons/react/ssr'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { BusinessTile, PersonAvatar } from '@/entities/business'
import { PlacePickerSheet } from '@/features/myPlace'
import { RecentVisits } from '@/features/rebook'
import { listOffersPage, searchBusinesses, searchMasters } from '@/shared/api/clientApi'
import type { BusinessCard, MasterSuggestion, Offer } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import { useFormat } from '@/shared/i18n'
import { Link as NextLink, usePathname, useRouter } from '@/shared/i18n/navigation'
import { myPlaceLabel, useMyPlace } from '@/shared/lib/myPlace'
import {
  readRecentSearches,
  rememberSearch,
  writeRecentSearches,
} from '@/shared/lib/recentSearches'
import { trackStep } from '@/shared/lib/telemetry'
import { CatalogQuery } from '@/shared/ui/CatalogQuery/CatalogQuery'
import styles from './HeaderSearch.module.css'

// The search itself is the English words; the button shows them in the page's language.
const QUICK_SEARCHES = [
  { query: "Men's haircut", label: msg`Men's haircut` },
  { query: 'Manicure', label: msg`Manicure` },
  { query: 'Colouring', label: msg`Colouring` },
  { query: 'Massage', label: msg`Massage` },
  { query: 'Brows', label: msg`Brows` },
]

// What the empty field suggests, one at a time: real searches, so the field reads as “ask me”
// rather than a blank box. They change every few seconds (the words only; still with reduced motion).
const HINTS = [
  msg`manicure nearby`,
  msg`haircut today`,
  msg`barber`,
  msg`back massage`,
  msg`brows and lashes`,
  msg`hair colouring`,
]
const FIRST_HINT = msg`manicure nearby`
const HINT_MS = 3200

const MIN_QUERY_LENGTH = 2
const SUGGEST_DELAY_MS = 200
const MAX_SUGGESTIONS = 6
const MAX_SERVICES = 4

type ServiceSuggestion = { name: string; minPrice: number; places: number }

// What people type is mostly a service ("haircut"), so services lead: one row per service name
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

interface HeaderSearchFieldProps {
  /** What the catalog searched for (`?q=` on “/”), shown in the field. */
  urlQuery: string
}

// The store's search field lives in the header, like on a marketplace: type, see places, press Enter.
const HeaderSearchField = ({ urlQuery: catalogQuery }: HeaderSearchFieldProps) => {
  const format = useFormat()
  const { t } = useLingui()
  const myPlace = useMyPlace()
  const [isPicking, setIsPicking] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const urlQuery = pathname === '/' ? catalogQuery : ''
  const [draft, setDraft] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<BusinessCard[]>([])
  const [services, setServices] = useState<ServiceSuggestion[]>([])
  const [masters, setMasters] = useState<MasterSuggestion[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const query = draft ?? urlQuery
  const trimmed = query.trim()
  const hasQuery = trimmed.length >= MIN_QUERY_LENGTH

  useEffect(() => {
    if (query) return
    const interval = window.setInterval(
      () => setHintIndex((index) => (index + 1) % HINTS.length),
      HINT_MS,
    )
    return () => window.clearInterval(interval)
  }, [query])

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
      searchMasters(trimmed, controller.signal)
        .then(setMasters)
        .catch(() => undefined)
    }, SUGGEST_DELAY_MS)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [hasQuery, isOpen, trimmed])

  // The device's own recent searches, read each time the panel opens.
  useEffect(() => {
    if (isOpen) setRecent(readRecentSearches())
  }, [isOpen])

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
    rememberSearch(value)
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
          <MagnifyingGlass className={styles.icon} aria-hidden />
          <span className={styles.field}>
            {!query && (
              <span className={styles.hint} aria-hidden>
                {t`Find`}{' '}
                <span key={hintIndex} className={styles.hintWord}>
                  {t(HINTS[hintIndex] ?? FIRST_HINT)}
                </span>
              </span>
            )}
            <input
              type='search'
              className={styles.input}
              value={query}
              onChange={(event) => {
                setDraft(event.target.value)
                setIsOpen(true)
                if (event.target.value.trim()) trackStep('search_typed')
              }}
              onFocus={() => {
                setIsOpen(true)
                trackStep('search_open')
              }}
              aria-label={t`Search salons and specialists`}
              aria-describedby={isOpen ? listId : undefined}
              enterKeyHint='search'
              autoComplete='off'
            />
          </span>
          {query && (
            <button
              type='button'
              className={styles.clear}
              aria-label={t`Clear search`}
              onClick={() => {
                setDraft('')
                setSuggestions([])
              }}
            >
              <X aria-hidden />
            </button>
          )}
          {!isOpen && pathname !== '/map' && (
            // Where results are counted from: the saved place, or a question until there is one.
            // Not on /map, whose list has its own Where are you? beside the places it sorts.
            <button
              type='button'
              className={styles.where}
              onClick={() => setIsPicking(true)}
              aria-label={
                myPlace
                  ? t`Location: ${ph({ place: myPlaceLabel(myPlace, t) })}. Change`
                  : t`Where are you? Set your location`
              }
            >
              <NavigationArrow aria-hidden />
              <span className={styles.whereLabel}>
                {myPlace ? myPlaceLabel(myPlace, t) : t`Where are you?`}
              </span>
            </button>
          )}
          <button type='submit' className={styles.submit} aria-label={t`Find`}>
            <MagnifyingGlass aria-hidden />
          </button>
        </form>
        {/* Phones, like iOS search: Cancel beside the field while the suggestions are open. */}
        {isOpen && (
          <button type='button' className={styles.cancel} onClick={cancel}>
            {t`Cancel`}
          </button>
        )}
      </search>
      {isPicking && <PlacePickerSheet onClose={() => setIsPicking(false)} />}

      {isOpen && (
        <div id={listId} className={styles.panel}>
          {hasQuery ? (
            <section aria-label={t`Suggestions`}>
              {services.length > 0 && (
                <>
                  <p className={styles.heading}>{t`Services`}</p>
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
                              {t`from ${ph({ price: format.price(service.minPrice) })}`} ·{' '}
                              {t`${plural(service.places, { one: '# place', other: '# places' })}`}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {masters.length > 0 && (
                <>
                  <p className={styles.heading}>{t`Specialists`}</p>
                  <ul className={styles.list}>
                    {masters.map((master) => (
                      <li key={master.id}>
                        <NextLink
                          href={`/${master.business.slug}/book?specialist=${master.id}`}
                          className={styles.place}
                          onClick={() => {
                            trackStep('search_pick', master.business.slug, { kind: 'master' })
                            rememberSearch(trimmed)
                            close()
                          }}
                        >
                          <PersonAvatar
                            name={master.name}
                            src={master.photoUrl ?? undefined}
                            size='sm'
                          />
                          <span className={styles.placeText}>
                            <span className={styles.placeName}>{master.name}</span>
                            <span className={styles.placeMeta}>
                              {[master.role, master.business.name].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </NextLink>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {(suggestions.length > 0 || services.length === 0) && (
                <p className={styles.heading}>
                  {suggestions.length > 0 ? t`Places` : t`Press Enter to search services`}
                </p>
              )}
              <ul className={styles.list}>
                {suggestions.map((business) => (
                  <li key={business.slug}>
                    <NextLink
                      href={`/${business.slug}`}
                      className={styles.place}
                      onClick={() => {
                        trackStep('search_pick', business.slug, { kind: 'place' })
                        close()
                      }}
                    >
                      <BusinessTile name={business.name} logoUrl={business.logoUrl} size='sm' />
                      <span className={styles.placeText}>
                        <span className={styles.placeName}>{business.name}</span>
                        <span className={styles.placeMeta}>
                          {[t(getKindLabel(business.kind)), business.address]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </NextLink>
                  </li>
                ))}
                <li>
                  <button type='button' className={styles.all} onClick={() => search(trimmed)}>
                    <ArrowRight aria-hidden />
                    {t`All services and places for “${ph({ query: trimmed })}”`}
                  </button>
                </li>
              </ul>
            </section>
          ) : (
            <>
              <RecentVisits onSelect={close} />
              {recent.length > 0 && (
                <section aria-label={t`Recent`}>
                  <p className={styles.heading}>
                    {t`Recent`}
                    <button
                      type='button'
                      className={styles.clear}
                      onClick={() => {
                        writeRecentSearches([])
                        setRecent([])
                      }}
                    >
                      {t`Clear`}
                    </button>
                  </p>
                  <ul className={styles.list}>
                    {recent.map((item) => (
                      <li key={item}>
                        <button type='button' className={styles.quick} onClick={() => search(item)}>
                          <ClockCounterClockwise className={styles.quickIcon} aria-hidden />
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section aria-label={t`Popular searches`}>
                <p className={styles.heading}>{t`Popular searches`}</p>
                <ul className={styles.list}>
                  {QUICK_SEARCHES.map((item) => (
                    <li key={item.query}>
                      <button
                        type='button'
                        className={styles.quick}
                        onClick={() => search(item.query)}
                      >
                        <MagnifyingGlass className={styles.quickIcon} aria-hidden />
                        {t(item.label)}
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

// The query is read only on the catalog, so the field stays in the cached HTML of other pages.
export const HeaderSearch = () => (
  <CatalogQuery>{(query) => <HeaderSearchField urlQuery={query?.get('q') ?? ''} />}</CatalogQuery>
)
