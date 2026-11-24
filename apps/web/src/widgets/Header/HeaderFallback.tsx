import NextLink from 'next/link'
import { Logo } from '@/shared/ui/Logo/Logo'
import styles from './Header.module.css'

// Static shell shown while the URL-aware header resolves on dynamic routes; same height as the header.
export const HeaderFallback = () => (
  <header className={styles.header}>
    <div className={styles.inner} style={{ minHeight: 'var(--header-height)' }}>
      <NextLink href='/' className={styles.home} aria-label='Home'>
        <Logo />
      </NextLink>
    </div>
  </header>
)
