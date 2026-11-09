import { ChatText, X } from '@phosphor-icons/react/ssr'
import type { CSSProperties } from 'react'
import type { AdminBooking, Specialist, TimeOff, WorkingDay } from '@/common/api/types'
import { formatPhone } from '@/common/utils/formatPhone'
import { formatClock, parseClock } from '@/common/utils/workingHours'
import { formatPrice } from '@/features/booking/bookingUtils'
import { addMinutes } from '../../manageUtils'
import {
  COMPACT_BLOCK_PX,
  getDayRange,
  getMasterTint,
  HOUR,
  TALL_BLOCK_PX,
  toPx,
} from './calendarLayout'
import styles from './DayCalendar.module.css'

interface DayCalendarProps {
  specialists: Pick<Specialist, 'id' | 'name' | 'role'>[]
  bookings: AdminBooking[]
  timeOff: TimeOff[]
  hours: WorkingDay | null
  nowMinutes: number | null
  onSelectBooking: (booking: AdminBooking) => void
  onRemoveTimeOff: (id: string) => void
}

const position = (from: number, to: number, start: number): CSSProperties => ({
  top: toPx(from - start),
  height: Math.max(toPx(to - from) - 2, 28),
})

export const DayCalendar = ({
  specialists,
  bookings,
  timeOff,
  hours,
  nowMinutes,
  onSelectBooking,
  onRemoveTimeOff,
}: DayCalendarProps) => {
  const range = getDayRange(hours, bookings, timeOff)
  const height = toPx(range.end - range.start)
  const hourMarks = Array.from(
    { length: (range.end - range.start) / HOUR + 1 },
    (_, index) => range.start + index * HOUR,
  )
  const showNow = nowMinutes !== null && nowMinutes >= range.start && nowMinutes <= range.end
  const gridStyle = { '--columns': specialists.length } as CSSProperties

  return (
    <div className={styles.scroller}>
      <div className={styles.grid} style={gridStyle}>
        <div className={styles.corner} />
        {specialists.map((specialist, index) => (
          <div
            key={specialist.id}
            className={styles.columnHead}
            style={{ '--tint': getMasterTint(index) } as CSSProperties}
          >
            <span className={styles.master}>{specialist.name}</span>
            {specialist.role && <span className={styles.role}>{specialist.role}</span>}
          </div>
        ))}

        <div className={styles.axis} style={{ height }} aria-hidden='true'>
          {hourMarks.map((minutes) => (
            <span
              key={minutes}
              className={styles.hour}
              style={{ top: toPx(minutes - range.start) }}
            >
              {formatClock(minutes)}
            </span>
          ))}
        </div>

        {specialists.map((specialist, index) => (
          <section
            key={specialist.id}
            className={styles.column}
            style={{ height, '--tint': getMasterTint(index) } as CSSProperties}
            aria-label={specialist.name}
          >
            {hourMarks.slice(1, -1).map((minutes) => (
              <span
                key={minutes}
                className={styles.line}
                style={{ top: toPx(minutes - range.start) }}
                aria-hidden='true'
              />
            ))}
            {!hours && <span className={styles.closed} style={{ top: 0, height }} />}
            {hours && hours.opensMinutes > range.start && (
              <span
                className={styles.closed}
                style={position(range.start, hours.opensMinutes, range.start)}
              />
            )}
            {hours && hours.closesMinutes < range.end && (
              <span
                className={styles.closed}
                style={position(hours.closesMinutes, range.end, range.start)}
              />
            )}

            {timeOff
              .filter((item) => item.specialistId === specialist.id)
              .map((item) => (
                <div
                  key={item.id}
                  className={styles.timeOff}
                  style={position(parseClock(item.from), parseClock(item.to), range.start)}
                >
                  <span className={styles.blockTime}>
                    {item.from}–{item.to}
                  </span>
                  <span className={styles.blockTitle}>{item.reason || 'Время закрыто'}</span>
                  <button
                    type='button'
                    className={styles.remove}
                    aria-label={`Открыть время ${item.from}–${item.to}`}
                    onClick={() => onRemoveTimeOff(item.id)}
                  >
                    <X weight='bold' aria-hidden />
                  </button>
                </div>
              ))}

            {bookings
              .filter((booking) => booking.specialistId === specialist.id)
              // Cancelled slots can be re-booked; draw them first so live bookings sit on top.
              .sort(
                (first, second) =>
                  Number(first.status === 'confirmed') - Number(second.status === 'confirmed'),
              )
              .map((booking) => {
                const from = parseClock(booking.time)
                const to = from + booking.durationMinutes
                const end = addMinutes(booking.time, booking.durationMinutes)
                const blockHeight = toPx(to - from)
                const size =
                  blockHeight < COMPACT_BLOCK_PX
                    ? 'compact'
                    : blockHeight >= TALL_BLOCK_PX
                      ? 'tall'
                      : 'normal'

                return (
                  <button
                    key={booking.id}
                    type='button'
                    className={styles.booking}
                    data-cancelled={booking.status === 'cancelled' || undefined}
                    data-size={size}
                    style={position(from, to, range.start)}
                    onClick={() => onSelectBooking(booking)}
                    aria-label={`${booking.time}–${end}, ${booking.serviceName}, ${booking.customerName}, ${booking.customerPhone}${booking.status === 'cancelled' ? ', отменена' : ''}`}
                  >
                    <span className={styles.blockTime}>
                      {booking.time}–{end}
                    </span>
                    <span className={styles.blockTitle}>{booking.serviceName}</span>
                    <span className={styles.blockMeta}>
                      {booking.customerName}
                      {booking.comment && <ChatText className={styles.commentIcon} aria-hidden />}
                    </span>
                    {size === 'tall' && (
                      <span className={styles.blockFooter}>
                        <span>{formatPhone(booking.customerPhone)}</span>
                        <span className={styles.blockPrice}>{formatPrice(booking.price)}</span>
                      </span>
                    )}
                  </button>
                )
              })}

            {showNow && nowMinutes !== null && (
              <span
                className={styles.now}
                style={{ top: toPx(nowMinutes - range.start) }}
                aria-hidden='true'
              />
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
