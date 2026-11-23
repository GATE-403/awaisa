'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { Plus } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { useRequireSession } from '@/entities/session'
import { getBusinessesAttention, getMyBusinesses } from '@/shared/api/clientApi'
import type { BusinessAttention, BusinessLink } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { useToday } from '@/shared/lib/hooks/useToday'
import { Container } from '@/shared/ui/Container/Container'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { FloatingToolbar } from '@/shared/ui/FloatingToolbar/FloatingToolbar'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { SearchField } from '@/shared/ui/SearchField/SearchField'
import {
  filterBusinesses,
  isOwnBusiness,
  readRecent,
  sortBusinesses,
  todaySummary,
  weekSummary,
} from '@/views/manage/lib/businessList'
import { BusinessPickerCard } from '@/views/manage/ui/BusinessPickerCard/BusinessPickerCard'
import { CabinetBar } from '@/widgets/CabinetBar'
import styles from './ManageIndexPage.module.css'

/** How often the open list reads today's figures again. */
const REFRESH_MS = 60_000

const AMOUNT = new Intl.NumberFormat('ru-RU')

/** From this many businesses the list gets a search field. */
const SEARCH_FROM = 7

interface ManageIndexPageProps {
  /** The account's businesses, read on the server (null: load in the browser). */
  initialBusinesses?: BusinessLink[] | null
}

export const ManageIndexPage = ({ initialBusinesses = null }: ManageIndexPageProps) => {
  const session = useRequireSession()
  const t = useT()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<BusinessLink[] | null>(initialBusinesses)
  const [attention, setAttention] = useState<Map<string, BusinessAttention>>(new Map())
  const [recent, setRecent] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const today = useToday()
  const isSignedIn = session.status === 'signedIn'
  const [only] = businesses ?? []

  // The day moves while the list is open: every minute (while the tab is in view) the list and
  // what waits are read again, so today's figures and the next visit stay true.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setTick((value) => value + 1)
    }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isSignedIn || (initialBusinesses && tick === 0)) return

    const controller = new AbortController()
    getMyBusinesses(controller.signal)
      .then(setBusinesses)
      .catch(() => {
        // A failed refresh keeps the list it has; only a first load falls back to none.
        if (!controller.signal.aborted) setBusinesses((current) => current ?? [])
      })

    return () => controller.abort()
  }, [isSignedIn, initialBusinesses, tick])

  // What waits in each business comes after the list and never holds it up.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `tick` is the refresh trigger
  useEffect(() => {
    if (!isSignedIn) return

    const controller = new AbortController()
    getBusinessesAttention(controller.signal)
      .then((items) => setAttention(new Map(items.map((item) => [item.slug, item]))))
      .catch(() => undefined)

    return () => controller.abort()
  }, [isSignedIn, tick])

  // The device's own order of late openings: read after mount (the server has no storage).
  useEffect(() => {
    setRecent(readRecent())
  }, [])

  useEffect(() => {
    if (businesses?.length === 1 && only) router.replace(`/manage/${only.slug}`)
  }, [businesses, only, router])

  const own = useMemo(() => (businesses ?? []).filter(isOwnBusiness), [businesses])
  // One list: a platform admin's own businesses lead it, every other one follows (two tabs over
  // one list were rejected: «зачем делить на мои и общее»). Today's figures count one's own.
  const inScope = own.length > 0 ? own : (businesses ?? [])
  const sorted = sortBusinesses(filterBusinesses(businesses ?? [], query), attention, recent)
  const shown = [...sorted.filter(isOwnBusiness), ...sorted.filter((item) => !isOwnBusiness(item))]
  const isSearchable = (businesses?.length ?? 0) >= SEARCH_FROM
  const summary = today ? todaySummary(inScope, attention, today.dayKey) : null
  // A quiet day still has its week: «За неделю 14 записей · 230 просмотров».
  const week = weekSummary(inScope, attention)

  return (
    <main className={styles.page}>
      {/* The owner's side looks like the cabinet: its own toolbar, not the client's header. */}
      <CabinetBar title={t('Мои бизнесы')} />
      <Container size='md' className={styles.content}>
        {/* The head right on the page: the title and today's line on
            the left, the search on the same line on the right («можно в одну линию»). */}
        <header className={styles.head}>
          <div className={styles.headText}>
            <PageTitle size='sm' title={t('Мои бизнесы.')} />
            {/* Today over every business in view, in one line of bold figures; nothing on a quiet day. */}
            {summary && summary.visits > 0 && (
              <p className={styles.summary}>
                {t('Сегодня')}{' '}
                <strong>{t.count(summary.visits, ['визит', 'визита', 'визитов'])}</strong>
                {summary.revenue !== null && summary.revenue > 0 && (
                  <>
                    {' · '}
                    <strong>{t('{amount} сом', { amount: AMOUNT.format(summary.revenue) })}</strong>
                  </>
                )}
                {summary.next && (
                  <>
                    {' · '}
                    {t('ближайший в {time}, {name}', {
                      time: summary.next.time,
                      name: summary.next.name,
                    })}
                  </>
                )}
              </p>
            )}
            {summary && summary.visits === 0 && week.views + week.bookings > 0 && (
              <p className={styles.summary}>
                {t('За неделю')}{' '}
                <strong>{t.count(week.bookings, ['запись', 'записи', 'записей'])}</strong>
                {' · '}
                <strong>{t.count(week.views, ['просмотр', 'просмотра', 'просмотров'])}</strong>
              </p>
            )}
          </div>
          {/* On phones it floats at the window's foot. */}
          {isSearchable && (
            <FloatingToolbar className={styles.search}>
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder={t('Поиск')}
                label={t('Поиск по бизнесам')}
              />
            </FloatingToolbar>
          )}
        </header>

        {(!businesses || businesses.length === 1) && <Skeleton className={styles.skeleton} />}

        {businesses?.length === 0 && (
          <EmptyState
            title={t('Создайте первую страницу')}
            text={t('Создайте страницу бизнеса — это пять минут, и клиенты смогут записываться.')}
            action={
              <ButtonLink render={<NextLink href='/business/new' />}>
                {t('Создать страницу')}
              </ButtonLink>
            }
          />
        )}

        {businesses &&
          businesses.length > 1 &&
          (shown.length > 0 ? (
            <ul className={styles.list}>
              {shown.map((business, index) => (
                // The rows rise in one after another (`--i`), the first dozen only.
                <li
                  key={business.slug}
                  className={styles.item}
                  style={{ '--i': Math.min(index, 12) } as CSSProperties}
                >
                  <BusinessPickerCard
                    business={business}
                    attention={attention.get(business.slug)}
                  />
                </li>
              ))}
              {!query && (
                <li>
                  <NextLink href='/business/new' className={styles.addRow}>
                    <span className={styles.addTile} aria-hidden='true'>
                      <Plus />
                    </span>
                    {t('Новая страница')}
                  </NextLink>
                </li>
              )}
            </ul>
          ) : (
            <EmptyState
              variant='inline'
              title={t('Ничего не нашли')}
              text={t('Попробуйте другое слово.')}
            />
          ))}
      </Container>
    </main>
  )
}
