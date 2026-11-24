'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import type { MessageDescriptor } from '@lingui/core'
import { msg, ph } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { CheckCircle, LockSimple, WarningCircle } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { BusinessTile } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import { completeTestPayment, syncPayment } from '@/shared/api/clientApi'
import type { PaymentPage } from '@/shared/api/types'
import { useLocale } from '@/shared/i18n'
import { INTL_LOCALES } from '@/shared/i18n/locales'
import { Link as NextLink, useRouter } from '@/shared/i18n/navigation'
import { useFormat } from '@/shared/i18n/useFormat'
import { haptic } from '@/shared/lib/nativeBridge'
import { trackStep } from '@/shared/lib/telemetry'
import { Container } from '@/shared/ui/Container/Container'
import styles from './PayPage.module.css'

// What the payment is at: the booking's place, or the order's.
const businessOf = (payment: PaymentPage) =>
  payment.booking?.business ?? payment.order?.business ?? { name: '', slug: '' }

type OrderCopy = {
  doneTitle: MessageDescriptor
  doneHref: (slug: string) => string
  doneLabel: MessageDescriptor
  expiredText: MessageDescriptor
  retryHref: (slug: string) => string
  retryLabel: MessageDescriptor
}

// What a paid or expired order says and where it leads, per order kind.
const GIFT_COPY: OrderCopy = {
  doneTitle: msg`Paid. Your certificate is ready`,
  doneHref: (slug) => `/${slug}`,
  doneLabel: msg`To the place's page`,
  expiredText: msg`No money was taken. Order the certificate again.`,
  retryHref: (slug) => `/${slug}#gift`,
  retryLabel: msg`To certificates`,
}

const ORDER_COPY: Partial<Record<string, OrderCopy>> = {
  subscription: {
    doneTitle: msg`Paid. The pass is yours`,
    doneHref: () => '/bookings',
    doneLabel: msg`My passes and bookings`,
    expiredText: msg`No money was taken. Order the pass again.`,
    retryHref: (slug) => `/${slug}#subscriptions`,
    retryLabel: msg`To passes`,
  },
  billing: {
    doneTitle: msg`Paid`,
    doneHref: (slug) => `/manage/${slug}?tab=billing`,
    doneLabel: msg`Back to the dashboard`,
    expiredText: msg`No money was taken. Pay again in “Plan”.`,
    retryHref: (slug) => `/manage/${slug}?tab=billing`,
    retryLabel: msg`To the plan`,
  },
}

interface PayPageProps {
  payment: PaymentPage | null
  signature: string
}

