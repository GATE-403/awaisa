import { useLingui } from '@lingui/react/macro'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { Logo } from '@/shared/ui/Logo/Logo'
import styles from './Header.module.css'

// Static shell shown while the URL-aware header resolves on dynamic routes; same height as the header.
export const HeaderFallback = () => {
  const { t } = useLingui()

  return (
    <header className={styles.header}>
      <div className={styles.inner} style={{ minHeight: 'var(--header-height)' }}>
        <NextLink href='/' className={styles.home} aria-label={t`Home`}>
          <Logo />
        </NextLink>
      </div>
    </header>
  )
}
