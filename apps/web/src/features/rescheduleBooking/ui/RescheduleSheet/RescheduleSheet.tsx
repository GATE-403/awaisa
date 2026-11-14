'use client'

import { Button } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { ArrowRight } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { DateTimePicker, formatDayLong, getUpcomingDays, useAvailability } from '@/entities/booking'
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

// Same master, same service, another time — chosen with the very picker of the booking form
// (day cards with «Сегодня / Завтра», «Выберите время · N свободных», free times only).
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
  // The visit's own time is not a choice to move to.
  const choices = slots.map((slot) =>
    date === booking.date && slot.time === booking.time ? { ...slot, isAvailable: false } : slot,
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

      <DateTimePicker
        days={days}
        dayKey={date}
        slots={choices}
        time={time}
        isSpecialistSelected
        isLoading={isLoading}
        error={null}
        onRetry={reload}
        onDayChange={(key) => {
          setDate(key)
          setTime(null)
        }}
        onTimeChange={setTime}
      />

      <Button size='lg' onClick={handleMove} disabled={!time || isMoving} className={styles.submit}>
        {time ? `Перенести на ${time}` : 'Выберите время'}
      </Button>
    </Sheet>
  )
}