// The checkout of a deposit or an order (a gift certificate, a subscription, the business's plan). With PAYMENT_DRIVER=test this page
// is the acquirer; a real one sends the client to its own form and back here. A paid deposit
// goes on to /bookings?paid=<booking>; a paid order says so right here.
export const PayPage = ({ payment, signature }: PayPageProps) => {
  const { t } = useLingui()
  const format = useFormat()
  const locale = useLocale()
  const router = useRouter()
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [isChecking, setIsChecking] = useState(
    payment?.driver === 'freedompay' && payment.status === 'pending',
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: once per visit
  useEffect(() => {
    if (payment) trackStep('checkout_open', businessOf(payment).slug)
  }, [])

  // Back from Freedom Pay's page: ask how the payment went before showing "pay" again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per visit
  useEffect(() => {
    if (!payment || payment.driver !== 'freedompay' || payment.status !== 'pending') return
    syncPayment(payment.id, signature)
      .then((result) => {
        if (result.status !== 'succeeded') {
          setIsChecking(false)
          return
        }
        trackStep('paid', businessOf(payment).slug)
        if (result.bookingId) router.replace(`/bookings?paid=${result.bookingId}`)
        else setIsDone(true)
      })
      .catch(() => setIsChecking(false))
  }, [])

  if (!payment) {
    return (
      <main className={styles.page}>
        <Container size='sm' className={styles.content}>
          <div className={styles.card}>
            <WarningCircle
              weight='fill'
              className={styles.stateIcon}
              data-tone='danger'
              aria-hidden
            />
            <h1 className={styles.title}>
              <Trans>The link didn't open</Trans>
            </h1>
            <p className={styles.text}>
              <Trans>Check the link or open the booking in your profile.</Trans>
            </p>
            <NextLink href='/bookings' className={styles.link}>
              <Trans>My bookings ›</Trans>
            </NextLink>
          </div>
        </Container>
      </main>
    )
  }

  const { booking, order } = payment
  const business = businessOf(payment)
  const isPaid =
    isDone ||
    payment.status === 'succeeded' ||
    booking?.paymentStatus === 'paid' ||
    order?.status === 'paid'
  const isExpired =
    booking?.paymentStatus === 'expired' ||
    order?.status === 'expired' ||
    payment.status === 'failed'
  const dueAt = booking?.dueAt ?? order?.dueAt ?? null
  const copy = (order && ORDER_COPY[order.kind]) ?? GIFT_COPY
  const rest = booking ? format.price(Math.max(booking.price - payment.amount, 0)) : ''
  const dueTime = dueAt
    ? new Date(dueAt).toLocaleTimeString(INTL_LOCALES[locale], {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bishkek',
      })
    : ''

  const handlePay = async () => {
    const slug = business.slug
    setIsPaying(true)
    setError(null)
    trackStep('pay_click', slug)
    try {
      const result = await completeTestPayment(payment.id, signature)
      haptic('success')
      trackStep('paid', slug)
      if (result.bookingId) router.replace(`/bookings?paid=${result.bookingId}`)
      else {
        setIsDone(true)
        setIsPaying(false)
      }
    } catch (payError) {
      haptic('error')
      trackStep('pay_failed', slug)
      setError(getErrorMessage(payError))
      setIsPaying(false)
    }
  }

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        <div className={styles.card}>
          <div className={styles.place}>
            <BusinessTile name={business.name} size='md' />
            <div>
              <p className={styles.placeName}>{business.name}</p>
              <p className={styles.placeMeta}>
                {booking
                  ? `${booking.serviceName} · ${format.dayLong(booking.date)}, ${booking.time}`
                  : order?.title}
              </p>
            </div>
          </div>

          <div className={styles.amount}>
            <p className={styles.amountLabel}>{booking ? t`Deposit` : t`To pay`}</p>
            <p className={styles.amountValue}>{format.price(payment.amount)}</p>
            {booking ? (
              <p className={styles.amountNote}>
                <Trans>The rest, {rest}, at the salon. Refunded if you cancel a day ahead.</Trans>
              </p>
            ) : (
              order?.details && <p className={styles.amountNote}>{order.details}</p>
            )}
          </div>

          {isPaid && order ? (
            <div className={styles.state}>
              <CheckCircle
                weight='fill'
                className={styles.stateIcon}
                data-tone='success'
                aria-hidden
              />
              <p className={styles.stateTitle}>{t(copy.doneTitle)}</p>
              <p className={styles.text}>{order.doneText}</p>
              <ButtonLink
                render={<NextLink href={copy.doneHref(business.slug)} />}
                size='lg'
                fullWidth
              >
                {t(copy.doneLabel)}
              </ButtonLink>
            </div>
          ) : isPaid ? (
            <div className={styles.state}>
              <CheckCircle
                weight='fill'
                className={styles.stateIcon}
                data-tone='success'
                aria-hidden
              />
              <p className={styles.stateTitle}>
                <Trans>Paid - you're booked</Trans>
              </p>
              <ButtonLink render={<NextLink href='/bookings' />} size='lg' fullWidth>
                <Trans>My bookings</Trans>
              </ButtonLink>
            </div>
          ) : isExpired && order ? (
            <div className={styles.state}>
              <WarningCircle
                weight='fill'
                className={styles.stateIcon}
                data-tone='danger'
                aria-hidden
              />
              <p className={styles.stateTitle}>
                <Trans>Time to pay has run out</Trans>
              </p>
              <p className={styles.text}>{t(copy.expiredText)}</p>
              <ButtonLink
                render={<NextLink href={copy.retryHref(business.slug)} />}
                size='lg'
                fullWidth
              >
                {t(copy.retryLabel)}
              </ButtonLink>
            </div>
          ) : isExpired ? (
            <div className={styles.state}>
              <WarningCircle
                weight='fill'
                className={styles.stateIcon}
                data-tone='danger'
                aria-hidden
              />
              <p className={styles.stateTitle}>
                <Trans>Time to pay has run out</Trans>
              </p>
              <p className={styles.text}>
                <Trans>The booking was released and the time is free again. Choose it again.</Trans>
              </p>
              <ButtonLink render={<NextLink href={`/${business.slug}/book`} />} size='lg' fullWidth>
                <Trans>Book again</Trans>
              </ButtonLink>
            </div>
          ) : (
            <div className={styles.state}>
              {payment.driver === 'test' && (
                <p className={styles.testBadge}>
                  <Trans>Test mode - no money is taken</Trans>
                </p>
              )}
              {payment.driver === 'freedompay' && payment.checkoutUrl ? (
                <ButtonLink
                  size='lg'
                  fullWidth
                  render={
                    // biome-ignore lint/a11y/useAnchorContent: content comes from ButtonLink children via render
                    <a
                      href={payment.checkoutUrl}
                      onClick={() => trackStep('pay_click', business.slug)}
                    />
                  }
                >
                  <LockSimple aria-hidden />
                  {isChecking
                    ? t`Checking the payment…`
                    : t`Pay ${ph({ amount: format.price(payment.amount) })}`}
                </ButtonLink>
              ) : (
                <Button size='lg' fullWidth onClick={handlePay} disabled={isPaying}>
                  <LockSimple aria-hidden />
                  {isPaying ? t`Paying…` : t`Pay ${ph({ amount: format.price(payment.amount) })}`}
                </Button>
              )}
              {payment.driver === 'freedompay' && (
                <p className={styles.text}>
                  <Trans>Card payment through Freedom Pay.</Trans>
                </p>
              )}
              {dueAt && (
                <p className={styles.text}>
                  {booking
                    ? t`We hold the time until ${ph({ time: dueTime })}, then it is released.`
                    : t`Pay by ${ph({ time: dueTime })}.`}
                </p>
              )}
              {error && (
                <p className={styles.error} role='alert'>
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </Container>
    </main>
  )
}
