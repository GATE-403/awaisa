'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { Trans, useLingui } from '@lingui/react/macro'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { saveBooking } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api/apiError'
import { getBooking } from '@/shared/api/clientApi'
import { Link as NextLink, useRouter } from '@/shared/i18n/navigation'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import styles from './VisitLinkPage.module.css'

interface VisitLinkPageProps {
  bookingId: string
}

// Opened from the confirmation or reminder SMS: the signed link becomes this booking's token on
// the phone, so «Bookings» show it with «Reschedule» and «Cancel» - no sign-in, no other device.
export const VisitLinkPage = ({ bookingId }: VisitLinkPageProps) => {
  const { t } = useLingui()
  const router = useRouter()
  const signature = useSearchParams().get('s')
  const [loadError, setError] = useState<string | null>(null)
  const error = signature ? loadError : t`The link is missing its signature`

  useEffect(() => {
    if (!signature) return
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
            <PageTitle size='sm' title={t`The link did not open.`} subtitle={error} />
            <NextLink href='/bookings' className={styles.link}>
              <Trans>My bookings ›</Trans>
            </NextLink>
          </>
        ) : (
          <>
            <PageTitle
              size='sm'
              title={t`Opening your booking…`}
              subtitle={t`We’ll save it on this phone.`}
            />
            <Skeleton className={styles.skeleton} />
          </>
        )}
      </Container>
    </main>
  )
}
