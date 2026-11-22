'use client'

import { Select } from '@awaisa/ui/Select'
import { Skeleton } from '@awaisa/ui/Skeleton'
import {
  ArrowUp,
  CaretRight,
  DownloadSimple,
  NotePencil,
  PaperPlaneTilt,
  ShoppingBag,
} from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { PersonAvatar } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import { getClients } from '@/shared/api/clientApi'
import type {
  Branch,
  ClientList,
  ClientSegment,
  ClientSort,
  MailingSegment,
  Specialist,
} from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useIsScrolledPast } from '@/shared/lib/hooks/useIsScrolledPast'
import { useIsStuck } from '@/shared/lib/hooks/useIsStuck'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { FloatingToolbar } from '@/shared/ui/FloatingToolbar/FloatingToolbar'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import { SearchField } from '@/shared/ui/SearchField/SearchField'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { useCanSeeMoney } from '@/views/manage/model/useManageRole'
import { useHasFeature } from '@/views/manage/model/usePlanAccess'
import { formatMomentDay } from '@/views/manage/ui/ClientSheet/BirthdayField'
import { ClientSheet } from '@/views/manage/ui/ClientSheet/ClientSheet'
import { ImportSheet } from '@/views/manage/ui/ImportSheet/ImportSheet'
import { MailingSheet } from '@/views/manage/ui/MailingSheet/MailingSheet'
import forms from '@/views/manage/ui/manageForms.module.css'
import { SaleSheet } from '@/views/manage/ui/SaleSheet/SaleSheet'
import styles from './ClientsTab.module.css'

interface ClientsTabProps {
  slug: string
  businessName: string
  /** For a sale of products from the toolbar: who sold it, at which branch. */
  specialists: Specialist[]
  branches: Branch[]
}

const SEARCH_DELAY_MS = 250
// The list shows this many, then «Ещё N клиентов» adds as many again; rows are loaded in batches.
const PAGE = 30
const BATCH = 200
const CLIENT_WORDS: [string, string, string] = ['клиент', 'клиента', 'клиентов']
// Whom «Позвать» calls: «1 клиента», «3 клиентов», «12 клиентов».
const CALLED_WORDS: [string, string, string] = ['клиента', 'клиентов', 'клиентов']
const VISIT_WORDS: [string, string, string] = ['визит', 'визита', 'визитов']
const NO_SHOW_WORDS: [string, string, string] = ['неявка', 'неявки', 'неявок']

const SEGMENTS: { value: ClientSegment; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'upcoming', label: 'Скоро придут' },
  { value: 'new', label: 'Новые' },
  { value: 'regular', label: 'Постоянные' },
  { value: 'lapsed', label: 'Давно не были' },
  { value: 'noShows', label: 'С неявками' },
  { value: 'birthday', label: 'День рождения' },
]

const SORTS: { value: ClientSort; label: string }[] = [
  { value: 'recent', label: 'Сначала недавние' },
  { value: 'spent', label: 'По тратам' },
  { value: 'visits', label: 'По визитам' },
  { value: 'name', label: 'По имени' },
]

// Segments a mailing reaches: «Позвать» opens it on the same group.
const MAILING_SEGMENT: Partial<Record<ClientSegment, MailingSegment>> = {
  lapsed: 'lapsed',
  birthday: 'birthday',
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  timeZone: BUSINESS_TIME_ZONE,
})

