'use client'

import { Select } from '@awaisa/ui/Select'
import { Skeleton } from '@awaisa/ui/Skeleton'
import type { MessageDescriptor } from '@lingui/core'
import { msg, ph, plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import {
  ArrowUp,
  CaretRight,
  DownloadSimple,
  NotePencil,
  PaperPlaneTilt,
  ShoppingBag,
} from '@phosphor-icons/react/ssr'
import { useEffect, useRef, useState } from 'react'
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
import { useFormat } from '@/shared/i18n'
import { Link as NextLink } from '@/shared/i18n/navigation'
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
// The list shows this many, then "N more clients" adds as many again; rows are loaded in batches.
const PAGE = 30
const BATCH = 200

const SEGMENTS: { value: ClientSegment; label: MessageDescriptor }[] = [
  { value: 'all', label: msg`All` },
  { value: 'upcoming', label: msg`Coming soon` },
  { value: 'new', label: msg`New` },
  { value: 'regular', label: msg`Regulars` },
  { value: 'lapsed', label: msg`Lapsed` },
  { value: 'noShows', label: msg`With no-shows` },
  { value: 'birthday', label: msg`Birthday` },
]

const SORTS: { value: ClientSort; label: MessageDescriptor }[] = [
  { value: 'recent', label: msg`Most recent first` },
  { value: 'spent', label: msg`By spend` },
  { value: 'visits', label: msg`By visits` },
  { value: 'name', label: msg`By name` },
]

// Segments a mailing reaches: "Invite" opens it on the same group.
const MAILING_SEGMENT: Partial<Record<ClientSegment, MailingSegment>> = {
  lapsed: 'lapsed',
  birthday: 'birthday',
}

// The client base cut into the groups an owner acts on: who comes soon, the new, the regulars,
// those who stopped coming, those who do not show up, birthdays. Each group says what to do with
// it in one line ("Invite 12 clients ›" opens the mailing on that group). Rows lie on the page
// with hairlines, each one tap target to the client's card; long groups come thirty at a time.
export const ClientsTab = ({ slug, businessName, specialists, branches }: ClientsTabProps) => {
  const format = useFormat()
  const { t } = useLingui()
  const shortDate = (iso: string) => formatMomentDay(iso, t)
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
  // The rows to ask for: the next batch once "More" reaches the end of what is loaded.
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

  // Empty groups are left out of the tabs (all but "All" and the one open).
  const tabs = SEGMENTS.filter(
    (item) => item.value === 'all' || item.value === segment || (counts?.[item.value] ?? 0) > 0,
  )

  return (
    <section className={`${forms.section} ${styles.page}`}>
      <h2 className={styles.title}>{t`Clients`}</h2>

      <div ref={searchRef} className={styles.searchPin} data-stuck={isStuck || undefined}>
        <FloatingToolbar className={styles.searchBar}>
          <SearchField
            value={query}
            onChange={(value) => {
              setQuery(value)
              setShown(PAGE)
            }}
            placeholder={t`Name or number`}
            label={t`Find a client`}
          />
          {
            <GlyphGroup label={t`Client base`}>
              <GlyphButton
                icon={<ArrowUp />}
                label={t`Back to top`}
                isHidden={!isFar}
                className={styles.toTop}
                onClick={scrollToTop}
              />
              {canSeeMoney && canImport && (
                <GlyphButton
                  icon={<DownloadSimple />}
                  label={t`Import`}
                  onClick={() => setIsImporting(true)}
                />
              )}
              {canSeeMoney && canMail && (
                <GlyphButton
                  icon={<PaperPlaneTilt />}
                  label={t`Mailing`}
                  onClick={() => setMailing(mailingSegment ?? 'lapsed')}
                />
              )}
              {canSell && (
                <GlyphButton
                  icon={<ShoppingBag />}
                  label={t`Sell a product`}
                  onClick={() => setIsSelling(true)}
                />
              )}
            </GlyphGroup>
          }
        </FloatingToolbar>
      </div>
      <div className={styles.controls}>
        <TextTabs
          label={t`Client groups`}
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
            aria-label={t`Sort`}
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
          title={query ? t`Nobody found` : segment === 'all' ? t`No clients yet` : t`Nothing here`}
          text={
            query
              ? t`Check the name or number.`
              : segment === 'all'
                ? t`They appear with the first booking, or load your base through “Import”.`
                : t`Nobody in this group yet.`
          }
        />
      )}
      {items.length > 0 && (
        <MoreFade
          hiddenCount={hiddenCount}
          isOpen={false}
          onToggle={() => setShown((count) => count + PAGE)}
          label={t`${plural(hiddenCount, { one: 'client', other: 'clients' })}`}
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
                        <NotePencil aria-label={t`Has a note`} className={styles.noteIcon} />
                      )}
                      {client.noShows > 0 && (
                        <span className={styles.noShow}>
                          {t`${plural(client.noShows, { one: '# no-show', other: '# no-shows' })}`}
                        </span>
                      )}
                    </span>
                    <span className={styles.meta}>
                      {client.visits === 0
                        ? t`no visits yet`
                        : t`${plural(client.visits, { one: '# visit', other: '# visits' })}`}
                      {client.lastVisit &&
                        ` · ${t`last ${ph({ date: shortDate(client.lastVisit) })}`}`}
                      {client.nextVisit &&
                        ` · ${t`next ${ph({ date: shortDate(client.nextVisit) })}`}`}
                    </span>
                  </span>
                  <span className={styles.spent}>
                    {client.spent ? format.price(client.spent) : ''}
                  </span>
                  <CaretRight aria-hidden className={styles.chevron} />
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
  /** The group a mailing can reach: "Invite N clients ›". */
  onCall?: () => void
}

// One line under the tabs: what the open group is and what to do with it.
const SegmentNote = ({ segment, count, lapsedDays, onCall }: SegmentNoteProps) => {
  const { t } = useLingui()
  if (onCall) {
    return (
      <p className={styles.note}>
        {segment === 'lapsed'
          ? t`Not seen for over ${ph({ days: lapsedDays })} days.`
          : t`Birthday within the coming week.`}{' '}
        <button type='button' className={styles.noteAction} onClick={onCall}>
          {t`${plural(count, { one: 'Invite # client', other: 'Invite # clients' })}`}
          <CaretRight aria-hidden />
        </button>
      </p>
    )
  }
  if (segment === 'noShows') {
    return (
      <p className={styles.note}>
        {t`A deposit on online bookings protects against no-shows.`}{' '}
        <NextLink className={styles.noteAction} href='?tab=services'>
          {t`Turn on in services`}
          <CaretRight aria-hidden />
        </NextLink>
      </p>
    )
  }
  const notes: Partial<Record<ClientSegment, string>> = {
    upcoming: t`${plural(count, { one: '# client with a booking ahead', other: '# clients with a booking ahead' })}`,
    new: t`${plural(count, { one: '# client came once', other: '# clients came once' })}`,
    regular: t`${plural(count, { one: '# client with three visits or more', other: '# clients with three visits or more' })}`,
  }

  return (
    <p className={styles.note}>
      {notes[segment] ?? t`${plural(count, { one: '# client', other: '# clients' })}`}
    </p>
  )
}
