'use client'

import { Button } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { ShareNetwork } from '@phosphor-icons/react/ssr'
import { formatClock } from '@/entities/business'
import type { AdminSchedule, Catalog } from '@/shared/api/types'
import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { freeGaps } from '@/widgets/DayCalendar'
import styles from './ShareWindowsSheet.module.css'

interface ShareWindowsSheetProps {
  slug: string
  schedule: AdminSchedule
  catalog: Catalog
  /** The business hours that day (masters without their own follow them). */
  dayHours: { opensMinutes: number; closesMinutes: number } | null
  /** «чт, 19 ноября». */
  dayLabel: string
  /** On today, only what is still ahead. */
  nowMinutes: number | null
  slotMinutes: number
  onClose: () => void
}

const SHORTEST_FALLBACK = 30

// The day's free time as a ready message for WhatsApp or an Instagram story: a line per master
// with their free stretches (long enough for their quickest service), then the booking link.
export const ShareWindowsSheet = ({
  slug,
  schedule,
  catalog,
  dayHours,
  dayLabel,
  nowMinutes,
  slotMinutes,
  onClose,
}: ShareWindowsSheetProps) => {
  const toast = useToast()
  const isTouch = useMediaQuery('(pointer: coarse)')
  const lines = schedule.specialists.flatMap((specialist) => {
    if (specialist.isOnLeave) return []
    const durations = catalog.services
      .filter(
        (service) =>
          service.isActive !== false &&
          catalog.specialists.some(
            (master) => master.id === specialist.id && master.serviceIds.includes(service.id),
          ),
      )
      .map((service) => service.durationMinutes)
    const gaps = freeGaps({
      day: specialist.hours === undefined ? dayHours : specialist.hours,
      bookings: schedule.bookings.filter((booking) => booking.specialistId === specialist.id),
      timeOff: schedule.timeOff.filter((item) => item.specialistId === specialist.id),
      from: nowMinutes,
      slotMinutes,
      minMinutes: durations.length > 0 ? Math.min(...durations) : SHORTEST_FALLBACK,
    })
    if (gaps.length === 0) return []
    const times = gaps.map(({ from, to }) => `${formatClock(from)}–${formatClock(to)}`)
    return [`${specialist.name.split(' ')[0]} — ${times.join(', ')}`]
  })
  const link =
    typeof window === 'undefined'
      ? `/${slug}/book?date=${schedule.date}`
      : `${window.location.origin}/${slug}/book?date=${schedule.date}`
  const text = [`Свободное время · ${dayLabel}`, ...lines, '', `Запись онлайн: ${link}`].join('\n')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.show({ title: 'Скопировано — вставьте в чат или сторис', type: 'success' })
    } catch {
      toast.show({ title: 'Не получилось скопировать', type: 'error' })
    }
  }

  const handleShare = async () => {
    try {
      await navigator.share({ text })
    } catch {
      // Closing the share sheet is not an error.
    }
  }

  return (
    <Sheet
      title='Свободные окна'
      onClose={onClose}
      action={
        lines.length > 0 ? { label: 'Скопировать', onClick: () => void handleCopy() } : undefined
      }
    >
      {lines.length === 0 ? (
        <EmptyState variant='inline' text='На этот день свободного времени нет.' />
      ) : (
        <>
          <section className={sheet.group} aria-label='Текст сообщения'>
            <p className={styles.message}>{text}</p>
          </section>
          <p className={sheet.groupFooter}>
            Окна не короче самой быстрой услуги мастера. Отправьте клиентам в WhatsApp или выложите
            в сторис.
          </p>
          {isTouch && typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button size='lg' onClick={() => void handleShare()}>
              <ShareNetwork aria-hidden />
              Поделиться
            </Button>
          )}
        </>
      )}
    </Sheet>
  )
}
