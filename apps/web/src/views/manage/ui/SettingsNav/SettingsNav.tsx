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
import { pluralize } from '@/shared/lib/plural'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { FloatingToolbar } from '@/shared/ui/FloatingToolbar/FloatingToolbar'
import { SearchField } from '@/shared/ui/SearchField/SearchField'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { type ManageTab, SETTINGS_GROUPS, type SettingsTone } from '@/views/manage/manageTabs'
import { usePlanAccess } from '@/views/manage/model/usePlanAccess'
import styles from './SettingsNav.module.css'

interface SettingsNavProps {
  slug: string
  /** The open section (on the root the first one, which wide screens show beside the list). */
  current: ManageTab
  business: Business
  catalog: Catalog
}

type Value = { text: string; isAlert?: boolean }

type SearchEntry = {
  tab: ManageTab
  label: string
  tone: SettingsTone
  /** Where it lives when not in the settings list («на Странице»). */
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
  branches: 'адрес филиал карта метка ссылка запись телефон',
  notifications: 'telegram телеграм бот уведомления новые записи отзывы',
  team: 'сотрудники администратор доступ команда',
  promotions: 'скидка промокод акция счастливые часы первый визит',
  loyalty: 'бонусы абонемент сертификат кэшбэк',
  stock: 'склад материалы расход остаток приход',
  fiscal: 'чеки ккм фискальный инн ндс нсп налог ekassa гнс',
  billing: 'тариф оплата подписка смс пакет пробный период',
}

// What lives on «Страница» now, still found by the search.
const PAGE_ENTRIES: SearchEntry[] = [
  {
    tab: 'services',
    label: 'Услуги',
    tone: 'blue',
    place: 'на Странице',
    words: 'услуги цены категории длительность предоплата',
  },
  {
    tab: 'masters',
    label: 'Мастера',
    tone: 'orange',
    place: 'на Странице',
    words: 'мастера график отпуск процент зарплата',
  },
  {
    tab: 'hours',
    label: 'Часы работы',
    tone: 'orange',
    place: 'на Странице',
    words: 'часы график выходной шаг записи слоты',
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

const normalize = (text: string) => text.toLowerCase().replaceAll('ё', 'е')

// macOS System Settings on wide screens (a search field over a quiet sidebar, the open row on a
// fill), on phones rows right on the page with hairlines and the search floating at the foot;
// each row leads with a thin glyph in its colour, no tile. Each row says
// on its right what is inside («2», «1 действует», «Бонусы 5%», «2 заканчиваются» in red), so the
// state of the business reads without opening anything.
export const SettingsNav = ({ slug, current, business, catalog }: SettingsNavProps) => {
  const [summary, setSummary] = useState<SettingsSummary | null>(null)
  const access = usePlanAccess()
  const [query, setQuery] = useState('')
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
    hours: { text: formatWeekSchedule(business.hours) },
    ...(access && {
      billing: {
        text: access.status === 'trial' ? `${access.title} · пробный` : access.title,
        isAlert: access.status === 'expired',
      },
    }),
    ...(summary && {
      notifications: { text: summary.telegramChats > 0 ? 'Telegram' : 'Выкл.' },
      ...(summary.team > 0 && { team: { text: String(summary.team) } }),
      promotions: {
        text:
          summary.activePromotions > 0
            ? `${summary.activePromotions} ${summary.activePromotions === 1 ? 'действует' : 'действуют'}`
            : 'Нет',
      },
      loyalty: {
        text:
          summary.bonusPercent !== null
            ? `Бонусы ${summary.bonusPercent}%`
            : summary.plans > 0
              ? pluralize(summary.plans, ['абонемент', 'абонемента', 'абонементов'])
              : 'Выкл.',
      },
      stock:
        summary.lowStock > 0
          ? {
              text: `${summary.lowStock} ${summary.lowStock === 1 ? 'заканчивается' : 'заканчиваются'}`,
              isAlert: true,
            }
          : { text: summary.stockItems > 0 ? String(summary.stockItems) : 'Пусто' },
      fiscal:
        summary.failedReceipts > 0
          ? {
              text: `${summary.failedReceipts} не ${summary.failedReceipts === 1 ? 'прошёл' : 'прошли'}`,
              isAlert: true,
            }
          : { text: summary.isFiscalOn ? 'Чеки' : 'Выкл.' },
    }),
  }

  // By the start of words, each typed word somewhere («або» finds «абонемент», not «работы»).
  const typed = needle.split(/\s+/).filter(Boolean)
  const results = needle
    ? [...SETTINGS_ENTRIES, ...PAGE_ENTRIES].filter((entry) => {
        const words = normalize(`${entry.label} ${entry.words}`).split(/[\s«»().,-]+/)
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
            <span className={styles.labelText}>{entry.label}</span>
            {entry.place && <span className={styles.place}>{entry.place}</span>}
          </span>
          {value && (
            <span className={styles.value} data-alert={value.isAlert || undefined}>
              {value.text}
            </span>
          )}
          <CaretRight className={styles.chevron} weight='bold' aria-hidden />
        </NextLink>
      </li>
    )
  }

  return (
    <nav aria-label='Настройки' className={styles.nav}>
      {/* With a mouse over the list; on phones it floats at the window's foot, under the thumb. */}
      <FloatingToolbar className={styles.search}>
        <SearchField
          value={query}
          onChange={search}
          placeholder='Поиск'
          label='Поиск по настройкам'
        />
      </FloatingToolbar>
      {results ? (
        results.length > 0 ? (
          <ul className={styles.list} aria-label='Найдено'>
            {results.map(row)}
          </ul>
        ) : (
          <EmptyState variant='inline' title='Ничего не нашли' text='Попробуйте другое слово.' />
        )
      ) : (
        SETTINGS_GROUPS.map((group) => (
          <section key={group.label} className={styles.group} aria-label={group.label}>
            <SectionCaption as='h2' className={styles.caption}>
              {group.label}
            </SectionCaption>
            <ul className={styles.list}>
              {group.items.map((item) =>
                row({ tab: item.value, label: item.label, tone: item.tone }),
              )}
            </ul>
          </section>
        ))
      )}
    </nav>
  )
}
