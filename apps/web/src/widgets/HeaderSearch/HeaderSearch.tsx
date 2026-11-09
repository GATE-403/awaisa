'use client'

import { ArrowRight, MagnifyingGlass, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { BusinessTile } from '@/entities/business'
import { searchBusinesses } from '@/shared/api/clientApi'
import type { BusinessCard } from '@/shared/api/types'
import { getKindLabel } from '@/shared/config/platform'
import styles from './HeaderSearch.module.css'

const QUICK_SEARCHES = ['Мужская стрижка', 'Маникюр', 'Окрашивание', 'Массаж', 'Брови']

const MIN_QUERY_LENGTH = 2
const SUGGEST_DELAY_MS = 200
const MAX_SUGGESTIONS = 6

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
    }, SUGGEST_DELAY_MS)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [hasQuery, isOpen, trimmed])

  const close = () => setIsOpen(false)

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
        if (!rootRef.current?.contains(event.relatedTarget)) close()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') close()
      }}
    >
      <search>
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
      </search>

      {isOpen && (
        <div id={listId} className={styles.panel}>
          {hasQuery ? (
            <section aria-label='Подсказки'>
              <p className={styles.heading}>
                {suggestions.length > 0 ? 'Места' : 'Нажмите Enter, чтобы искать по услугам'}
              </p>
              <ul className={styles.list}>
                {suggestions.map((business) => (
                  <li key={business.slug}>
                    <NextLink href={`/${business.slug}`} className={styles.place} onClick={close}>
                      <BusinessTile name={business.name} size='sm' />
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
            <section aria-label='Часто ищут'>
              <p className={styles.heading}>Часто ищут</p>
              <div className={styles.chips}>
                {QUICK_SEARCHES.map((item) => (
                  <button
                    key={item}
                    type='button'
                    className={styles.chip}
                    onClick={() => search(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
