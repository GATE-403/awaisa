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
import { BusinessTile } from '@/entities/business'
import { useSession } from '@/entities/session'
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
  // A platform admin may be in a business that is not theirs: it still heads the list.
  const businesses = memberships.some((business) => business.slug === slug)
    ? memberships
    : [{ slug, name: title ?? slug }, ...memberships]
  const masterOf = customer?.masterOf ?? []
  const isAdmin = Boolean(customer?.isAdmin)

  return (
    <Menu
      align='start'
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
      {businesses.map((business) => (
        <MenuItem
          key={business.slug}
          className={styles.switcherItem}
          icon={business.slug === slug ? <Check weight='bold' aria-hidden /> : undefined}
          onClick={() => {
            if (business.slug !== slug) router.push(`/manage/${business.slug}`)
          }}
        >
          <BusinessTile name={business.name} size='xs' />
          <span className={styles.switcherName}>{business.name}</span>
        </MenuItem>
      ))}
      {(isAdmin || memberships.length > 1) && (
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
