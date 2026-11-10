'use client'

import { Avatar } from '@awaisa/ui/Avatar'
import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import { AppearancePicker } from '@/features/theme'
import { getMasterPlaces } from '@/shared/api/clientApi'
import type { Customer, MasterPlace } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './AccountSheet.module.css'

interface AccountSheetProps {
  customer: Customer
  onEditName: () => void
  onClose: () => void
}

// Everything about the account in one Settings-style sheet, so the page itself is only bookings.
export const AccountSheet = ({ customer, onEditName, onClose }: AccountSheetProps) => {
  const session = useSession()
  const router = useRouter()
  const [places, setPlaces] = useState<MasterPlace[]>([])

  useEffect(() => {
    const controller = new AbortController()
    getMasterPlaces(controller.signal)
      .then(setPlaces)
      .catch(() => undefined)

    return () => controller.abort()
  }, [])

  const handleSignOut = async () => {
    await session.signOut()
    onClose()
    router.replace('/')
  }

  return (
    <Sheet title='Аккаунт' cancelLabel='Готово' onClose={onClose}>
      <div className={styles.identity}>
        <Avatar
          name={customer.name || customer.phone.slice(-2)}
          size='xl'
          className={styles.avatar}
        />
        <p className={styles.name}>{customer.name || 'Без имени'}</p>
        <p className={styles.phone}>{formatPhone(customer.phone)}</p>
        <button type='button' className={styles.edit} onClick={onEditName}>
          {customer.name ? 'Изменить имя' : 'Указать имя'}
        </button>
      </div>

      <section className={sheet.group} aria-label='Оформление'>
        <h3 className={sheet.groupTitle}>Оформление</h3>
        <div className={sheet.list}>
          <AppearancePicker />
        </div>
      </section>

      <section className={sheet.group} aria-label='Бизнес'>
        <h3 className={sheet.groupTitle}>Бизнес</h3>
        <div className={sheet.list}>
          {places.length > 0 && (
            <NextLink href='/master' className={sheet.row} onClick={onClose}>
              <span className={sheet.rowLabel}>Мой день</span>
              <span className={styles.rowHint}>
                {places.length === 1 ? places[0]?.businessName : `${places.length} места`}
              </span>
              <CaretRight className={styles.chevron} weight='bold' aria-hidden />
            </NextLink>
          )}
          <NextLink href='/manage' className={sheet.row} onClick={onClose}>
            <span className={sheet.rowLabel}>Мои бизнесы</span>
            <CaretRight className={styles.chevron} weight='bold' aria-hidden />
          </NextLink>
          <NextLink href='/business/new' className={sheet.row} onClick={onClose}>
            <span className={sheet.rowLabel}>Подключить бизнес</span>
            <CaretRight className={styles.chevron} weight='bold' aria-hidden />
          </NextLink>
        </div>
      </section>

      <div className={sheet.list}>
        <button type='button' className={sheet.danger} onClick={handleSignOut}>
          Выйти
        </button>
      </div>
    </Sheet>
  )
}
