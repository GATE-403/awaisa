import { CaretDown } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { ThemeSwitcher } from '@/features/theme'
import { PLATFORM } from '@/shared/config/platform'
import { T } from '@/shared/i18n'
import { Container } from '@/shared/ui/Container/Container'
import styles from './Footer.module.css'
import { FooterColumn } from './FooterColumn'

const COLUMNS = [
  {
    title: 'Book',
    links: [
      { href: '/', label: 'Catalogue' },
      { href: '/map', label: 'Nearby on the map' },
      { href: '/top', label: 'Top specialists' },
    ],
  },
  {
    title: 'For business',
    links: [
      { href: '/business', label: 'How it works' },
      { href: '/business/new', label: 'Add your business' },
      { href: '/manage', label: 'Dashboard' },
      { href: '/updates', label: "What's new" },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/bookings', label: 'Profile and bookings' },
      { href: '/login', label: 'Sign in with your number' },
    ],
  },
]

// Like apple.com: fine print first, link columns (collapsible on phones), then a quiet bottom row.
export const Footer = () => (
  <footer data-site-footer className={styles.footer}>
    <Container className={styles.inner}>
      <nav className={styles.columns} aria-label='Site map'>
        {COLUMNS.map((column) => (
          <FooterColumn key={column.title} className={styles.column}>
            <summary className={styles.columnTitle}>
              <T>{column.title}</T>
              <CaretDown className={styles.caret} aria-hidden />
            </summary>
            <ul className={styles.links}>
              {column.links.map((link) => (
                <li key={link.href}>
                  <NextLink href={link.href} className={styles.link}>
                    <T>{link.label}</T>
                  </NextLink>
                </li>
              ))}
            </ul>
          </FooterColumn>
        ))}
      </nav>

      <div className={styles.bottom}>
        <p className={styles.legal}>
          <span className={styles.name}>{PLATFORM.name}</span> · <T>{PLATFORM.tagline}</T>
        </p>
        <div className={styles.settings}>
          <ThemeSwitcher />
        </div>
      </div>
    </Container>
  </footer>
)
