'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import type { MessageDescriptor } from '@lingui/core'
import { msg, ph, plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { ChatText, Phone } from '@phosphor-icons/react/ssr'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getDaysAround, LookPhoto } from '@/entities/booking'
import { addMinutes, formatClock, parseClock } from '@/entities/business'
import { useRequireSession } from '@/entities/session'
import { CalendarFeedGroup } from '@/features/calendarFeed'
import { PushAlertsGroup } from '@/features/pushAlerts'
import { useVisitPhoto } from '@/features/visitPhoto'
import { getErrorMessage } from '@/shared/api/apiError'
import { addVisitPhoto, getMasterDay, setMasterOutcome } from '@/shared/api/clientApi'
import type { AdminBooking, MasterDay, VisitOutcome } from '@/shared/api/types'
import type { Format, Translate } from '@/shared/i18n'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { useFormat } from '@/shared/i18n/useFormat'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useToday } from '@/shared/lib/hooks/useToday'
import { haptic } from '@/shared/lib/nativeBridge'
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
const MONTHS: MessageDescriptor[] = [
  msg`January`,
  msg`February`,
  msg`March`,
  msg`April`,
  msg`May`,
  msg`June`,
  msg`July`,
  msg`August`,
  msg`September`,
  msg`October`,
  msg`November`,
  msg`December`,
]
const PAST_DAYS = 7
const FORBIDDEN = 403
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const OUTCOMES: { value: Choice; label: MessageDescriptor }[] = [
  { value: 'pending', label: msg`Waiting` },
  { value: 'arrived', label: msg`Arrived` },
  { value: 'no_show', label: msg`No-show` },
]

const minutesUntil = (from: number, to: number, t: Translate, format: Format) =>
  t(msg`in ${ph({ time: format.duration(to - from) })}`)

