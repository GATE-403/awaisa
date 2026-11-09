import { CaretDown } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { LanguageSwitcher } from '@/features/language'
import { ThemeSwitcher } from '@/features/theme'
import { PLATFORM } from '@/shared/config/platform'
import { Container } from '@/shared/ui/Container/Container'
import styles from './Footer.module.css'

const COLUMNS = [
  {
    title: 'Записаться',
    links: [
      { href: '/', label: 'Каталог' },
      { href: '/map', label: 'Рядом на карте' },
      { href: '/bookings', label: 'Мои записи' },
    ],
  },
  {
    title: 'Для бизнеса',
    links: [
      { href: '/business', label: 'Как это работает' },
      { href: '/business/new', label: 'Подключить бизнес' },
      { href: '/manage', label: 'Кабинет' },
    ],
  },
  {
    title: 'Аккаунт',
    links: [
      { href: '/profile', label: 'Профиль' },
      { href: '/login', label: 'Войти по номеру' },
    ],
  },
]

// Like apple.com: fine print first, link columns (collapsible on phones), then a quiet bottom row.
export const Footer = () => (
  <footer className={styles.footer}>
    <Container className={styles.inner}>
      <p className={styles.fine}>
        Время записи — по Бишкеку (UTC+6). Оплата — в салоне, после визита. Отменить или перенести
        запись можно в «Моих записях» — время сразу освободится для других.
      </p>

      <nav className={styles.columns} aria-label='Карта сайта'>
        {COLUMNS.map((column) => (
          <details key={column.title} className={styles.column} open>
            <summary className={styles.columnTitle}>
              {column.title}
              <CaretDown className={styles.caret} weight='bold' aria-hidden />
            </summary>
            <ul className={styles.links}>
              {column.links.map((link) => (
                <li key={link.href}>
                  <NextLink href={link.href} className={styles.link}>
                    {link.label}
                  </NextLink>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </nav>

      <div className={styles.bottom}>
        <p className={styles.legal}>
          <span className={styles.name}>{PLATFORM.name}</span> · {PLATFORM.tagline}
        </p>
        <div className={styles.settings}>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
    </Container>
  </footer>
)
