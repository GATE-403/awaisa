'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { ChatText, Phone } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatPrice, getDaysAround } from '@/entities/booking'
import { addMinutes, formatClock, parseClock } from '@/entities/business'
import { useRequireSession } from '@/entities/session'
import { CalendarFeedGroup } from '@/features/calendarFeed'
import { PushAlertsGroup } from '@/features/pushAlerts'
import { getErrorMessage } from '@/shared/api/apiError'
import { getMasterDay, setMasterOutcome } from '@/shared/api/clientApi'
import type { AdminBooking, MasterDay, VisitOutcome } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useToday } from '@/shared/lib/hooks/useToday'
import { haptic } from '@/shared/lib/nativeBridge'
import { pluralWord } from '@/shared/lib/plural'
import { Container } from '@/shared/ui/Container/Container'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { DayStrip } from '@/widgets/DayStrip'
import styles from './MasterDayPage.module.css'
import { MasterReviews } from './ui/MasterReviews'
import { VisitPhotoButton } from './ui/VisitPhotoButton'

interface MasterDayPageProps {
  slug: string
}

type Choice = 'pending' | VisitOutcome

const DAYS_SHOWN = 14
const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
]
const PAST_DAYS = 7
const FORBIDDEN = 403
const OUTCOMES: { value: Choice; label: string }[] = [
  { value: 'pending', label: 'Ждём' },
  { value: 'arrived', label: 'Пришёл' },
  { value: 'no_show', label: 'Не пришёл' },
]

const minutesUntil = (from: number, to: number) => {
  const left = to - from
  return left < 60
    ? `через ${left} мин`
    : `через ${Math.floor(left / 60)} ч ${left % 60 ? `${left % 60} мин` : ''}`.trim()
}