// The master's own day, phone first: who comes when, how to reach them, and closing each visit.
// Nothing about other masters or the business settings.
export const MasterDayPage = ({ slug }: MasterDayPageProps) => {
  const session = useRequireSession()
  const toast = useToast()
  const { t } = useLingui()
  const format = useFormat()
  const monthName = (dayKey: string) => {
    const month = MONTHS[Number(dayKey.slice(5, 7)) - 1]
    return month ? t(month) : ''
  }
  const today = useToday()
  // A push about a booking links to its day (`?date=`), as the cabinet's schedule does.
  const linkedDate = useSearchParams().get('date')
  const [selectedDay, setSelectedDay] = useState<string | null>(linkedDate)
  const [day, setDay] = useState<MasterDay | null>(null)
  const [error, setError] = useState<{ message: string; isForbidden: boolean } | null>(null)
  const visitPhoto = useVisitPhoto({
    upload: (bookingId, file) => addVisitPhoto(slug, bookingId, file),
    onDone: (bookingId) =>
      setDay((current) =>
        current
          ? {
              ...current,
              photos: {
                ...current.photos,
                weekWithPhoto: current.photos.bookingIds.includes(bookingId)
                  ? current.photos.weekWithPhoto
                  : current.photos.weekWithPhoto + 1,
                bookingIds: [...new Set([...current.photos.bookingIds, bookingId])],
              },
            }
          : current,
      ),
  })
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

  const isThisWeek = (dayKey: string) => {
    if (!today) return false
    const age = Date.parse(today.dayKey) - Date.parse(dayKey)
    return age >= 0 && age < WEEK_MS
  }

  const handleOutcome = async (booking: AdminBooking, choice: Choice) => {
    try {
      const updated = await setMasterOutcome(slug, booking.id, {
        outcome: choice === 'pending' ? null : choice,
      })
      haptic('selection')
      // The result is still in front of the master: the camera is one tap away.
      if (choice === 'arrived' && !day?.photos.bookingIds.includes(booking.id)) {
        toast.show({
          title: t`Marked: arrived`,
          type: 'success',
          action: { label: t`Take a photo`, onClick: () => visitPhoto.pick(booking.id) },
        })
      }
      // The week's photo count follows the mark: an arrived visit of the last seven days counts.
      const weekDelta = isThisWeek(booking.date)
        ? Number(updated.outcome === 'arrived') - Number(booking.outcome === 'arrived')
        : 0
      setDay((current) =>
        current
          ? {
              ...current,
              bookings: current.bookings.map((item) => (item.id === booking.id ? updated : item)),
              photos: { ...current.photos, weekVisits: current.photos.weekVisits + weekDelta },
            }
          : current,
      )
    } catch (outcomeError) {
      toast.show({
        title: t`Something went wrong`,
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
            title={t`No access.`}
            subtitle={t`This number is not linked to a specialist. Ask the owner to add it to the specialist card.`}
          />
          <NextLink href='/bookings' className={styles.link}>
            {t`To profile`} ›
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
        ? t`You work ${ph({ from: formatClock(day.hours.opensMinutes) })}–${ph({ to: formatClock(day.hours.closesMinutes) })}`
        : t`Closed`

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        <PageTitle
          size='sm'
          title={t`My day.`}
          subtitle={day ? `${day.master.name} · ${day.business.name}` : ' '}
        />

        <DayStrip days={days} value={date} onChange={setSelectedDay} />

        {error && <p className={styles.error}>{error.message}</p>}
        {!day && !error && <Skeleton className={styles.skeleton} />}

        {day && (
          <>
            {/* The day's facts as one footnote line with bold figures, like the quiet profile
                (three tiles parted by lines read as a dashboard: "does not fit the philosophy"). */}
            <p className={styles.facts}>
              <b>{live.length}</b>{' '}
              {t`${plural(live.length, { one: '# booking', other: '# bookings' })}`.replace(
                /^\d+\s/,
                '',
              )}
              {' · '}
              <b>{format.price(day.pay === null ? total : day.pay.day)}</b>{' '}
              <span>
                {day.pay === null
                  ? t`for the day`
                  : day.pay.percent === null
                    ? t`earned`
                    : t`your ${ph({ percent: day.pay.percent })}%`}
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
                  {t`${plural(day.followers, { one: '# follower', other: '# followers' })}`.replace(
                    /^\d+ /,
                    '',
                  )}
                </>
              )}
            </p>

            {/* The month only when it says more than the day (on the month's first working day they match). */}
            {day.pay !== null && day.pay.month !== day.pay.day && (
              <RowNote className={styles.monthPay}>
                {t`Earned in ${ph({ month: monthName(day.pay.monthFrom) })}`}{' '}
                <b>{format.price(day.pay.month)}</b>
              </RowNote>
            )}

            {day.photos.weekVisits > 0 && (
              <RowNote className={styles.monthPay}>
                {t`Work photos this week: ${ph({ done: day.photos.weekWithPhoto })} of ${plural(day.photos.weekVisits, { one: '# visit', other: '# visits' })}`}
              </RowNote>
            )}

            {isToday && (current || next) && (
              <div className={styles.now} aria-live='polite'>
                {current && (
                  <p>
                    <strong>{t`Now`}:</strong>{' '}
                    {t`${ph({ name: current.customerName })}, ${ph({ service: current.serviceName })} until ${ph({ time: addMinutes(current.time, current.durationMinutes) })}`}
                  </p>
                )}
                {next && now !== null && (
                  <p>
                    <strong>{t`Next`}:</strong>{' '}
                    {t`${ph({ name: next.customerName })} at ${ph({ time: next.time })}, ${ph({ wait: minutesUntil(now, parseClock(next.time), t, format) })}`}
                  </p>
                )}
              </div>
            )}

            {day.bookings.length === 0 ? (
              <EmptyState
                title={day.hours ? t`No bookings yet` : (hoursLine ?? undefined)}
                text={
                  day.hours
                    ? t`New bookings will appear here.`
                    : t`Bookings with you are not open this day.`
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
                          {isCancelled && <span className={styles.badge}>{t`Cancelled`}</span>}
                        </span>
                        <span className={styles.client}>
                          {booking.customerName} · {formatPhone(booking.customerPhone)}
                        </span>
                        {booking.comment && (
                          <span className={styles.comment}>
                            <ChatText aria-hidden />"{booking.comment}"
                          </span>
                        )}
                        {booking.lookPhotoUrl && (
                          <LookPhoto url={booking.lookPhotoUrl} clientName={booking.customerName} />
                        )}
                        {booking.outcome === 'arrived' && (
                          <VisitPhotoButton
                            hasPhoto={day.photos.bookingIds.includes(booking.id)}
                            isUploading={visitPhoto.uploadingId === booking.id}
                            onPick={() => visitPhoto.pick(booking.id)}
                          />
                        )}
                      </span>
                      {!isCancelled && (
                        <a
                          href={`tel:${booking.customerPhone}`}
                          className={styles.call}
                          aria-label={t`Call ${ph({ name: booking.customerName })}`}
                        >
                          <Phone aria-hidden />
                        </a>
                      )}
                      {canMark && !isCancelled && (
                        <span className={styles.outcome}>
                          <SegmentedControl
                            label={t`Visit outcome ${ph({ time: booking.time })}`}
                            value={booking.outcome ?? 'pending'}
                            items={OUTCOMES.map((item) => ({ ...item, label: t(item.label) }))}
                            onChange={(choice) => void handleOutcome(booking, choice)}
                          />
                        </span>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
            {visitPhoto.field}
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
