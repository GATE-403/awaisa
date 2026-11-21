'use client'

import { Menu, MenuItem, MenuSeparator } from '@awaisa/ui/Menu'
import {
  CalendarCheck,
  CaretDown,
  Check,
  Funnel,
  Plus,
  SquaresFour,
} from '@phosphor-icons/react/ssr'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BusinessTile } from '@/entities/business'
import { useSession } from '@/entities/session'
import { getMyBusinesses } from '@/shared/api/clientApi'
import type { BusinessLink } from '@/shared/api/types'
import styles from './CabinetBar.module.css'

interface BusinessSwitcherProps {
  slug: string
  title: string | null
  logoUrl: string | null
  isPublished: boolean
}

// The business in the bar is the way to the rest of one's business side, like switching accounts
// in Instagram: one's other businesses, one's own day as a master, the funnels for platform
// admins and a new page. Without it the only way across was out through the profile.
export const BusinessSwitcher = ({ slug, title, logoUrl, isPublished }: BusinessSwitcherProps) => {
  const router = useRouter()
  const { customer } = useSession()
  const memberships = customer?.businesses ?? []
  // The whole list (every business for a platform admin) is loaded the first time the menu opens;
  // until then the session's memberships.
  const [loaded, setLoaded] = useState<BusinessLink[] | null>(null)
  const known: { slug: string; name: string; logoUrl?: string | null }[] = loaded ?? memberships
  // This business heads the list (an admin may be in one that is not theirs).
  const current = known.find((business) => business.slug === slug) ?? {
    slug,
    name: title ?? slug,
    logoUrl,
  }
  const businesses = [current, ...known.filter((business) => business.slug !== slug)]

  const load = (isOpen: boolean) => {
    if (!isOpen || loaded) return
    getMyBusinesses()
      .then(setLoaded)
      // The session's list stays: the menu works without the fresh one.
      .catch(() => undefined)
  }
  const masterOf = customer?.masterOf ?? []
  const isAdmin = Boolean(customer?.isAdmin)

  return (
    <Menu
      align='start'
      onOpenChange={load}
      label={`${title ?? 'Бизнес'}: другие бизнесы и разделы`}
      className={styles.switcher}
      trigger={
        <>
          {title && <BusinessTile name={title} logoUrl={logoUrl} size='sm' />}
          <span className={styles.businessName}>
            {title}
            {!isPublished && <span className={styles.hidden}> · скрыта</span>}
          </span>
          <CaretDown className={styles.switcherCaret} weight='bold' aria-hidden />
        </>
      }
    >
      {/* Only the businesses scroll (all of them for an admin); the actions under them stay put. */}
      <div className={styles.switcherList}>
        {businesses.map((business) => (
          <MenuItem
            key={business.slug}
            className={styles.switcherItem}
            icon={business.slug === slug ? <Check weight='bold' aria-hidden /> : undefined}
            onClick={() => {
              if (business.slug !== slug) router.push(`/manage/${business.slug}`)
            }}
          >
            <BusinessTile name={business.name} logoUrl={business.logoUrl} size='xs' />
            <span className={styles.switcherName}>{business.name}</span>
          </MenuItem>
        ))}
      </div>
      <MenuSeparator />
      {businesses.length > 1 && (
        <MenuItem icon={<SquaresFour aria-hidden />} onClick={() => router.push('/manage')}>
          Все бизнесы
        </MenuItem>
      )}
      <MenuSeparator />
      {masterOf.length > 0 && (
        <MenuItem
          icon={<CalendarCheck aria-hidden />}
          onClick={() =>
            router.push(masterOf.length === 1 ? `/master/${masterOf[0]?.slug}` : '/master')
          }
        >
          Мой день
        </MenuItem>
      )}
      {isAdmin && (
        <MenuItem icon={<Funnel aria-hidden />} onClick={() => router.push('/insights')}>
          Воронки
        </MenuItem>
      )}
      <MenuItem icon={<Plus aria-hidden />} onClick={() => router.push('/business/new')}>
        Новая страница
      </MenuItem>
    </Menu>
  )
}
