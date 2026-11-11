'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { CalendarX, Plus } from '@phosphor-icons/react/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatPrice, getDaysAround } from '@/entities/booking'
import { findDay, weekdayOf } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import { closeDay, getUnclosedVisits, reopenVisits } from '@/shared/api/clientApi'
import type { AdminBooking, Business, Catalog } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import { pluralize } from '@/shared/lib/plural'
import { useAdminSchedule } from '@/views/manage/model/useAdminSchedule'
import { BookingDetailsDialog } from '@/views/manage/ui/BookingDetailsDialog/BookingDetailsDialog'
import { ClientSheet } from '@/views/manage/ui/ClientSheet/ClientSheet'
import { EmptyState } from '@/views/manage/ui/EmptyState/EmptyState'
import { NewBookingDialog } from '@/views/manage/ui/NewBookingDialog/NewBookingDialog'
import { NowBar } from '@/views/manage/ui/NowBar/NowBar'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { TimeOffDialog } from '@/views/manage/ui/TimeOffDialog/TimeOffDialog'
import { DayCalendar, getMasterTint } from '@/widgets/DayCalendar'
import { DayStrip } from '@/widgets/DayStrip'
import styles from './ScheduleTab.module.css'

interface ScheduleTabProps {
  slug: string
  business: Business
  catalog: Catalog
  /** Bumped when a new booking arrives, so the open day reloads. */
  refreshKey: number
}

type Draft = { specialistId: string; time: string | null }

const DAYS_SHOWN = 14
// Two weeks back: enough to close yesterday's and last week's visits.
const PAST_DAYS = 14

