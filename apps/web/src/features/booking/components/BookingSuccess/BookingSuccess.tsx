'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { CalendarPlus, MapPin } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { Booking } from '@/common/api/types'
import { Ticket } from '@/common/components/Ticket/Ticket'
import { downloadCalendarFile } from '@/common/utils/calendarFile'
import styles from './BookingSuccess.module.css'

interface BookingSuccessProps {
  booking: Booking
}

export const BookingSuccess = ({ booking }: BookingSuccessProps) => {
  const toast = useToast()

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.show({ title: 'Номер скопирован', description: code, type: 'success' })
    } catch {
      toast.show({ title: 'Не удалось скопировать', type: 'error' })
    }
  }

  const handleAddToCalendar = () => {
    downloadCalendarFile(booking, booking.business)
    toast.show({
      title: 'Событие для календаря готово',
      description: 'Откройте файл, чтобы добавить',
    })
  }

  return (
    <div className={styles.success}>
      <h1 className={styles.title}>Вы записаны</h1>
      <p className={styles.lead}>Покажите номер на ресепшене — или просто назовите имя.</p>
      <div className={styles.ticket}>
        <Ticket booking={booking} onCodeClick={handleCopyCode} />
      </div>
      <div className={styles.chips}>
        <Button size='sm' variant='secondary' onClick={handleAddToCalendar}>
          <CalendarPlus weight='bold' className={styles.chipIcon} aria-hidden />В календарь
        </Button>
        {booking.business.mapUrl && (
          <ButtonLink
            size='sm'
            variant='secondary'
            render={
              // biome-ignore lint/a11y/useAnchorContent: content comes from Button children via render
              <a href={booking.business.mapUrl} target='_blank' rel='noreferrer' />
            }
          >
            <MapPin weight='bold' className={styles.chipIcon} aria-hidden />
            Маршрут
          </ButtonLink>
        )}
      </div>
      <div className={styles.primary}>
        <ButtonLink render={<NextLink href='/bookings' />} size='lg' fullWidth>
          Мои записи
        </ButtonLink>
      </div>
    </div>
  )
}
