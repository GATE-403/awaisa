'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { ArrowRight } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { formatDayLong, getUpcomingDays, useAvailability } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api/apiError'
import { moveMyBooking } from '@/shared/api/clientApi'
import type { Booking } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import { haptic } from '@/shared/lib/nativeBridge'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import styles from './RescheduleSheet.module.css'

interface RescheduleSheetProps {
  booking: Booking
  /** The device token for guest bookings; signed-in clients go by the session. */
  token: string | null
  onMoved: (booking: Booking) => void
  onClose: () => void
}

const DAYS_SHOWN = 14

const PARTS = [
  { label: 'Утро', test: (time: string) => time < '12:00' },
  { label: 'День', test: (time: string) => time >= '12:00' && time < '17:00' },
  { label: 'Вечер', test: (time: string) => time >= '17:00' },
]

// Same master, same service, another time: a day row and the free times of that master.
export const RescheduleSheet = ({ booking, token, onMoved, onClose }: RescheduleSheetProps) => {
  const toast = useToast()
  const today = useToday()
  const [date, setDate] = useState(booking.date)
  const [time, setTime] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const days = today ? getUpcomingDays(today.dayKey, DAYS_SHOWN) : []
  const { slots, isLoading, reload } = useAvailability(
    booking.serviceId,
    booking.specialistId,
    date,
  )
  const free = slots.filter(
    (slot) => slot.isAvailable && !(date === booking.date && slot.time === booking.time),
  )

  const handleMove = async () => {
    if (!time) return
    setIsMoving(true)
    try {
      const moved = await moveMyBooking(booking.id, token, { date, time })
      haptic('success')
      toast.show({
        title: `Перенесено: ${formatDayLong(moved.date)}, ${moved.time}`,
        type: 'success',
      })
      onMoved(moved)
      onClose()
    } catch (moveError) {
      haptic('error')
      toast.show({ title: 'Не получилось', description: getErrorMessage(moveError), type: 'error' })
      setTime(null)
      reload()
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <Sheet title='Перенести запись' onClose={onClose}>
      {/* Before and after side by side, so the change reads at a glance. */}
      <div className={styles.change}>
        <p className={styles.service}>
          {booking.serviceName} · {booking.specialistName}
        </p>
        <div className={styles.compare}>
          <span className={styles.was}>
            <span className={styles.caption}>Сейчас</span>
            <span className={styles.wasTime}>{booking.time}</span>
            <span className={styles.date}>{formatDayLong(booking.date)}</span>
          </span>
          <ArrowRight weight='bold' aria-hidden className={styles.arrow} />
          <span className={styles.will} data-empty={!time || undefined}>
            <span className={styles.caption}>Станет</span>
            <span className={styles.willTime}>{time ?? '—:—'}</span>
            <span className={styles.date}>{formatDayLong(date)}</span>
          </span>
        </div>
      </div>

      <fieldset className={styles.days}>
        <legend className={styles.legend}>День</legend>
        {days.map((day) => (
          <button
            key={day.key}
            type='button'
            className={styles.day}
            aria-pressed={day.key === date}
            aria-label={day.label}
            data-today={day.key === today?.dayKey || undefined}
            onClick={() => {
              setDate(day.key)
              setTime(null)
            }}
          >
            <span className={styles.weekday}>{day.weekday}</span>
            <span className={styles.number}>{day.dayOfMonth}</span>
          </button>
        ))}
      </fieldset>

      {isLoading && <Skeleton className={styles.skeleton} />}
      {!isLoading && free.length === 0 && (
        <p className={styles.empty}>Свободного времени нет — выберите другой день.</p>
      )}
      {!isLoading && free.length > 0 && (
        <fieldset className={styles.times}>
          <legend className={styles.legend}>Время</legend>
          {PARTS.map((part) => {
            const items = free.filter((slot) => part.test(slot.time))
            if (items.length === 0) return null
            return (
              <div key={part.label} className={styles.part}>
                <p className={styles.partTitle}>{part.label}</p>
                <div className={styles.partGrid}>
                  {items.map((slot) => (
                    <button
                      key={slot.time}
                      type='button'
                      className={styles.time}
                      aria-pressed={slot.time === time}
                      onClick={() => setTime(slot.time)}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </fieldset>
      )}

      <Button size='lg' onClick={handleMove} disabled={!time || isMoving} className={styles.submit}>
        {time ? `Перенести на ${time}` : 'Выберите время'}
      </Button>
    </Sheet>
  )
}