export const ScheduleTab = ({ slug, business, catalog, refreshKey }: ScheduleTabProps) => {
  const today = useToday()
  const toast = useToast()
  const [unclosed, setUnclosed] = useState<{
    total: number
    days: { date: string; count: number }[]
  }>({
    total: 0,
    days: [],
  })
  const searchParams = useSearchParams()
  const router = useRouter()
  const linkedDate = searchParams.get('date')
  const linkedBookingId = searchParams.get('booking')
  const [selectedDay, setSelectedDay] = useState<string | null>(linkedDate)
  const [isClosingTime, setIsClosingTime] = useState(false)
  const [selected, setSelected] = useState<AdminBooking | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [clientPhone, setClientPhone] = useState<string | null>(null)
  const date = selectedDay ?? today?.dayKey ?? null
  const days = today ? getDaysAround(today.dayKey, PAST_DAYS, DAYS_SHOWN) : []
  const isPast = date !== null && today !== null && date < today.dayKey
  const {
    schedule,
    error,
    reload,
    addBooking,
    moveBooking,
    cancelBooking,
    markOutcome,
    addTimeOff,
    removeTimeOff,
  } = useAdminSchedule(slug, date, refreshKey)
  const dayLabel = days.find((day) => day.key === date)?.label ?? ''
  const confirmed = schedule?.bookings.filter((booking) => booking.status === 'confirmed') ?? []
  // What the day brings: paid amounts once marked, prices otherwise; no-shows bring nothing.
  const revenue = confirmed.reduce(
    (sum, booking) =>
      booking.outcome === 'no_show' ? sum : sum + (booking.paidAmount ?? booking.price),
    0,
  )
  const dayHours = date ? (findDay(business.hours, weekdayOf(date)) ?? null) : null
  const summary = [
    dayLabel,
    !dayHours && 'выходной',
    confirmed.length === 0 ? 'записей нет' : `записей: ${confirmed.length}`,
    revenue > 0 && formatPrice(revenue),
  ]
    .filter(Boolean)
    .join(' · ')
  const hasMasters = (schedule?.specialists.length ?? 0) > 0
  const marks = new Set(unclosed.days.map((day) => day.date))
  const firstUnclosed = unclosed.days.find((day) => day.date !== date)
  const openHere = unclosed.days.find((day) => day.date === date)?.count ?? 0

  // Re-read after every schedule change: marking a visit may close a day.
  // Arrived from a «Новая запись» toast or notification: show that day and open the booking once.
  useEffect(() => {
    if (linkedDate) setSelectedDay(linkedDate)
  }, [linkedDate])

  // biome-ignore lint/correctness/useExhaustiveDependencies: router is stable
  useEffect(() => {
    if (!linkedBookingId || !schedule) return
    const booking = schedule.bookings.find((item) => item.id === linkedBookingId)
    if (!booking) return
    setSelected(booking)
    router.replace(`/manage/${slug}?tab=schedule`, { scroll: false })
  }, [linkedBookingId, schedule, slug])

  useEffect(() => {
    if (!schedule) return
    const controller = new AbortController()
    getUnclosedVisits(slug, controller.signal)
      .then(setUnclosed)
      .catch(() => undefined)

    return () => controller.abort()
  }, [slug, schedule])

  // Most visits happen as booked: close the whole day in one tap, undo from the toast.
  const handleCloseDay = async () => {
    if (!date) return
    try {
      const { ids } = await closeDay(slug, date)
      reload()
      toast.show({
        title: `Отмечено: ${pluralize(ids.length, ['визит', 'визита', 'визитов'])}`,
        description: 'Все пришли, оплата по прайсу наличными — поправьте, где было иначе',
        type: 'success',
        action: {
          label: 'Вернуть',
          onClick: () => void reopenVisits(slug, ids).then(reload),
        },
      })
    } catch (closeError) {
      toast.show({
        title: 'Не получилось',
        description: getErrorMessage(closeError),
        type: 'error',
      })
    }
  }

  const handleCreate = (specialistId: string, time: string | null) => {
    if (isPast) {
      toast.show({ title: 'Записать в прошедший день нельзя', type: 'info' })
      return
    }
    setDraft({ specialistId, time })
  }

  return (
    <section className={styles.content} aria-label='Расписание'>
      <SectionHeader
        title='Расписание'
        description={schedule ? summary : dayLabel}
        actions={
          hasMasters && (
            <>
              {openHere > 0 && (
                <Button variant='secondary' size='sm' onClick={handleCloseDay}>
                  Все пришли ({openHere})
                </Button>
              )}
              {/* In the toolbar, not above the calendar: it loads late and must not shift the grid. */}
              {unclosed.total > openHere && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setSelectedDay((firstUnclosed ?? unclosed.days[0])?.date ?? null)}
                  title='Отметьте, кто пришёл: так выручка в аналитике будет точной'
                >
                  Не закрыто: {pluralize(unclosed.total - openHere, ['визит', 'визита', 'визитов'])}
                </Button>
              )}
              {!isPast && (
                <>
                  <Button variant='secondary' size='sm' onClick={() => setIsClosingTime(true)}>
                    <CalendarX weight='bold' aria-hidden />
                    Закрыть время
                  </Button>
                  <Button
                    size='sm'
                    onClick={() =>
                      setDraft({ specialistId: schedule?.specialists[0]?.id ?? '', time: null })
                    }
                  >
                    <Plus weight='bold' aria-hidden />
                    Новая запись
                  </Button>
                </>
              )}
            </>
          )
        }
      />

      {error && (
        <div className={styles.error} role='alert'>
          <p>{error}</p>
          <Button variant='link' size='sm' onClick={reload}>
            Повторить
          </Button>
        </div>
      )}

      <div className={styles.panel}>
        <DayStrip days={days} value={date} onChange={setSelectedDay} marks={marks} />
        {schedule && hasMasters && today && date === today.dayKey && (
          <NowBar bookings={schedule.bookings} nowMinutes={today.minutes} />
        )}
        {!schedule && !error && <Skeleton className={styles.skeleton} />}

        {schedule && !hasMasters && (
          <EmptyState
            title='Добавьте мастеров'
            text='Откройте раздел «Мастера» и добавьте хотя бы себя — здесь появится расписание.'
          />
        )}

        {schedule && hasMasters && (
          <DayCalendar
            specialists={schedule.specialists}
            bookings={schedule.bookings}
            timeOff={schedule.timeOff}
            hours={dayHours}
            nowMinutes={today && date === today.dayKey ? today.minutes : null}
            slotMinutes={business.slotMinutes}
            onSelectBooking={setSelected}
            onRemoveTimeOff={removeTimeOff}
            onCreateBooking={handleCreate}
            onMoveBooking={moveBooking}
          />
        )}
      </div>

      {selected && (
        <BookingDetailsDialog
          key={selected.id}
          booking={selected}
          dayLabel={dayLabel}
          tint={getMasterTint(
            Math.max(
              0,
              (schedule?.specialists ?? []).findIndex(({ id }) => id === selected.specialistId),
            ),
          )}
          onClose={() => setSelected(null)}
          onCancel={cancelBooking}
          onOutcome={today && date && date <= today.dayKey ? markOutcome : undefined}
          onOpenClient={(phone) => {
            setSelected(null)
            setClientPhone(phone)
          }}
        />
      )}

      {clientPhone && (
        <ClientSheet slug={slug} phone={clientPhone} onClose={() => setClientPhone(null)} />
      )}

      {draft && schedule && date && (
        <NewBookingDialog
          date={date}
          dayLabel={dayLabel}
          time={draft.time}
          specialistId={draft.specialistId}
          specialists={schedule.specialists}
          catalog={catalog}
          onClose={() => setDraft(null)}
          onSubmit={addBooking}
        />
      )}

      {isClosingTime && schedule && date && (
        <TimeOffDialog
          date={date}
          dayLabel={dayLabel}
          specialists={schedule.specialists}
          onClose={() => setIsClosingTime(false)}
          onSubmit={addTimeOff}
        />
      )}
    </section>
  )
}
