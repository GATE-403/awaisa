'use client'

import { Avatar } from '@awaisa/ui/Avatar'
import { ButtonLink } from '@awaisa/ui/Button'
import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useState } from 'react'
import { useSession } from '@/entities/session'
import { formatPhone } from '@/shared/lib/formatPhone'
import { AccountSheet } from '../AccountSheet/AccountSheet'
import { NameDialog } from '../NameDialog'
import styles from './AccountCard.module.css'

// The account as one row, like the Apple ID row in Settings; everything else opens in a sheet.
export const AccountCard = () => {
  const session = useSession()
  const [panel, setPanel] = useState<'account' | 'name' | null>(null)
  const customer = session.customer

  if (session.status === 'loading') return <div className={styles.placeholder} />

  if (!customer) {
    return (
      <section className={styles.guest} aria-label='Аккаунт'>
        <div className={styles.text}>
          <h1 className={styles.title}>Ваши записи</h1>
          <p className={styles.meta}>Только на этом телефоне. Войдите — будут везде.</p>
        </div>
        <ButtonLink size='sm' render={<NextLink href='/login?next=/bookings' />}>
          Войти
        </ButtonLink>
      </section>
    )
  }

  return (
    <section aria-label='Аккаунт'>
      <h1 className={styles.srOnly}>Профиль</h1>
      <button type='button' className={styles.row} onClick={() => setPanel('account')}>
        <Avatar name={customer.name || customer.phone.slice(-2)} size='lg' />
        <span className={styles.text}>
          <span className={styles.name}>{customer.name || 'Без имени'}</span>
          <span className={styles.meta}>{formatPhone(customer.phone)} · тема, бизнес, выход</span>
        </span>
        <CaretRight className={styles.chevron} weight='bold' aria-hidden />
      </button>

      {panel === 'account' && (
        <AccountSheet
          customer={customer}
          onEditName={() => setPanel('name')}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'name' && (
        <NameDialog
          name={customer.name}
          onClose={() => setPanel('account')}
          onSaved={session.setCustomer}
        />
      )}
    </section>
  )
}
