'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
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
      <p className={styles.lead}>
        {booking.serviceName} · {booking.specialistName}
        <br />
        Сейчас: {formatDayLong(booking.date)}, {booking.time}
      </p>

      <fieldset className={styles.days}>
        <legend className={styles.legend}>День</legend>
        {days.map((day) => (
          <button
            key={day.key}
            type='button'
            className={styles.day}
            aria-pressed={day.key === date}
            aria-label={day.label}
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
        <p className={styles.empty}>
          У мастера нет свободного времени в этот день — выберите другой.
        </p>
      )}
      {!isLoading && free.length > 0 && (
        <fieldset className={styles.times}>
          <legend className={styles.legend}>Время</legend>
          {free.map((slot) => (
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
        </fieldset>
      )}

      <Button size='lg' onClick={handleMove} disabled={!time || isMoving} className={styles.submit}>
        {time ? `Перенести на ${time}` : 'Выберите время'}
      </Button>
    </Sheet>
  )
}
