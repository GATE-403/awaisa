'use client'

import { ListBullets, Sparkle, Trophy } from '@phosphor-icons/react/ssr'
import { type ReactNode, useEffect, useState } from 'react'
import { getOpeningStatus, WeekHours, weekdayOf } from '@/entities/business'
import type { Business, Catalog } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { useToday } from '@/shared/lib/hooks/useToday'
import { ProfileTabAction, ProfileTabs } from '@/shared/ui/ProfileTabs/ProfileTabs'

interface PlaceTabsProps {
  business: Business
  catalog: Catalog
  services: ReactNode
  masters: ReactNode
  works: ReactNode
}

type PlaceSection = 'works' | 'services' | 'masters' | 'hours'

// The anchors the head, the business bar and old links lead to: each opens its tab.
const PANELS: Record<PlaceSection, string> = {
  works: 'work',
  services: 'services',
  masters: 'masters',
  hours: 'hours',
}

const sectionOfHash = (hash: string) =>
  (Object.keys(PANELS) as PlaceSection[]).find((section) => `#${PANELS[section]}` === hash)

// The owner's «Страница» tabs as clients see them: «Работы · Услуги · Мастера · Время» with a count
// each and the open tab's one action at the row's end. People come to book a service, so the page
// opens on «Услуги»; a tab with nothing in it is left out.
export const PlaceTabs = ({ business, catalog, services, masters, works }: PlaceTabsProps) => {
  const t = useT()
  const today = useToday()
  const [section, setSection] = useState<PlaceSection>('services')
  const status = today ? getOpeningStatus(business.hours, today.dayKey, today.minutes, t) : null
  const ratingHref = business.kind === 'barber' ? '/top' : `/top?kind=${business.kind}`

  // `#masters` (the business bar, a shared link) opens that tab and brings it into view; the
  // browser cannot scroll to a panel that was hidden when the address changed.
  useEffect(() => {
    const open = () => {
      const target = sectionOfHash(window.location.hash)
      if (!target) return
      setSection(target)
      requestAnimationFrame(() =>
        document
          .getElementById(`${PANELS[target]}-tab`)
          ?.closest('[data-profile-tabs]')
          ?.scrollIntoView({ block: 'start' }),
      )
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])

  const items = [
    business.photos.length > 0 && {
      value: 'works' as const,
      label: t('Работы'),
      count: business.photos.length,
      panelId: PANELS.works,
      panel: works,
    },
    catalog.services.length > 0 && {
      value: 'services' as const,
      label: t('Услуги'),
      count: catalog.services.length,
      panelId: PANELS.services,
      panel: services,
    },
    catalog.specialists.length > 0 && {
      value: 'masters' as const,
      label: t('Мастера'),
      count: catalog.specialists.length,
      panelId: PANELS.masters,
      panel: masters,
    },
    {
      value: 'hours' as const,
      label: t('Время'),
      panelId: PANELS.hours,
      panel: (
        <WeekHours
          hours={business.hours}
          todayWeekday={today ? weekdayOf(today.dayKey) : null}
          status={status}
        />
      ),
    },
  ].filter((item) => item !== false)
  const shown = items.some((item) => item.value === section) ? section : 'hours'

  const actions: Record<PlaceSection, ReactNode> = {
    works: (
      <ProfileTabAction
        href={`/feed?business=${business.slug}`}
        label={t('Смотреть с ценами')}
        icon={<Sparkle aria-hidden />}
        isHiddenOnPhone
      />
    ),
    services: (
      <ProfileTabAction
        href={`/${business.slug}/services`}
        label={t('Всё меню')}
        icon={<ListBullets aria-hidden />}
        isHiddenOnPhone
      />
    ),
    masters: (
      <ProfileTabAction
        href={ratingHref}
        label={t('Рейтинг')}
        icon={<Trophy aria-hidden />}
        isHiddenOnPhone
      />
    ),
    hours: null,
  }

  return (
    <ProfileTabs
      label={t('Разделы места')}
      items={items}
      value={shown}
      onChange={setSection}
      action={actions[shown]}
    />
  )
}
