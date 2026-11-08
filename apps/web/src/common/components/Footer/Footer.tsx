import { Link } from '@awaisa/ui/Link'
import { COMPANY } from '@/constants/company'
import { Container } from '../Container/Container'
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher'
import styles from './Footer.module.css'

export const Footer = () => (
  <footer className={styles.footer}>
    <Container className={styles.inner}>
      <div className={styles.info}>
        <p className={styles.name}>{COMPANY.name}</p>
        <p>{COMPANY.address}</p>
        <p>{COMPANY.hours}</p>
        <Link variant='muted' href={COMPANY.phoneHref}>
          {COMPANY.phone}
        </Link>
      </div>
      <LanguageSwitcher />
    </Container>
  </footer>
)
