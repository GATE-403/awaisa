'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import NextLink from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { saveBooking } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api/apiError'
import { getBooking } from '@/shared/api/clientApi'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import styles from './VisitLinkPage.module.css'

interface VisitLinkPageProps {
  bookingId: string
}

// Opened from the confirmation or reminder SMS: the signed link becomes this booking's token on
// the phone, so «Записи» show it with «Перенести» and «Отменить» — no sign-in, no other device.
export const VisitLinkPage = ({ bookingId }: VisitLinkPageProps) => {
  const router = useRouter()
  const signature = useSearchParams().get('s')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!signature) {
      setError('В ссылке не хватает подписи')
      return
    }
    const controller = new AbortController()
    const token = `sig.${signature}`
    getBooking(bookingId, token, controller.signal)
      .then((booking) => {
        saveBooking({ id: booking.id, token, snapshot: booking })
        router.replace('/bookings')
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(loadError))
      })

    return () => controller.abort()
  }, [bookingId, signature, router])

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        {error ? (
          <>
            <PageTitle size='sm' title='Ссылка не открылась.' subtitle={error} />
            <NextLink href='/bookings' className={styles.link}>
              Мои записи ›
            </NextLink>
          </>
        ) : (
          <>
            <PageTitle
              size='sm'
              title='Открываем запись…'
              subtitle='Сохраним её на этом телефоне.'
            />
            <Skeleton className={styles.skeleton} />
          </>
        )}
      </Container>
    </main>
  )
}
