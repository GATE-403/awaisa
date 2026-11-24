'use client'

import type { Icon } from '@phosphor-icons/react'
import {
  Bell,
  CaretRight,
  Clock,
  CreditCard,
  Gift,
  IdentificationBadge,
  MapPin,
  Package,
  Percent,
  Receipt,
  Scissors,
  Storefront,
  UsersThree,
} from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useEffect, useState } from 'react'
import { formatWeekSchedule } from '@/entities/business'
import { getSettingsSummary } from '@/shared/api/clientApi'
import type { Business, Catalog, SettingsSummary } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { FloatingToolbar } from '@/shared/ui/FloatingToolbar/FloatingToolbar'
import { SearchField } from '@/shared/ui/SearchField/SearchField'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { type ManageTab, SETTINGS_GROUPS, type SettingsTone } from '@/views/manage/manageTabs'
import { usePlanAccess } from '@/views/manage/model/usePlanAccess'
import { BusinessSheet } from '@/views/manage/ui/BusinessSheet/BusinessSheet'
import styles from './SettingsNav.module.css'

interface SettingsNavProps {
  slug: string
  /** The open section (on the root the first one, which wide screens show beside the list). */
  current: ManageTab
  business: Business
  catalog: Catalog
  /** The cabinet's runner (save, toast, reload), for the page switch at the list's foot. */
  run?: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

type Value = { text: string; isAlert?: boolean }

type SearchEntry = {
  tab: ManageTab
  label: string
  tone: SettingsTone
  /** Where it lives when not in the settings list ("on the Page"). */
  place?: string
  words: string
}

const ICONS: Partial<Record<ManageTab, Icon>> = {
  branches: MapPin,
  hours: Clock,
  notifications: Bell,
  services: Scissors,
  masters: UsersThree,
  team: IdentificationBadge,
  promotions: Percent,
  loyalty: Gift,
  stock: Package,
  fiscal: Receipt,
  billing: CreditCard,
}

// Words people look for a setting by, beside its name.
const KEYWORDS: Partial<Record<ManageTab, string>> = {
  branches: 'address branch location map pin link booking phone',
  notifications: 'telegram bot notifications alerts new bookings reviews',
  team: 'staff administrator access team employees',
  promotions: 'discount promo code offer happy hours first visit',
  loyalty: 'bonuses pass subscription certificate gift cashback',
  stock: 'stock inventory materials supplies usage balance delivery',
  fiscal: 'receipts till fiscal tin vat sales tax ekassa',
  billing: 'plan payment subscription sms pack trial',
}

// What lives on "Page" now, still found by the search.
const PAGE_ENTRIES: SearchEntry[] = [
  {
    tab: 'services',
    label: 'Services',
    tone: 'blue',
    place: 'on the Page',
    words: 'services prices categories duration length deposit prepayment',
  },
  {
    tab: 'masters',
    label: 'Specialists',
    tone: 'orange',
    place: 'on the Page',
    words: 'specialists masters staff schedule leave holiday percent pay salary',
  },
  {
    tab: 'hours',
    label: 'Opening hours',
    tone: 'orange',
    place: 'on the Page',
    words: 'hours schedule day off slot step',
  },
]

const SETTINGS_ENTRIES: SearchEntry[] = SETTINGS_GROUPS.flatMap((group) =>
  group.items.map((item) => ({
    tab: item.value,
    label: item.label,
    tone: item.tone,
    words: KEYWORDS[item.value] ?? '',
  })),
)

const normalize = (text: string) => text.toLowerCase()

// macOS System Settings on wide screens (a search field over a quiet sidebar, the open row on a
// fill), on phones rows right on the page with hairlines and the search floating at the foot;
// each row leads with a thin glyph in its colour, no tile. Each row says
// on its right what is inside ("2", "1 running", "Bonuses 5%", "2 running low" in red), so the
// state of the business reads without opening anything.
export const SettingsNav = ({ slug, current, business, catalog, run }: SettingsNavProps) => {
  const t = useT()
  const [summary, setSummary] = useState<SettingsSummary | null>(null)
  const access = usePlanAccess()
  const [query, setQuery] = useState('')
  const [isBusinessSheetOpen, setIsBusinessSheetOpen] = useState(false)
  // The switch's saved value until the cabinet's own data reads it back.
  const [published, setPublished] = useState<{ from: boolean; to: boolean } | null>(null)
  const isPublished =
    published && published.from === business.isPublished ? published.to : business.isPublished
  const needle = normalize(query.trim())

  useEffect(() => {
    const controller = new AbortController()
    getSettingsSummary(slug, controller.signal)
      .then(setSummary)
      // The values are a convenience: the list works without them.
      .catch(() => undefined)
    return () => controller.abort()
  }, [slug])

  // The field floats at a phone's foot over the keyboard: the results sit at the top of the page,
  // so the page goes back up to them as soon as the query changes (they were out of view).
  const search = (value: string) => {
    setQuery(value)
    if (window.matchMedia('(max-width: 639px)').matches)
      window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const branches = business.branches.filter((branch) => branch.isActive !== false).length
  const values: Partial<Record<ManageTab, Value>> = {
    branches: { text: String(branches) },
    services: { text: String(catalog.services.filter((item) => item.isActive !== false).length) },
    masters: { text: String(catalog.specialists.filter((item) => item.isActive !== false).length) },
    hours: { text: formatWeekSchedule(business.hours, t) },
    ...(access && {
      billing: {
        text:
          access.status === 'trial' ? t('{plan} · trial', { plan: access.title }) : access.title,
        isAlert: access.status === 'expired',
      },
    }),
    ...(summary && {
      notifications: { text: summary.telegramChats > 0 ? 'Telegram' : t('Off') },
      ...(summary.team > 0 && { team: { text: String(summary.team) } }),
      promotions: {
        text:
          summary.activePromotions > 0
            ? t(summary.activePromotions === 1 ? '{count} running' : '{count} running', {
                count: summary.activePromotions,
              })
            : t('No'),
      },
      loyalty: {
        text:
          summary.bonusPercent !== null
            ? t('Bonuses {percent}%', { percent: summary.bonusPercent })
            : summary.plans > 0
              ? t.count(summary.plans, ['pass', 'passes'])
              : t('Off'),
      },
      stock:
        summary.lowStock > 0
          ? {
              text: t(summary.lowStock === 1 ? '{count} running low' : '{count} running low', {
                count: summary.lowStock,
              }),
              isAlert: true,
            }
          : { text: summary.stockItems > 0 ? String(summary.stockItems) : t('Empty') },
      fiscal:
        summary.failedReceipts > 0
          ? {
              text: t(summary.failedReceipts === 1 ? '{count} failed' : '{count} failed', {
                count: summary.failedReceipts,
              }),
              isAlert: true,
            }
          : { text: summary.isFiscalOn ? t('Receipts') : t('Off') },
    }),
  }

  // By the start of words, each typed word somewhere ("pro" finds "promo code", not "improve");
  // the name is searched as shown too.
  const typed = needle.split(/\s+/).filter(Boolean)
  const results = needle
    ? [...SETTINGS_ENTRIES, ...PAGE_ENTRIES].filter((entry) => {
        const words = normalize(`${t(entry.label)} ${entry.label} ${entry.words}`).split(
          /[\s"().,-]+/,
        )
        return typed.every((part) => words.some((word) => word.startsWith(part)))
      })
    : null

  const row = (entry: Pick<SearchEntry, 'tab' | 'label' | 'tone' | 'place'>) => {
    const Glyph = ICONS[entry.tab] ?? Storefront
    const value = values[entry.tab]
    return (
      <li key={entry.tab}>
        <NextLink
          href={`/manage/${slug}?tab=${entry.tab}`}
          scroll={false}
          className={styles.row}
          aria-current={current === entry.tab ? 'page' : undefined}
        >
          <span className={styles.glyph} data-tone={entry.tone} aria-hidden>
            <Glyph />
          </span>
          <span className={styles.label}>
            <span className={styles.labelText}>{t(entry.label)}</span>
            {entry.place && <span className={styles.place}>{t(entry.place)}</span>}
          </span>
          {value && (
            <span className={styles.value} data-alert={value.isAlert || undefined}>
              {value.text}
            </span>
          )}
          <CaretRight className={styles.chevron} aria-hidden />
        </NextLink>
      </li>
    )
  }

  return (
    <nav aria-label={t('Settings')} className={styles.nav}>
      {/* With a mouse over the list; on phones it floats at the window's foot, under the thumb. */}
      <FloatingToolbar className={styles.search}>
        <SearchField
          value={query}
          onChange={search}
          placeholder={t('Search')}
          label={t('Search settings')}
        />
      </FloatingToolbar>
      {results ? (
        results.length > 0 ? (
          <ul className={styles.list} aria-label={t('Found')}>
            {results.map(row)}
          </ul>
        ) : (
          <EmptyState variant='inline' title={t('Nothing found')} text={t('Try another word.')} />
        )
      ) : (
        SETTINGS_GROUPS.map((group) => (
          <section key={group.label} className={styles.group} aria-label={t(group.label)}>
            <SectionCaption as='h2' className={styles.caption}>
              {t(group.label)}
            </SectionCaption>
            <ul className={styles.list}>
              {group.items.map((item) =>
                row({ tab: item.value, label: item.label, tone: item.tone }),
              )}
              {/* Hiding and deleting the business: a row of its own that opens its sheet, so the
                  red action is never in plain view. */}
              {group.label === 'Business' && (
                <li>
                  <button
                    type='button'
                    className={`${styles.row} ${styles.rowButton} ${styles.danger}`}
                    onClick={() => setIsBusinessSheetOpen(true)}
                  >
                    <span className={styles.glyph} aria-hidden>
                      <Storefront />
                    </span>
                    <span className={styles.label}>
                      <span className={styles.labelText}>{t('Hide or delete')}</span>
                    </span>
                    {/* Only the state that asks for attention: an open page says nothing. */}
                    {!isPublished && <span className={styles.value}>{t('Hidden')}</span>}
                    <CaretRight className={styles.chevron} aria-hidden />
                  </button>
                </li>
              )}
            </ul>
          </section>
        ))
      )}
      {isBusinessSheetOpen && (
        <BusinessSheet
          slug={slug}
          isPublished={isPublished}
          onPublishedChange={(value) => setPublished({ from: business.isPublished, to: value })}
          run={run}
          onClose={() => setIsBusinessSheetOpen(false)}
        />
      )}
    </nav>
  )
}
