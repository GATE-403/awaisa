'use client'

import { Avatar } from '@awaisa/ui/Avatar'
import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Container } from '@/common/components/Container/Container'
import { ThemeSwitcher } from '@/common/components/ThemeSwitcher/ThemeSwitcher'
import { useRequireSession } from '@/common/hooks/useRequireSession'
import { formatPhone } from '@/common/utils/formatPhone'
import { NameDialog } from './components/NameDialog'
import styles from './ProfilePage.module.css'

const LINK_GROUPS = [
  { title: 'Записи', links: [{ href: '/bookings', label: 'Мои записи' }] },
  {
    title: 'Бизнес',
    links: [
      { href: '/manage', label: 'Мои бизнесы' },
      { href: '/business/new', label: 'Создать страницу бизнеса' },
    ],
  },
]

export const ProfilePage = () => {
  const session = useRequireSession()
  const router = useRouter()
  const [isEditingName, setIsEditingName] = useState(false)
  const customer = session.customer

  const handleSignOut = async () => {
    await session.signOut()
    router.replace('/')
  }

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        {!customer && <Skeleton className={styles.skeleton} />}

        {customer && (
          <>
            <header className={styles.hero}>
              <Avatar
                name={customer.name || customer.phone.slice(-2)}
                size='xl'
                className={styles.avatar}
              />
              <h1 className={styles.name}>{customer.name || 'Без имени'}</h1>
              <p className={styles.phone}>{formatPhone(customer.phone)}</p>
              <Button variant='link' size='sm' onClick={() => setIsEditingName(true)}>
                {customer.name ? 'Изменить имя' : 'Указать имя'}
              </Button>
            </header>

            {LINK_GROUPS.map((group) => (
              <section key={group.title} className={styles.group} aria-label={group.title}>
                <h2 className={styles.groupTitle}>{group.title}</h2>
                <ul className={styles.list}>
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <NextLink href={link.href} className={styles.row}>
                        {link.label}
                        <CaretRight className={styles.chevron} weight='bold' aria-hidden />
                      </NextLink>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className={styles.group} aria-label='Оформление'>
              <h2 className={styles.groupTitle}>Оформление</h2>
              <div className={styles.list}>
                <div className={styles.row}>
                  Тема
                  <ThemeSwitcher />
                </div>
              </div>
            </section>

            <div className={styles.list}>
              <button type='button' className={styles.signOut} onClick={handleSignOut}>
                Выйти
              </button>
            </div>
          </>
        )}
      </Container>

      {isEditingName && customer && (
        <NameDialog
          name={customer.name}
          onClose={() => setIsEditingName(false)}
          onSaved={session.setCustomer}
        />
      )}
    </main>
  )
}
