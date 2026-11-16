import type { Icon } from '@phosphor-icons/react'
import {
  Bell,
  CaretRight,
  Clock,
  Gift,
  IdentificationBadge,
  MapPin,
  Package,
  Percent,
  Scissors,
  Storefront,
  UsersThree,
} from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { type ManageTab, SETTINGS_GROUPS } from '@/views/manage/manageTabs'
import styles from './SettingsNav.module.css'

interface SettingsNavProps {
  slug: string
  /** The open section; null on the settings root (phones show the list alone). */
  current: ManageTab | null
}

const ICONS: Partial<Record<ManageTab, Icon>> = {
  profile: Storefront,
  branches: MapPin,
  hours: Clock,
  notifications: Bell,
  services: Scissors,
  masters: UsersThree,
  team: IdentificationBadge,
  promotions: Percent,
  loyalty: Gift,
  stock: Package,
}

// macOS System Settings on wide screens (a quiet sidebar, the open row on a fill), iOS Settings
// on phones (inset groups of rows with a coloured glyph tile and a chevron).
export const SettingsNav = ({ slug, current }: SettingsNavProps) => (
  <nav aria-label='Настройки' className={styles.nav}>
    {SETTINGS_GROUPS.map((group) => (
      <section key={group.label} className={styles.group} aria-label={group.label}>
        <SectionCaption as='h2' className={styles.caption}>
          {group.label}
        </SectionCaption>
        <ul className={styles.list}>
          {group.items.map(({ value, label, tone }) => {
            const Glyph = ICONS[value] ?? Storefront
            return (
              <li key={value}>
                <NextLink
                  href={`/manage/${slug}?tab=${value}`}
                  scroll={false}
                  className={styles.row}
                  aria-current={current === value ? 'page' : undefined}
                >
                  <span className={styles.glyph} data-tone={tone} aria-hidden>
                    <Glyph weight='fill' />
                  </span>
                  <span className={styles.label}>{label}</span>
                  <CaretRight className={styles.chevron} weight='bold' aria-hidden />
                </NextLink>
              </li>
            )
          })}
        </ul>
      </section>
    ))}
  </nav>
)