// The master's own day, phone first: who comes when, how to reach them, and closing each visit.
// Nothing about other masters or the business settings.
export const MasterDayPage = ({ slug }: MasterDayPageProps) => {
  const session = useRequireSession()
  const toast = useToast()
  const today = useToday()
  // A push about a booking links to its day (`?date=`), as the cabinet's schedule does.
  const linkedDate = useSearchParams().get('date')
  const [selectedDay, setSelectedDay] = useState<string | null>(linkedDate)
  const [day, setDay] = useState<MasterDay | null>(null)
  const [error, setError] = useState<{ message: string; isForbidden: boolean } | null>(null)
  const date = selectedDay ?? today?.dayKey ?? null
  const days = today ? getDaysAround(today.dayKey, PAST_DAYS, DAYS_SHOWN) : []
  const isSignedIn = session.status === 'signedIn'

  // A tapped notice for another day takes an already open page there.
  useEffect(() => {
    if (linkedDate) setSelectedDay(linkedDate)
  }, [linkedDate])

  useEffect(() => {
    if (!date || !isSignedIn) return
    const controller = new AbortController()
    setError(null)
    getMasterDay(slug, date, controller.signal)
      .then(setDay)
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return
        const status = (loadError as { status?: number }).status
        setError({ message: getErrorMessage(loadError), isForbidden: status === FORBIDDEN })
      })

    return () => controller.abort()
  }, [slug, date, isSignedIn])

  const live = day?.bookings.filter((booking) => booking.status === 'confirmed') ?? []
  const total = live.reduce(
    (sum, booking) =>
      booking.outcome === 'no_show' ? sum : sum + (booking.paidAmount ?? booking.price),
    0,
  )
  const isToday = date !== null && date === today?.dayKey
  const canMark = date !== null && today !== null && date <= today.dayKey
  const now = isToday && today ? today.minutes : null
  const current =
    now === null
      ? null
      : live.find((booking) => {
          const start = parseClock(booking.time)
          return start <= now && now < start + booking.durationMinutes
        })
  const next = now === null ? null : live.find((booking) => parseClock(booking.time) > now)

  const handleOutcome = async (booking: AdminBooking, choice: Choice) => {
    try {
      const updated = await setMasterOutcome(slug, booking.id, {
        outcome: choice === 'pending' ? null : choice,
      })
      haptic('selection')
      setDay((current) =>
        current
          ? {
              ...current,
              bookings: current.bookings.map((item) => (item.id === booking.id ? updated : item)),
            }
          : current,
      )
    } catch (outcomeError) {
      toast.show({
        title: 'Не получилось',
        description: getErrorMessage(outcomeError),
        type: 'error',
      })
    }
  }

  if (error?.isForbidden) {
    return (
      <main className={styles.page}>
        <Container size='sm' className={styles.content}>
          <PageTitle
            size='sm'
            title='Нет доступа.'
            subtitle='Этот номер не привязан к мастеру. Попросите владельца указать его в карточке мастера.'
          />
          <NextLink href='/bookings' className={styles.link}>
            В профиль ›
          </NextLink>
        </Container>
      </main>
    )
  }

  const hoursLine = !day
    ? null
    : day.leaveReason
      ? day.leaveReason
      : day.hours
        ? `Вы работаете ${formatClock(day.hours.opensMinutes)}–${formatClock(day.hours.closesMinutes)}`
        : 'Выходной'

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        <PageTitle
          size='sm'
          title='Мой день.'
          subtitle={day ? `${day.master.name} · ${day.business.name}` : ' '}
        />

        <DayStrip days={days} value={date} onChange={setSelectedDay} />

        {error && <p className={styles.error}>{error.message}</p>}
        {!day && !error && <Skeleton className={styles.skeleton} />}

        {day && (
          <>
            {/* The day's facts as one footnote line with bold figures, like the quiet profile
                (three tiles parted by lines read as a dashboard: «не соответствует философии»). */}
            <p className={styles.facts}>
              <b>{live.length}</b> {pluralWord(live.length, ['запись', 'записи', 'записей'])}
              {' · '}
              <b>{formatPrice(day.pay === null ? total : day.pay.day)}</b>{' '}
              <span>
                {day.pay === null
                  ? 'за день'
                  : day.pay.percent === null
                    ? 'заработали'
                    : `ваши ${day.pay.percent}%`}
              </span>
              {hoursLine && (
                <>
                  {' · '}
                  {hoursLine}
                </>
              )}
              {day.followers > 0 && (
                <>
                  {' · '}
                  <b>{day.followers}</b>{' '}
                  {pluralWord(day.followers, ['подписчик', 'подписчика', 'подписчиков'])}
                </>
              )}
            </p>

            {/* The month only when it says more than the day (on the month's first working day they match). */}
            {day.pay !== null && day.pay.month !== day.pay.day && (
              <RowNote className={styles.monthPay}>
                За {MONTHS[Number(day.pay.monthFrom.slice(5, 7)) - 1]} заработано{' '}
                <b>{formatPrice(day.pay.month)}</b>
              </RowNote>
            )}

            {isToday && (current || next) && (
              <div className={styles.now} aria-live='polite'>
                {current && (
                  <p>
                    <strong>Сейчас:</strong> {current.customerName}, {current.serviceName} до{' '}
                    {addMinutes(current.time, current.durationMinutes)}
                  </p>
                )}
                {next && now !== null && (
                  <p>
                    <strong>Следующий:</strong> {next.customerName} в {next.time},{' '}
                    {minutesUntil(now, parseClock(next.time))}
                  </p>
                )}
              </div>
            )}

            {day.bookings.length === 0 ? (
              <EmptyState
                title={day.hours ? 'Записей пока нет' : (hoursLine ?? undefined)}
                text={
                  day.hours
                    ? 'Новые записи появятся здесь сами.'
                    : 'В этот день записи к вам не открыты.'
                }
              />
            ) : (
              <ol className={styles.agenda}>
                {day.bookings.map((booking) => {
                  const isCancelled = booking.status === 'cancelled'
                  return (
                    <li
                      key={booking.id}
                      className={styles.visit}
                      data-cancelled={isCancelled || undefined}
                      data-outcome={booking.outcome ?? undefined}
                    >
                      <span className={styles.time}>
                        <span className={styles.start}>{booking.time}</span>
                        <span className={styles.end}>
                          {addMinutes(booking.time, booking.durationMinutes)}
                        </span>
                      </span>
                      <span className={styles.body}>
                        <span className={styles.service}>
                          {booking.serviceName}
                          {isCancelled && <span className={styles.badge}>Отменена</span>}
                        </span>
                        <span className={styles.client}>
                          {booking.customerName} · {formatPhone(booking.customerPhone)}
                        </span>
                        {booking.comment && (
                          <span className={styles.comment}>
                            <ChatText aria-hidden />«{booking.comment}»
                          </span>
                        )}
                        {booking.outcome === 'arrived' && (
                          <VisitPhotoButton slug={slug} bookingId={booking.id} />
                        )}
                      </span>
                      {!isCancelled && (
                        <a
                          href={`tel:${booking.customerPhone}`}
                          className={styles.call}
                          aria-label={`Позвонить ${booking.customerName}`}
                        >
                          <Phone weight='fill' aria-hidden />
                        </a>
                      )}
                      {canMark && !isCancelled && (
                        <span className={styles.outcome}>
                          <SegmentedControl
                            label={`Итог визита ${booking.time}`}
                            value={booking.outcome ?? 'pending'}
                            items={OUTCOMES}
                            onChange={(choice) => void handleOutcome(booking, choice)}
                          />
                        </span>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
            <MasterReviews slug={slug} businessName={day.business.name} />
            <div className={styles.alerts}>
              <PushAlertsGroup audience='master' listClassName={styles.alertsList} />
              <CalendarFeedGroup
                scope={{ kind: 'master', slug }}
                listClassName={styles.alertsList}
              />
            </div>
          </>
        )}
      </Container>
    </main>
  )
}
