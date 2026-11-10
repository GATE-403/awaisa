'use client'

import { ChatText, Check, X } from '@phosphor-icons/react/ssr'
import { type CSSProperties, type MouseEvent, useRef, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { addMinutes, formatClock, parseClock } from '@/entities/business'
import type { AdminBooking, Specialist, TimeOff, WorkingDay } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import {
  COMPACT_BLOCK_PX,
  getDayRange,
  getMasterTint,
  HOUR,
  TALL_BLOCK_PX,
  toPx,
} from './calendarLayout'
import styles from './DayCalendar.module.css'
import { useBookingDrag } from './useBookingDrag'

interface DayCalendarProps {
  specialists: (Pick<Specialist, 'id' | 'name' | 'role'> & {
    hours?: { opensMinutes: number; closesMinutes: number } | null
    isOnLeave?: boolean
    leaveReason?: string | null
  })[]
  bookings: AdminBooking[]
  timeOff: TimeOff[]
  hours: WorkingDay | null
  nowMinutes: number | null
  slotMinutes: number
  onSelectBooking: (booking: AdminBooking) => void
  onRemoveTimeOff: (id: string) => void
  /** `time` is null when the slot was chosen from the keyboard: the sheet picks the first free one. */
  onCreateBooking: (specialistId: string, time: string | null) => void
  onMoveBooking: (booking: AdminBooking, specialistId: string, time: string) => void
}

type Hover = { specialistId: string; minutes: number }

const position = (from: number, to: number, start: number): CSSProperties => ({
  top: toPx(from - start),
  height: Math.max(toPx(to - from) - 2, 28),
})

interface OffHoursProps {
  day: { opensMinutes: number; closesMinutes: number } | null
  range: { start: number; end: number }
  height: number
}

// Each master's own day: hatched before and after it, or all day when they are off.
const OffHours = ({ day, range, height }: OffHoursProps) => {
  if (!day) return <span className={styles.closed} style={{ top: 0, height }} />

  return (
    <>
      {day.opensMinutes > range.start && (
        <span
          className={styles.closed}
          style={position(range.start, day.opensMinutes, range.start)}
        />
      )}
      {day.closesMinutes < range.end && (
        <span
          className={styles.closed}
          style={position(day.closesMinutes, range.end, range.start)}
        />
      )}
    </>
  )
}

export const DayCalendar = ({
  specialists,
  bookings,
  timeOff,
  hours,
  nowMinutes,
  slotMinutes,
  onSelectBooking,
  onRemoveTimeOff,
  onCreateBooking,
  onMoveBooking,
}: DayCalendarProps) => {
  const [hover, setHover] = useState<Hover | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const range = getDayRange(hours, bookings, timeOff)
  const height = toPx(range.end - range.start)
  const hourMarks = Array.from(
    { length: (range.end - range.start) / HOUR + 1 },
    (_, index) => range.start + index * HOUR,
  )
  const showNow = nowMinutes !== null && nowMinutes >= range.start && nowMinutes <= range.end
  const gridStyle = { '--columns': specialists.length } as CSSProperties
  // Masters without their own day (older API) follow the business hours.
  const dayOf = (specialist: DayCalendarProps['specialists'][number]) =>
    specialist.hours === undefined ? hours : specialist.hours
  const headNote = (specialist: DayCalendarProps['specialists'][number]) => {
    if (specialist.isOnLeave) return specialist.leaveReason || 'Отпуск'
    const day = dayOf(specialist)
    if (!day) return 'Выходной'
    if (
      hours &&
      day.opensMinutes === hours.opensMinutes &&
      day.closesMinutes === hours.closesMinutes
    ) {
      return null
    }
    return `${formatClock(day.opensMinutes)}–${formatClock(day.closesMinutes)}`
  }
  const drag = useBookingDrag({ scrollerRef, range, slotMinutes, onMove: onMoveBooking })

  const minutesAt = (event: MouseEvent<HTMLElement>) => {
    const offset = event.clientY - event.currentTarget.getBoundingClientRect().top
    const minutes = range.start + offset / toPx(1)
    const snapped = Math.floor(minutes / slotMinutes) * slotMinutes

    return Math.min(Math.max(snapped, range.start), range.end - slotMinutes)
  }

  const handleCreate = (event: MouseEvent<HTMLElement>, specialistId: string) => {
    // detail is 0 for a click from the keyboard: there is no pointer position to read.
    onCreateBooking(specialistId, event.detail === 0 ? null : formatClock(minutesAt(event)))
  }

  return (
    <div
      className={styles.scroller}
      ref={scrollerRef}
      data-dragging={drag.dragged ? true : undefined}
    >
      <div className={styles.grid} style={gridStyle}>
        <div className={styles.corner} />
        {specialists.map((specialist, index) => (
          <div
            key={specialist.id}
            className={styles.columnHead}
            style={{ '--tint': getMasterTint(index) } as CSSProperties}
          >
            <span className={styles.master}>{specialist.name}</span>
            <span className={styles.role} data-off={dayOf(specialist) === null || undefined}>
              {headNote(specialist) ?? specialist.role}
            </span>
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
            data-specialist-id={specialist.id}
            onPointerLeave={() => setHover(null)}
          >
            <button
              type='button'
              className={styles.slotTarget}
              aria-label={`Новая запись к мастеру ${specialist.name}`}
              onClick={(event) => handleCreate(event, specialist.id)}
              onPointerMove={(event) => {
                if (event.pointerType !== 'mouse' || drag.dragged) return
                const minutes = minutesAt(event)
                if (hover?.specialistId !== specialist.id || hover.minutes !== minutes) {
                  setHover({ specialistId: specialist.id, minutes })
                }
              }}
            />
            {!drag.dragged && hover?.specialistId === specialist.id && (
              <span
                className={styles.ghost}
                style={position(hover.minutes, hover.minutes + slotMinutes, range.start)}
                aria-hidden='true'
              >
                {formatClock(hover.minutes)}
              </span>
            )}
            {hourMarks.slice(1, -1).map((minutes) => (
              <span
                key={minutes}
                className={styles.line}
                style={{ top: toPx(minutes - range.start) }}
                aria-hidden='true'
              />
            ))}
            <OffHours day={dayOf(specialist)} range={range} height={height} />

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
                    data-outcome={booking.outcome ?? undefined}
                    data-size={size}
                    data-dragging={drag.dragged?.id === booking.id || undefined}
                    style={position(from, to, range.start)}
                    onPointerDown={(event) => drag.handlePointerDown(event, booking)}
                    onClick={() => {
                      if (!drag.consumeClick()) onSelectBooking(booking)
                    }}
                    aria-label={`${booking.time}–${end}, ${booking.serviceName}, ${booking.customerName}, ${booking.customerPhone}${booking.status === 'cancelled' ? ', отменена' : ''}${booking.outcome === 'arrived' ? ', пришёл' : booking.outcome === 'no_show' ? ', не пришёл' : ''}`}
                  >
                    <span className={styles.blockTime}>
                      {booking.outcome === 'arrived' && (
                        <Check weight='bold' aria-hidden className={styles.outcomeIcon} />
                      )}
                      {booking.time}–{end}
                      {booking.outcome === 'no_show' && ' · не пришёл'}
                    </span>
                    <span className={styles.blockTitle}>{booking.serviceName}</span>
                    <span className={styles.blockClient}>
                      <span className={styles.mini} aria-hidden='true'>
                        {booking.customerName.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className={styles.blockClientName}>{booking.customerName}</span>
                      {booking.comment && size !== 'tall' && (
                        <ChatText className={styles.commentIcon} aria-hidden />
                      )}
                    </span>
                    {size === 'tall' && booking.comment && (
                      <span className={styles.blockComment}>«{booking.comment}»</span>
                    )}
                    {size === 'tall' && (
                      <span className={styles.blockFooter}>
                        <span>{formatPhone(booking.customerPhone)}</span>
                        <span className={styles.blockPrice}>{formatPrice(booking.price)}</span>
                      </span>
                    )}
                  </button>
                )
              })}

            {drag.dragged && drag.target?.specialistId === specialist.id && (
              <span
                className={styles.dropPreview}
                style={position(
                  drag.target.minutes,
                  drag.target.minutes + drag.dragged.durationMinutes,
                  range.start,
                )}
                aria-hidden='true'
              >
                <span className={styles.blockTime}>
                  {formatClock(drag.target.minutes)}–
                  {formatClock(drag.target.minutes + drag.dragged.durationMinutes)}
                </span>
                <span className={styles.blockTitle}>{drag.dragged.customerName}</span>
              </span>
            )}

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
