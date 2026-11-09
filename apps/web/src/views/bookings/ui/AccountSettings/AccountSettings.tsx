'use client'

import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from '@/entities/session'
import { ThemeSwitcher } from '@/features/theme'
import styles from './AccountSettings.module.css'

const BUSINESS_LINKS = [
  { href: '/manage', label: 'Мои бизнесы' },
  { href: '/business/new', label: 'Создать страницу бизнеса' },
]

// The settings half of the profile, as Settings-style inset groups under the bookings.
export const AccountSettings = () => {
  const session = useSession()
  const router = useRouter()
  const isSignedIn = session.status === 'signedIn'

  const handleSignOut = async () => {
    await session.signOut()
    router.replace('/')
  }

  return (
    <div className={styles.settings}>
      {isSignedIn && (
        <section className={styles.group} aria-label='Бизнес'>
          <h2 className={styles.groupTitle}>Бизнес</h2>
          <ul className={styles.list}>
            {BUSINESS_LINKS.map((link) => (
              <li key={link.href}>
                <NextLink href={link.href} className={styles.row}>
                  {link.label}
                  <CaretRight className={styles.chevron} weight='bold' aria-hidden />
                </NextLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.group} aria-label='Оформление'>
        <h2 className={styles.groupTitle}>Оформление</h2>
        <div className={styles.list}>
          <div className={styles.row}>
            Тема
            <ThemeSwitcher />
          </div>
        </div>
      </section>

      {isSignedIn && (
        <div className={styles.list}>
          <button type='button' className={styles.signOut} onClick={handleSignOut}>
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}
