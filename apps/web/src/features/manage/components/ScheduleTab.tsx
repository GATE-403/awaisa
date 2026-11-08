'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { Toggle, ToggleGroup } from '@awaisa/ui/ToggleGroup'
import { useState } from 'react'
import { useToday } from '@/common/hooks/useToday'
import { getUpcomingDays } from '@/features/booking/bookingUtils'
import { useAdminSchedule } from '../hooks/useAdminSchedule'
import { EmptyState } from './EmptyState/EmptyState'
import { ScheduleColumn } from './ScheduleColumn/ScheduleColumn'
import styles from './ScheduleTab.module.css'
import { SectionHeader } from './SectionHeader/SectionHeader'
import { TimeOffDialog } from './TimeOffDialog/TimeOffDialog'

interface ScheduleTabProps {
  slug: string
}

const DAYS_SHOWN = 14

export const ScheduleTab = ({ slug }: ScheduleTabProps) => {
  const today = useToday()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [isClosingTime, setIsClosingTime] = useState(false)
  const date = selectedDay ?? today?.dayKey ?? null
  const days = today ? getUpcomingDays(today.dayKey, DAYS_SHOWN) : []
  const { schedule, error, reload, cancelBooking, addTimeOff, removeTimeOff } = useAdminSchedule(
    slug,
    date,
  )
  const dayLabel = days.find((day) => day.key === date)?.label ?? ''
  const confirmedCount =
    schedule?.bookings.filter((booking) => booking.status === 'confirmed').length ?? 0
  const hasMasters = (schedule?.specialists.length ?? 0) > 0

  return (
    <section className={styles.content} aria-label='Расписание'>
      <SectionHeader
        title='Расписание'
        description={
          schedule
            ? `${dayLabel} · ${confirmedCount === 0 ? 'записей нет' : `записей: ${confirmedCount}`}`
            : dayLabel
        }
        actions={
          hasMasters && (
            <Button variant='secondary' size='sm' onClick={() => setIsClosingTime(true)}>
              Закрыть время
            </Button>
          )
        }
      />

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
            data-today={day.isToday || undefined}
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

      {schedule && !hasMasters && (
        <EmptyState
          title='Нет мастеров'
          text='Добавьте мастеров в разделе «Мастера» — здесь появится их расписание.'
        />
      )}

      {schedule && hasMasters && (
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
