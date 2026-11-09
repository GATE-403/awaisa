'use client'

import { Avatar } from '@awaisa/ui/Avatar'
import { ButtonLink } from '@awaisa/ui/Button'
import { UserCircle } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useState } from 'react'
import { useSession } from '@/entities/session'
import { formatPhone } from '@/shared/lib/formatPhone'
import { NameDialog } from '../NameDialog'
import styles from './AccountCard.module.css'

// The top of the profile: who you are, or one tap to sign in and keep bookings on every device.
export const AccountCard = () => {
  const session = useSession()
  const [isEditingName, setIsEditingName] = useState(false)
  const customer = session.customer

  if (session.status === 'loading') return <div className={styles.placeholder} />

  if (!customer) {
    return (
      <section className={styles.card} aria-label='Аккаунт'>
        <span className={styles.guestIcon} aria-hidden='true'>
          <UserCircle weight='fill' />
        </span>
        <div className={styles.text}>
          <h1 className={styles.name}>Профиль</h1>
          <p className={styles.meta}>
            Записи ниже хранятся на этом устройстве. Войдите по номеру — они будут везде, а SMS
            напомнят о визите.
          </p>
        </div>
        <ButtonLink size='sm' render={<NextLink href='/login?next=/bookings' />}>
          Войти
        </ButtonLink>
      </section>
    )
  }

  return (
    <section className={styles.card} aria-label='Аккаунт'>
      <Avatar
        name={customer.name || customer.phone.slice(-2)}
        size='xl'
        className={styles.avatar}
      />
      <div className={styles.text}>
        <h1 className={styles.name}>{customer.name || 'Без имени'}</h1>
        <p className={styles.meta}>{formatPhone(customer.phone)} · записи на любом устройстве</p>
      </div>
      <button type='button' className={styles.edit} onClick={() => setIsEditingName(true)}>
        {customer.name ? 'Изменить' : 'Указать имя'}
      </button>

      {isEditingName && (
        <NameDialog
          name={customer.name}
          onClose={() => setIsEditingName(false)}
          onSaved={session.setCustomer}
        />
      )}
    </section>
  )
}
