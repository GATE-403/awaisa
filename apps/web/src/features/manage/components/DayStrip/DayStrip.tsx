import type { BookingDay } from '@/features/booking/bookingUtils'
import styles from './DayStrip.module.css'

interface DayStripProps {
  days: BookingDay[]
  value: string | null
  onChange: (dayKey: string) => void
}

export const DayStrip = ({ days, value, onChange }: DayStripProps) => {
  const today = days.find((day) => day.isToday)

  return (
    <div className={styles.strip}>
      <fieldset aria-label='День' className={styles.days}>
        {days.map((day) => (
          <button
            key={day.key}
            type='button'
            className={styles.day}
            aria-label={day.label}
            aria-pressed={day.key === value}
            data-day={day.key}
            data-today={day.isToday || undefined}
            onClick={() => onChange(day.key)}
          >
            <span className={styles.weekday}>{day.weekday}</span>
            <span className={styles.number}>{day.dayOfMonth}</span>
          </button>
        ))}
      </fieldset>
      {today && (
        <button
          type='button'
          className={styles.today}
          onClick={() => onChange(today.key)}
          disabled={value === today.key}
        >
          Сегодня
        </button>
      )}
    </div>
  )
}
