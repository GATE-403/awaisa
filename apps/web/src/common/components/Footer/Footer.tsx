import { Link } from '@awaisa/ui/Link'
import NextLink from 'next/link'
import { PLATFORM } from '@/constants/platform'
import { Container } from '../Container/Container'
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher'
import { ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher'
import styles from './Footer.module.css'

export const Footer = () => (
  <footer className={styles.footer}>
    <Container className={styles.inner}>
      <div className={styles.info}>
        <p className={styles.name}>{PLATFORM.name}</p>
        <p>{PLATFORM.tagline}</p>
        <Link variant='muted' render={<NextLink href='/business' />}>
          Для бизнеса
        </Link>
      </div>
      <div className={styles.settings}>
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
    </Container>
  </footer>
)