// The client base cut into the groups an owner acts on: who comes soon, the new, the regulars,
// those who stopped coming, those who do not show up, birthdays. Each group says what to do with
// it in one line («Позвать 12 клиентов ›» opens the mailing on that group). Rows lie on the page
// with hairlines, each one tap target to the client's card; long groups come thirty at a time.
export const ClientsTab = ({ slug, businessName, specialists, branches }: ClientsTabProps) => {
  const t = useT()
  const shortDate = (iso: string) =>
    t.language === 'ru' ? dateFormatter.format(new Date(iso)) : formatMomentDay(iso, t)
  const canSeeMoney = useCanSeeMoney()
  const canImport = useHasFeature('import')
  const canMail = useHasFeature('mailings')
  const canSell = useHasFeature('cashdesk')
  const isFar = useIsScrolledPast()
  const searchRef = useRef<HTMLDivElement>(null)
  const isStuck = useIsStuck(searchRef)
  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState<ClientSegment>('all')
  const [sort, setSort] = useState<ClientSort>('recent')
  const [list, setList] = useState<ClientList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)
  const [openPhone, setOpenPhone] = useState<string | null>(null)
  const [mailing, setMailing] = useState<MailingSegment | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isSelling, setIsSelling] = useState(false)
  const [version, setVersion] = useState(0)
  const items = list?.items ?? []
  const counts = list?.counts
  const total = counts?.[segment] ?? items.length
  const hiddenCount = total - Math.min(shown, items.length)
  // The rows to ask for: the next batch once «Ещё» reaches the end of what is loaded.
  const limit = Math.ceil(shown / BATCH) * BATCH
  const mailingSegment = MAILING_SEGMENT[segment]

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` reloads after a note is saved or a base imported
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      getClients(slug, { q: query.trim(), segment, sort, limit }, controller.signal)
        .then((next) => {
          setList(next)
          setError(null)
        })
        .catch((loadError: unknown) => {
          if (!controller.signal.aborted) setError(getErrorMessage(loadError))
        })
    }, SEARCH_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [slug, query, segment, sort, limit, version])

  const scrollToTop = () => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: isReduced ? 'auto' : 'smooth' })
  }

  const chooseSegment = (next: ClientSegment) => {
    setSegment(next)
    setShown(PAGE)
  }

  // Empty groups are left out of the tabs (all but «Все» and the one open).
  const tabs = SEGMENTS.filter(
    (item) => item.value === 'all' || item.value === segment || (counts?.[item.value] ?? 0) > 0,
  )

  return (
    <section className={`${forms.section} ${styles.page}`}>
      <h2 className={styles.title}>{t('Клиенты')}</h2>

      <div ref={searchRef} className={styles.searchPin} data-stuck={isStuck || undefined}>
        <FloatingToolbar className={styles.searchBar}>
          <SearchField
            value={query}
            onChange={(value) => {
              setQuery(value)
              setShown(PAGE)
            }}
            placeholder={t('Имя или номер')}
            label={t('Поиск клиента')}
          />
          {
            <GlyphGroup label={t('Клиентская база')}>
              <GlyphButton
                icon={<ArrowUp />}
                label={t('Наверх')}
                isHidden={!isFar}
                className={styles.toTop}
                onClick={scrollToTop}
              />
              {canSeeMoney && canImport && (
                <GlyphButton
                  icon={<DownloadSimple />}
                  label={t('Импорт')}
                  onClick={() => setIsImporting(true)}
                />
              )}
              {canSeeMoney && canMail && (
                <GlyphButton
                  icon={<PaperPlaneTilt />}
                  label={t('Рассылка')}
                  onClick={() => setMailing(mailingSegment ?? 'lapsed')}
                />
              )}
              {canSell && (
                <GlyphButton
                  icon={<ShoppingBag />}
                  label={t('Продать товар')}
                  onClick={() => setIsSelling(true)}
                />
              )}
            </GlyphGroup>
          }
        </FloatingToolbar>
      </div>
      <div className={styles.controls}>
        <TextTabs
          label={t('Группы клиентов')}
          items={tabs.map((item) => ({
            label: t(item.label),
            count: counts?.[item.value],
            isActive: segment === item.value,
            onSelect: () => chooseSegment(item.value),
          }))}
        />
      </div>

      {list && items.length > 0 && (
        <div className={styles.summary}>
          <SegmentNote
            segment={segment}
            count={counts?.[segment] ?? 0}
            lapsedDays={list.lapsedDays}
            onCall={canSeeMoney && mailingSegment ? () => setMailing(mailingSegment) : undefined}
          />
          <Select
            variant='plain'
            aria-label={t('Сортировка')}
            items={(canSeeMoney ? SORTS : SORTS.filter((item) => item.value !== 'spent')).map(
              (item) => ({ ...item, label: t(item.label) }),
            )}
            value={sort}
            onValueChange={(value) => value && setSort(value)}
            className={styles.sort}
          />
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
      {!list && !error && <Skeleton className={styles.skeleton} />}
      {list && items.length === 0 && (
        <EmptyState
          title={
            query
              ? t('Никого не нашли')
              : segment === 'all'
                ? t('Клиентов пока нет')
                : t('Здесь пусто')
          }
          text={
            query
              ? t('Проверьте имя или номер.')
              : segment === 'all'
                ? t('Они появятся с первой записью, или загрузите базу через «Импорт».')
                : t('В этой группе пока никого.')
          }
        />
      )}
      {items.length > 0 && (
        <MoreFade
          hiddenCount={hiddenCount}
          isOpen={false}
          onToggle={() => setShown((count) => count + PAGE)}
          label={t.count(hiddenCount, CLIENT_WORDS).replace(/^\d+ /, '')}
        >
          <ul className={styles.rows}>
            {items.slice(0, shown).map((client) => (
              <li key={client.phone}>
                <button
                  type='button'
                  className={styles.row}
                  onClick={() => setOpenPhone(client.phone)}
                >
                  <PersonAvatar name={client.name || client.phone.slice(-2)} size='md' />
                  <span className={styles.text}>
                    <span className={styles.name}>
                      <span className={styles.nameText}>
                        {client.name || formatPhone(client.phone)}
                      </span>
                      {client.hasNote && (
                        <NotePencil aria-label={t('Есть заметка')} className={styles.noteIcon} />
                      )}
                      {client.noShows > 0 && (
                        <span className={styles.noShow}>
                          {t.count(client.noShows, NO_SHOW_WORDS)}
                        </span>
                      )}
                    </span>
                    <span className={styles.meta}>
                      {client.visits === 0 ? t('ещё не был') : t.count(client.visits, VISIT_WORDS)}
                      {client.lastVisit &&
                        ` · ${t('был {date}', { date: shortDate(client.lastVisit) })}`}
                      {client.nextVisit &&
                        ` · ${t('придёт {date}', { date: shortDate(client.nextVisit) })}`}
                    </span>
                  </span>
                  <span className={styles.spent}>
                    {client.spent ? formatPrice(client.spent) : ''}
                  </span>
                  <CaretRight weight='bold' aria-hidden className={styles.chevron} />
                </button>
              </li>
            ))}
          </ul>
        </MoreFade>
      )}

      {isImporting && (
        <ImportSheet
          slug={slug}
          onClose={() => setIsImporting(false)}
          onImported={() => setVersion((current) => current + 1)}
        />
      )}
      {isSelling && (
        <SaleSheet
          slug={slug}
          specialists={specialists}
          branches={branches}
          onClose={() => setIsSelling(false)}
        />
      )}
      {mailing && (
        <MailingSheet
          slug={slug}
          businessName={businessName}
          initialSegment={mailing}
          onClose={() => setMailing(null)}
        />
      )}
      {openPhone && (
        <ClientSheet
          slug={slug}
          phone={openPhone}
          onClose={() => setOpenPhone(null)}
          onSaved={() => setVersion((value) => value + 1)}
        />
      )}
    </section>
  )
}

interface SegmentNoteProps {
  segment: ClientSegment
  count: number
  lapsedDays: number
  /** The group a mailing can reach: «Позвать N клиентов ›». */
  onCall?: () => void
}

// One line under the tabs: what the open group is and what to do with it.
const SegmentNote = ({ segment, count, lapsedDays, onCall }: SegmentNoteProps) => {
  const t = useT()
  const clients = t.count(count, CLIENT_WORDS)
  if (onCall) {
    return (
      <p className={styles.note}>
        {segment === 'lapsed'
          ? t('Не были больше {days} дней.', { days: lapsedDays })
          : t('День рождения в ближайшую неделю.')}{' '}
        <button type='button' className={styles.noteAction} onClick={onCall}>
          {t('Позвать {clients}', { clients: t.count(count, CALLED_WORDS) })}
          <CaretRight weight='bold' aria-hidden />
        </button>
      </p>
    )
  }
  if (segment === 'noShows') {
    return (
      <p className={styles.note}>
        {t('Предоплата при записи онлайн защищает от неявок.')}{' '}
        <NextLink className={styles.noteAction} href='?tab=services'>
          {t('Включить в услугах')}
          <CaretRight weight='bold' aria-hidden />
        </NextLink>
      </p>
    )
  }
  const notes: Partial<Record<ClientSegment, string>> = {
    all: clients,
    upcoming: t('{clients} с записью вперёд', { clients }),
    new: t('{clients} пришли один раз', { clients }),
    regular: t('{clients} с тремя визитами и больше', { clients }),
  }

  return <p className={styles.note}>{notes[segment] ?? clients}</p>
}
