import NextLink from 'next/link'
import { MANAGE_TABS, type ManageTab } from '../../manageTabs'
import styles from './ManageNav.module.css'

interface ManageNavProps {
  slug: string
  active: ManageTab
}

export const ManageNav = ({ slug, active }: ManageNavProps) => (
  <nav aria-label='Разделы кабинета' className={styles.nav}>
    <ul className={styles.list}>
      {MANAGE_TABS.map(({ value, label, icon: Icon }) => (
        <li key={value}>
          <NextLink
            href={`/manage/${slug}?tab=${value}`}
            scroll={false}
            className={styles.link}
            aria-current={active === value ? 'page' : undefined}
          >
            <Icon
              className={styles.icon}
              weight={active === value ? 'fill' : 'regular'}
              aria-hidden
            />
            {label}
          </NextLink>
        </li>
      ))}
    </ul>
  </nav>
)
