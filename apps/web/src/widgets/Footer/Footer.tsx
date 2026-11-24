import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { CaretDown } from '@phosphor-icons/react/ssr'
import { LanguageSwitcher } from '@/features/language'
import { ThemeSwitcher } from '@/features/theme'
import { PLATFORM } from '@/shared/config/platform'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { SITE_TAGLINE } from '@/shared/lib/seo/seoText'
import { Container } from '@/shared/ui/Container/Container'
import styles from './Footer.module.css'
import { FooterColumn } from './FooterColumn'

const COLUMNS = [
  {
    title: msg`Book`,
    links: [
      { href: '/', label: msg`Catalogue` },
      { href: '/map', label: msg`Nearby on the map` },
      {
        href: '/top',
        label: msg({ message: 'Top specialists', context: 'footer link to the leaderboard' }),
      },
    ],
  },
  {
    title: msg`For business`,
    links: [
      { href: '/business', label: msg`How it works` },
      { href: '/business/new', label: msg`Add your business` },
      { href: '/manage', label: msg`Dashboard` },
      { href: '/updates', label: msg`What's new` },
    ],
  },
  {
    title: msg`Account`,
    links: [
      { href: '/bookings', label: msg`Profile and bookings` },
      { href: '/login', label: msg`Sign in with your number` },
    ],
  },
]

// Like apple.com: fine print first, link columns (collapsible on phones), then a quiet bottom row.
export const Footer = () => {
  const { t } = useLingui()

  return (
    <footer data-site-footer className={styles.footer}>
      <Container className={styles.inner}>
        <nav className={styles.columns} aria-label={t`Site map`}>
          {COLUMNS.map((column) => (
            <FooterColumn key={column.title.id} className={styles.column}>
              <summary className={styles.columnTitle}>
                {t(column.title)}
                <CaretDown className={styles.caret} aria-hidden />
              </summary>
              <ul className={styles.links}>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <NextLink href={link.href} className={styles.link}>
                      {t(link.label)}
                    </NextLink>
                  </li>
                ))}
              </ul>
            </FooterColumn>
          ))}
        </nav>

        <div className={styles.bottom}>
          <p className={styles.legal}>
            <span className={styles.name}>{PLATFORM.name}</span> · {t(SITE_TAGLINE)}
          </p>
          <div className={styles.settings}>
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </Container>
    </footer>
  )
}
