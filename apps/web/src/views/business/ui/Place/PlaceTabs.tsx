'use client'

import { useLingui } from '@lingui/react/macro'
import { ListBullets, Trophy } from '@phosphor-icons/react/ssr'
import { type ReactNode, useEffect, useState } from 'react'
import { getOpeningStatus, WeekHours, weekdayOf } from '@/entities/business'
import type { Business, Catalog } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import { FanCardsIcon } from '@/shared/ui/FanCardsIcon'
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

// The owner's «Page» tabs as clients see them: «Work · Services · Specialists · Time» with a count
// each and the open tab's one action at the row's end. People come to book a service, so the page
// opens on «Services»; a tab with nothing in it is left out.
export const PlaceTabs = ({ business, catalog, services, masters, works }: PlaceTabsProps) => {
  const { t } = useLingui()
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
      label: t`Work`,
      count: business.photos.length,
      panelId: PANELS.works,
      panel: works,
    },
    catalog.services.length > 0 && {
      value: 'services' as const,
      label: t`Services`,
      count: catalog.services.length,
      panelId: PANELS.services,
      panel: services,
    },
    catalog.specialists.length > 0 && {
      value: 'masters' as const,
      label: t`Specialists`,
      count: catalog.specialists.length,
      panelId: PANELS.masters,
      panel: masters,
    },
    {
      value: 'hours' as const,
      label: t`Time`,
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
        label={t`See with prices`}
        icon={<FanCardsIcon aria-hidden />}
        isHiddenOnPhone
      />
    ),
    services: (
      <ProfileTabAction
        href={`/${business.slug}/services`}
        label={t`Full menu`}
        icon={<ListBullets aria-hidden />}
        isHiddenOnPhone
      />
    ),
    masters: (
      <ProfileTabAction
        href={ratingHref}
        label={t`Rating`}
        icon={<Trophy aria-hidden />}
        isHiddenOnPhone
      />
    ),
    hours: null,
  }

  return (
    <ProfileTabs
      label={t`Place sections`}
      items={items}
      value={shown}
      onChange={setSection}
      action={actions[shown]}
    />
  )
}
