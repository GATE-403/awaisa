import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { Toggle, ToggleGroup } from '@awaisa/ui/ToggleGroup'
import type { ReactNode } from 'react'
import type { TimeSlot } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { addDayKey, type BookingDay } from '../../lib/bookingUtils'
import styles from './DateTimePicker.module.css'

interface DateTimePickerProps {
  days: BookingDay[]
  dayKey: string | null
  slots: TimeSlot[]
  time: string | null
  isSpecialistSelected: boolean
  isLoading: boolean
  error: string | null
  onRetry: () => void
  onDayChange: (dayKey: string) => void
  onTimeChange: (time: string) => void
  /** Offered on a full day, e.g. «Сообщить, когда освободится» (views pass features in). */
  fullDayAction?: ReactNode
}

const toSingleValue = (values: string[], onChange: (value: string) => void) => {
  const [value] = values
  if (value) onChange(value)
}

const SlotsSkeleton = () => (
  <div className={styles.slotsSkeleton} aria-hidden>
    {Array.from({ length: 12 }, (_, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders never reorder
      <Skeleton key={index} className={styles.slotSkeleton} />
    ))}
  </div>
)

export const DateTimePicker = ({
  days,
  dayKey,
  slots,
  time,
  isSpecialistSelected,
  isLoading,
  error,
  onRetry,
  onDayChange,
  onTimeChange,
  fullDayAction,
}: DateTimePickerProps) => {
  const availableCount = slots.filter((slot) => slot.isAvailable).length
  // «Сегодня» and «Завтра» in place of the weekday: few remember today's date at a glance.
  const todayKey = days.find((day) => day.isToday)?.key ?? null
  const tomorrowKey = todayKey ? addDayKey(todayKey, 1) : null
  const relativeDay = (key: string) =>
    key === todayKey ? 'Сегодня' : key === tomorrowKey ? 'Завтра' : null

  if (days.length === 0) return <Skeleton className={styles.skeleton} />

  return (
    <div className={styles.picker}>
      <ToggleGroup
        aria-label='День'
        layout='scroll'
        className={styles.days}
        data-edge-fade=''
        value={dayKey ? [dayKey] : []}
        onValueChange={(values) => toSingleValue(values, onDayChange)}
      >
        {days.map((day) => (
          <Toggle
            key={day.key}
            value={day.key}
            size='card'
            aria-label={day.isClosed ? `${day.label}, выходной` : day.label}
            disabled={day.isClosed}
            data-today={day.isToday || undefined}
          >
            <span className={styles.weekday} data-relative={relativeDay(day.key) ? '' : undefined}>
              {relativeDay(day.key) ?? day.weekday}
            </span>
            <span className={styles.dayNumber}>{day.dayOfMonth}</span>
            <span className={styles.month}>{day.month}</span>
          </Toggle>
        ))}
      </ToggleGroup>

      {!isSpecialistSelected && <p className={styles.hint}>Сначала выберите мастера</p>}
      {isSpecialistSelected && isLoading && <SlotsSkeleton />}
      {isSpecialistSelected && error && (
        <div className={styles.hint}>
          <p>{error}</p>
          <Button variant='link' size='sm' onClick={onRetry}>
            Повторить
          </Button>
        </div>
      )}
      {isSpecialistSelected && !isLoading && !error && availableCount === 0 && (
        <div className={styles.full}>
          <p className={styles.hint}>На этот день свободного времени нет — выберите другой</p>
          {fullDayAction}
        </div>
      )}
      {isSpecialistSelected && !isLoading && !error && availableCount > 0 && (
        // Only free times, under a line that says a time is still to be picked: a grid half
        // made of struck-out times read as «nothing to do here».
        <p className={styles.caption} aria-hidden>
          {time ? `Выбрано ${time}` : 'Выберите время'}
          <span className={styles.captionCount}>
            {pluralize(availableCount, ['свободное', 'свободных', 'свободных'])}
          </span>
        </p>
      )}
      {isSpecialistSelected && !isLoading && !error && availableCount > 0 && (
        <ToggleGroup
          aria-label='Время'
          layout='grid'
          className={styles.slots}
          value={time ? [time] : []}
          onValueChange={(values) => toSingleValue(values, onTimeChange)}
        >
          {slots
            .filter((slot) => slot.isAvailable)
            .map((slot) => (
              <Toggle key={slot.time} value={slot.time}>
                {slot.time}
              </Toggle>
            ))}
        </ToggleGroup>
      )}
    </div>
  )
}
