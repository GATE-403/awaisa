import { CaretDown } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { LanguageSwitcher } from '@/features/language'
import { ThemeSwitcher } from '@/features/theme'
import { PLATFORM } from '@/shared/config/platform'
import { T } from '@/shared/i18n'
import { Container } from '@/shared/ui/Container/Container'
import styles from './Footer.module.css'
import { FooterColumn } from './FooterColumn'

const COLUMNS = [
  {
    title: 'Записаться',
    links: [
      { href: '/', label: 'Каталог' },
      { href: '/map', label: 'Рядом на карте' },
      { href: '/top', label: 'Рейтинг мастеров' },
    ],
  },
  {
    title: 'Для бизнеса',
    links: [
      { href: '/business', label: 'Как это работает' },
      { href: '/business/new', label: 'Подключить бизнес' },
      { href: '/manage', label: 'Кабинет' },
      { href: '/updates', label: 'Что нового' },
    ],
  },
  {
    title: 'Аккаунт',
    links: [
      { href: '/bookings', label: 'Профиль и записи' },
      { href: '/login', label: 'Войти по номеру' },
    ],
  },
]

// Like apple.com: fine print first, link columns (collapsible on phones), then a quiet bottom row.
export const Footer = () => (
  <footer data-site-footer className={styles.footer}>
    <Container className={styles.inner}>
      <nav className={styles.columns} aria-label='Карта сайта'>
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
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
    </Container>
  </footer>
)
