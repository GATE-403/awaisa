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

interface PayPageProps {
  payment: PaymentPage | null
  signature: string
}

// The deposit checkout. With PAYMENT_DRIVER=test this page is the acquirer; a real one sends the
// client to its own form and back to /bookings?paid=<booking>.
export const PayPage = ({ payment, signature }: PayPageProps) => {
  const router = useRouter()
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(
    payment?.driver === 'freedompay' && payment.status === 'pending',
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: once per visit
  useEffect(() => {
    if (payment) trackStep('checkout_open', payment.booking.business.slug)
  }, [])

  // Back from Freedom Pay's page: ask how the payment went before showing «pay» again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per visit
  useEffect(() => {
    if (!payment || payment.driver !== 'freedompay' || payment.status !== 'pending') return
    syncPayment(payment.id, signature)
      .then((result) => {
        if (result.status === 'succeeded') {
          trackStep('paid', payment.booking.business.slug)
          router.replace(`/bookings?paid=${result.bookingId}`)
        } else setIsChecking(false)
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

  const { booking } = payment
  const isPaid = payment.status === 'succeeded' || booking.paymentStatus === 'paid'
  const isExpired = booking.paymentStatus === 'expired' || payment.status === 'failed'

  const handlePay = async () => {
    const slug = booking.business.slug
    setIsPaying(true)
    setError(null)
    trackStep('pay_click', slug)
    try {
      const result = await completeTestPayment(payment.id, signature)
      haptic('success')
      trackStep('paid', slug)
      router.replace(`/bookings?paid=${result.bookingId}`)
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
            <BusinessTile name={booking.business.name} size='md' />
            <div>
              <p className={styles.placeName}>{booking.business.name}</p>
              <p className={styles.placeMeta}>
                {booking.serviceName} · {formatDayLong(booking.date)}, {booking.time}
              </p>
            </div>
          </div>

          <div className={styles.amount}>
            <p className={styles.amountLabel}>Предоплата</p>
            <p className={styles.amountValue}>{formatPrice(payment.amount)}</p>
            <p className={styles.amountNote}>
              Остальное — {formatPrice(Math.max(booking.price - payment.amount, 0))} в салоне.
              Вернём, если отмените за сутки.
            </p>
          </div>

          {isPaid ? (
            <div className={styles.state}>
              <CheckCircle
                weight='fill'
                className={styles.stateIcon}
                data-tone='success'
                aria-hidden
              />
              <p className={styles.stateTitle}>Оплачено — вы записаны</p>
              <ButtonLink render={<NextLink href='/bookings' />} size='lg' fullWidth>
                Мои записи
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
              <ButtonLink
                render={<NextLink href={`/${booking.business.slug}/book`} />}
                size='lg'
                fullWidth
              >
                Записаться снова
              </ButtonLink>
            </div>
          ) : (
            <div className={styles.state}>
              {payment.driver === 'test' && (
                <p className={styles.testBadge}>Тестовый режим — деньги не списываются</p>
              )}
              {payment.driver === 'freedompay' && payment.checkoutUrl ? (
                <ButtonLink
                  size='lg'
                  fullWidth
                  render={
                    // biome-ignore lint/a11y/useAnchorContent: content comes from ButtonLink children via render
                    <a
                      href={payment.checkoutUrl}
                      onClick={() => trackStep('pay_click', booking.business.slug)}
                    />
                  }
                >
                  <LockSimple weight='fill' aria-hidden />
                  {isChecking ? 'Проверяем оплату…' : `Оплатить ${formatPrice(payment.amount)}`}
                </ButtonLink>
              ) : (
                <Button size='lg' fullWidth onClick={handlePay} disabled={isPaying}>
                  <LockSimple weight='fill' aria-hidden />
                  {isPaying ? 'Оплачиваем…' : `Оплатить ${formatPrice(payment.amount)}`}
                </Button>
              )}
              {payment.driver === 'freedompay' && (
                <p className={styles.text}>Оплата картой через Freedom Pay.</p>
              )}
              {booking.dueAt && (
                <p className={styles.text}>
                  Время держим до{' '}
                  {new Date(booking.dueAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Bishkek',
                  })}
                  , потом оно освободится.
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
