'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { Toggle, ToggleGroup } from '@awaisa/ui/ToggleGroup'
import { useState } from 'react'
import { useToday } from '@/common/hooks/useToday'
import { getUpcomingDays } from '@/features/booking/bookingUtils'
import { useAdminSchedule } from '../hooks/useAdminSchedule'
import { ScheduleColumn } from './ScheduleColumn/ScheduleColumn'
import styles from './ScheduleTab.module.css'
import { TimeOffForm } from './TimeOffForm/TimeOffForm'

interface ScheduleTabProps {
  slug: string
}

const DAYS_SHOWN = 14

export const ScheduleTab = ({ slug }: ScheduleTabProps) => {
  const today = useToday()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const date = selectedDay ?? today?.dayKey ?? null
  const days = today ? getUpcomingDays(today.dayKey, DAYS_SHOWN) : []
  const { schedule, error, reload, cancelBooking, addTimeOff, removeTimeOff } = useAdminSchedule(
    slug,
    date,
  )
  const dayLabel = days.find((day) => day.key === date)?.label ?? ''
  const confirmedCount =
    schedule?.bookings.filter((booking) => booking.status === 'confirmed').length ?? 0

  return (
    <div className={styles.content}>
      <h2 className={styles.heading}>
        {dayLabel}
        {schedule && (
          <span className={styles.muted}>
            {' '}
            · {confirmedCount === 0 ? 'записей нет' : `записей — ${confirmedCount}`}
          </span>
        )}
      </h2>

      <ToggleGroup
        aria-label='День'
        layout='scroll'
        value={date ? [date] : []}
        onValueChange={([value]) => value && setSelectedDay(value)}
      >
        {days.map((day) => (
          <Toggle
            key={day.key}
            value={day.key}
            size='card'
            aria-label={day.label}
            data-day={day.key}
          >
            <span className={styles.weekday}>{day.weekday}</span>
            <span className={styles.dayNumber}>{day.dayOfMonth}</span>
          </Toggle>
        ))}
      </ToggleGroup>

      {error && (
        <div className={styles.error} role='alert'>
          <p>{error}</p>
          <Button variant='link' size='sm' onClick={reload}>
            Повторить
          </Button>
        </div>
      )}

      {!schedule && !error && <Skeleton className={styles.skeleton} />}

      {schedule && schedule.specialists.length === 0 && (
        <p className={styles.empty}>
          Добавьте мастеров во вкладке «Мастера» — здесь появится их расписание.
        </p>
      )}

      {schedule && date && schedule.specialists.length > 0 && (
        <div className={styles.layout}>
          <div className={styles.columns}>
            {schedule.specialists.map((specialist) => (
              <ScheduleColumn
                key={specialist.id}
                specialist={specialist}
                bookings={schedule.bookings.filter(
                  (booking) => booking.specialistId === specialist.id,
                )}
                timeOff={schedule.timeOff.filter((item) => item.specialistId === specialist.id)}
                onCancelBooking={cancelBooking}
                onRemoveTimeOff={removeTimeOff}
              />
            ))}
          </div>
          <aside className={styles.aside}>
            <TimeOffForm date={date} specialists={schedule.specialists} onSubmit={addTimeOff} />
          </aside>
        </div>
      )}
    </div>
  )
}
