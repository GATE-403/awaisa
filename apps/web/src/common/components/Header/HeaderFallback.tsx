import NextLink from 'next/link'
import { Logo } from '../Logo/Logo'
import styles from './Header.module.css'

// Static shell shown while the URL-aware header resolves on dynamic routes.
export const HeaderFallback = () => (
  <header className={styles.header}>
    <div className={styles.inner}>
      <NextLink href='/' className={styles.home} aria-label='На главную'>
        <Logo />
      </NextLink>
    </div>
  </header>
)
