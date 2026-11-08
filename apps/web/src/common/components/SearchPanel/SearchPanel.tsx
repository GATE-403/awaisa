'use client'

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@awaisa/ui/Dialog'
import { ArrowRight, MagnifyingGlass, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { searchBusinesses } from '@/common/api/clientApi'
import type { BusinessCard } from '@/common/api/types'
import { getKindLabel } from '@/constants/platform'
import styles from './SearchPanel.module.css'

const QUICK_LINKS = [
  { href: '/?kind=barber', label: 'Барбершопы' },
  { href: '/?kind=beauty', label: 'Салоны красоты' },
  { href: '/?kind=nails', label: 'Ногтевые студии' },
  { href: '/bookings', label: 'Мои записи' },
  { href: '/business', label: 'Онлайн-запись для бизнеса' },
]

const MIN_QUERY_LENGTH = 2
const SUGGEST_DELAY_MS = 200
const MAX_SUGGESTIONS = 6

export const SearchPanel = () => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<BusinessCard[]>([])
  const trimmed = query.trim()
  const hasQuery = trimmed.length >= MIN_QUERY_LENGTH

  useEffect(() => {
    if (!hasQuery) return

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
  }, [hasQuery, trimmed])

  const close = () => setIsOpen(false)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setQuery('')
      setSuggestions([])
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!trimmed) return
    router.push(`/?${new URLSearchParams({ q: trimmed })}`)
    handleOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger className={styles.trigger} aria-label='Поиск'>
        <MagnifyingGlass weight='bold' aria-hidden />
      </DialogTrigger>
      <DialogContent variant='panel'>
        <div className={styles.inner}>
          <DialogTitle className={styles.srOnly}>Поиск</DialogTitle>
          <search>
            <form className={styles.form} onSubmit={handleSubmit}>
              <MagnifyingGlass className={styles.icon} aria-hidden />
              <input
                type='search'
                className={styles.input}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder='Поиск в Awaisa'
                aria-label='Поиск салонов и мастеров'
                enterKeyHint='search'
                autoComplete='off'
                autoFocus
              />
              <button
                type='button'
                className={styles.close}
                onClick={close}
                aria-label='Закрыть поиск'
              >
                <X weight='bold' aria-hidden />
              </button>
            </form>
          </search>

          {hasQuery ? (
            <section aria-label='Подсказки'>
              <p className={styles.heading}>
                {suggestions.length > 0 ? 'Бизнесы' : 'Ничего не нашли'}
              </p>
              <ul className={styles.links}>
                {suggestions.map((business) => (
                  <li key={business.slug}>
                    <NextLink href={`/${business.slug}`} className={styles.link} onClick={close}>
                      <ArrowRight className={styles.arrow} aria-hidden />
                      <span>
                        {business.name}
                        <span className={styles.meta}> · {getKindLabel(business.kind)}</span>
                      </span>
                    </NextLink>
                  </li>
                ))}
                <li>
                  <NextLink
                    href={`/?${new URLSearchParams({ q: trimmed })}`}
                    className={styles.link}
                    onClick={close}
                  >
                    <ArrowRight className={styles.arrow} aria-hidden />
                    Все результаты по «{trimmed}»
                  </NextLink>
                </li>
              </ul>
            </section>
          ) : (
            <nav aria-label='Быстрые ссылки'>
              <p className={styles.heading}>Быстрые ссылки</p>
              <ul className={styles.links}>
                {QUICK_LINKS.map((item) => (
                  <li key={item.href}>
                    <NextLink href={item.href} className={styles.link} onClick={close}>
                      <ArrowRight className={styles.arrow} aria-hidden />
                      {item.label}
                    </NextLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
