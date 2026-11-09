'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useState } from 'react'
import type { AdminBooking, Business } from '@/common/api/types'
import { useToday } from '@/common/hooks/useToday'
import { findDay, weekdayOf } from '@/common/utils/workingHours'
import { formatPrice, getUpcomingDays } from '@/features/booking/bookingUtils'
import { useAdminSchedule } from '../hooks/useAdminSchedule'
import { BookingDetailsDialog } from './BookingDetailsDialog/BookingDetailsDialog'
import { DayCalendar } from './DayCalendar/DayCalendar'
import { DayStrip } from './DayStrip/DayStrip'
import { EmptyState } from './EmptyState/EmptyState'
import styles from './ScheduleTab.module.css'
import { SectionHeader } from './SectionHeader/SectionHeader'
import { TimeOffDialog } from './TimeOffDialog/TimeOffDialog'

interface ScheduleTabProps {
  slug: string
  business: Business
}

const DAYS_SHOWN = 14

export const ScheduleTab = ({ slug, business }: ScheduleTabProps) => {
  const today = useToday()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [isClosingTime, setIsClosingTime] = useState(false)
  const [selected, setSelected] = useState<AdminBooking | null>(null)
  const date = selectedDay ?? today?.dayKey ?? null
  const days = today ? getUpcomingDays(today.dayKey, DAYS_SHOWN) : []
  const { schedule, error, reload, cancelBooking, addTimeOff, removeTimeOff } = useAdminSchedule(
    slug,
    date,
  )
  const dayLabel = days.find((day) => day.key === date)?.label ?? ''
  const confirmed = schedule?.bookings.filter((booking) => booking.status === 'confirmed') ?? []
  const revenue = confirmed.reduce((sum, booking) => sum + booking.price, 0)
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
            <Button variant='secondary' size='sm' onClick={() => setIsClosingTime(true)}>
              Закрыть время
            </Button>
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
        {!schedule && !error && <Skeleton className={styles.skeleton} />}

        {schedule && !hasMasters && (
          <EmptyState
            title='Нет мастеров'
            text='Добавьте мастеров в разделе «Мастера» — здесь появится их расписание.'
          />
        )}

        {schedule && hasMasters && (
          <DayCalendar
            specialists={schedule.specialists}
            bookings={schedule.bookings}
            timeOff={schedule.timeOff}
            hours={dayHours}
            nowMinutes={today && date === today.dayKey ? today.minutes : null}
            onSelectBooking={setSelected}
            onRemoveTimeOff={removeTimeOff}
          />
        )}
      </div>

      {selected && (
        <BookingDetailsDialog
          key={selected.id}
          booking={selected}
          onClose={() => setSelected(null)}
          onCancel={cancelBooking}
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
