'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { CheckCircle, LockSimple, WarningCircle } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatDayLong, formatPrice } from '@/entities/booking'
import { BusinessTile } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import { completeTestPayment, syncPayment } from '@/shared/api/clientApi'
import type { PaymentPage } from '@/shared/api/types'
import { haptic } from '@/shared/lib/nativeBridge'
import { trackStep } from '@/shared/lib/telemetry'
import { Container } from '@/shared/ui/Container/Container'
import styles from './PayPage.module.css'

// What the payment is at: the booking's place, or the order's.
const businessOf = (payment: PaymentPage) =>
  payment.booking?.business ?? payment.order?.business ?? { name: '', slug: '' }

type OrderCopy = {
  doneTitle: string
  doneHref: (slug: string) => string
  doneLabel: string
  expiredText: string
  retryHref: (slug: string) => string
  retryLabel: string
}

// What a paid or expired order says and where it leads, per order kind.
const GIFT_COPY: OrderCopy = {
  doneTitle: 'Оплачено. Сертификат готов',
  doneHref: (slug) => `/${slug}`,
  doneLabel: 'На страницу места',
  expiredText: 'Деньги не списаны. Оформите сертификат снова.',
  retryHref: (slug) => `/${slug}#gift`,
  retryLabel: 'К сертификатам',
}

const ORDER_COPY: Partial<Record<string, OrderCopy>> = {
  subscription: {
    doneTitle: 'Оплачено. Абонемент ваш',
    doneHref: () => '/bookings',
    doneLabel: 'Мои абонементы и записи',
    expiredText: 'Деньги не списаны. Оформите абонемент снова.',
    retryHref: (slug) => `/${slug}#subscriptions`,
    retryLabel: 'К абонементам',
  },
  billing: {
    doneTitle: 'Paid',
    doneHref: (slug) => `/manage/${slug}?tab=billing`,
    doneLabel: 'Вернуться в кабинет',
    expiredText: 'Деньги не списаны. Оплатите снова в «Тарифе».',
    retryHref: (slug) => `/manage/${slug}?tab=billing`,
    retryLabel: 'К тарифу',
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

  // Back from Freedom Pay's page: ask how the payment went before showing «pay» again.
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
            <h1 className={styles.title}>Ссылка не открылась</h1>
            <p className={styles.text}>Проверьте ссылку или откройте запись в профиле.</p>
            <NextLink href='/bookings' className={styles.link}>
              Мои записи ›
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
                  ? `${booking.serviceName} · ${formatDayLong(booking.date)}, ${booking.time}`
                  : order?.title}
              </p>
            </div>
          </div>

          <div className={styles.amount}>
            <p className={styles.amountLabel}>{booking ? 'Deposit' : 'To pay'}</p>
            <p className={styles.amountValue}>{formatPrice(payment.amount)}</p>
            {booking ? (
              <p className={styles.amountNote}>
                Остальное: {formatPrice(Math.max(booking.price - payment.amount, 0))} в салоне.
                Вернём, если отмените за сутки.
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
              <p className={styles.stateTitle}>{copy.doneTitle}</p>
              <p className={styles.text}>{order.doneText}</p>
              <ButtonLink
                render={<NextLink href={copy.doneHref(business.slug)} />}
                size='lg'
                fullWidth
              >
                {copy.doneLabel}
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
              <p className={styles.stateTitle}>Оплачено - вы записаны</p>
              <ButtonLink render={<NextLink href='/bookings' />} size='lg' fullWidth>
                Мои записи
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
              <p className={styles.stateTitle}>Время на оплату вышло</p>
              <p className={styles.text}>{copy.expiredText}</p>
              <ButtonLink
                render={<NextLink href={copy.retryHref(business.slug)} />}
                size='lg'
                fullWidth
              >
                {copy.retryLabel}
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
              <p className={styles.stateTitle}>Время на оплату вышло</p>
              <p className={styles.text}>Запись снята, время освободилось. Выберите его снова.</p>
              <ButtonLink render={<NextLink href={`/${business.slug}/book`} />} size='lg' fullWidth>
                Записаться снова
              </ButtonLink>
            </div>
          ) : (
            <div className={styles.state}>
              {payment.driver === 'test' && (
                <p className={styles.testBadge}>Тестовый режим - деньги не списываются</p>
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
                  {isChecking ? 'Проверяем оплату…' : `Оплатить ${formatPrice(payment.amount)}`}
                </ButtonLink>
              ) : (
                <Button size='lg' fullWidth onClick={handlePay} disabled={isPaying}>
                  <LockSimple aria-hidden />
                  {isPaying ? 'Оплачиваем…' : `Оплатить ${formatPrice(payment.amount)}`}
                </Button>
              )}
              {payment.driver === 'freedompay' && (
                <p className={styles.text}>Оплата картой через Freedom Pay.</p>
              )}
              {dueAt && (
                <p className={styles.text}>
                  {booking ? 'Время держим до ' : 'Оплатите до '}
                  {new Date(dueAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Bishkek',
                  })}
                  {booking ? ', потом оно освободится.' : '.'}
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
