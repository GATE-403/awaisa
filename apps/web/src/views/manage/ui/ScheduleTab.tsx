'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { CalendarX, Plus } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { formatPrice, getUpcomingDays } from '@/entities/booking'
import { findDay, weekdayOf } from '@/entities/business'
import type { AdminBooking, Business, Catalog } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import { useAdminSchedule } from '@/views/manage/model/useAdminSchedule'
import { BookingDetailsDialog } from '@/views/manage/ui/BookingDetailsDialog/BookingDetailsDialog'
import { ClientSheet } from '@/views/manage/ui/ClientSheet/ClientSheet'
import { DayStrip } from '@/views/manage/ui/DayStrip/DayStrip'
import { EmptyState } from '@/views/manage/ui/EmptyState/EmptyState'
import { NewBookingDialog } from '@/views/manage/ui/NewBookingDialog/NewBookingDialog'
import { NowBar } from '@/views/manage/ui/NowBar/NowBar'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { TimeOffDialog } from '@/views/manage/ui/TimeOffDialog/TimeOffDialog'
import { DayCalendar, getMasterTint } from '@/widgets/DayCalendar'
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

export const ScheduleTab = ({ slug, business, catalog, refreshKey }: ScheduleTabProps) => {
  const today = useToday()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [isClosingTime, setIsClosingTime] = useState(false)
  const [selected, setSelected] = useState<AdminBooking | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [clientPhone, setClientPhone] = useState<string | null>(null)
  const date = selectedDay ?? today?.dayKey ?? null
  const days = today ? getUpcomingDays(today.dayKey, DAYS_SHOWN) : []
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

  return (
    <section className={styles.content} aria-label='Расписание'>
      <SectionHeader
        title='Расписание'
        description={schedule ? summary : dayLabel}
        actions={
          hasMasters && (
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
        <DayStrip days={days} value={date} onChange={setSelectedDay} />
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
            onCreateBooking={(specialistId, time) => setDraft({ specialistId, time })}
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
