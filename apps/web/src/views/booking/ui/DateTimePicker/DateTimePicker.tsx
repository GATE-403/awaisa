import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { Toggle, ToggleGroup } from '@awaisa/ui/ToggleGroup'
import type { BookingDay } from '@/entities/booking'
import type { TimeSlot } from '@/shared/api/types'
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
}: DateTimePickerProps) => {
  const availableCount = slots.filter((slot) => slot.isAvailable).length

  if (days.length === 0) return <Skeleton className={styles.skeleton} />

  return (
    <div className={styles.picker}>
      <ToggleGroup
        aria-label='День'
        layout='scroll'
        className={styles.days}
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
            <span className={styles.weekday}>{day.weekday}</span>
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
        <p className={styles.hint}>На этот день свободного времени нет — выберите другой</p>
      )}
      {isSpecialistSelected && !isLoading && !error && availableCount > 0 && (
        <ToggleGroup
          aria-label='Время'
          layout='grid'
          value={time ? [time] : []}
          onValueChange={(values) => toSingleValue(values, onTimeChange)}
        >
          {slots.map((slot) => (
            <Toggle key={slot.time} value={slot.time} disabled={!slot.isAvailable}>
              {slot.time}
            </Toggle>
          ))}
        </ToggleGroup>
      )}
    </div>
  )
}
