'use client'

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChatText,
  Check,
  Clock,
  Minus,
  Plus,
  X,
} from '@phosphor-icons/react/ssr'
import {
  type CSSProperties,
  type MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { formatPrice } from '@/entities/booking'
import { addMinutes, formatClock, PersonAvatar, parseClock } from '@/entities/business'
import type { AdminBooking, Specialist, TimeOff, WorkingDay } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import chip from '@/shared/ui/Chip/Chip.module.css'
import {
  type CalendarLayout,
  COMPACT_BLOCK_PX,
  clampZoom,
  getDayRange,
  getMasterTint,
  HOUR,
  MAX_ZOOM,
  MIN_ZOOM,
  minorStep,
  pxPerMinute,
  TALL_BLOCK_PX,
  TIMELINE_COMPACT_PX,
} from './calendarLayout'
import styles from './DayCalendar.module.css'
import { useBookingDrag } from './useBookingDrag'

interface DayCalendarProps {
  specialists: (Pick<Specialist, 'id' | 'name' | 'role'> & {
    photoUrl?: string | null
    hours?: { opensMinutes: number; closesMinutes: number } | null
    isOnLeave?: boolean
    leaveReason?: string | null
  })[]
  bookings: AdminBooking[]
  timeOff: TimeOff[]
  hours: WorkingDay | null
  nowMinutes: number | null
  /** A day gone by: every visit on it has ended. */
  isPast?: boolean
  slotMinutes: number
  /** «Колонки» (default) or «Лента»: masters as rows with time running across. */
  layout?: CalendarLayout
  /** The timeline's zoom, 1–4 (ignored by the columns). */
  zoom?: number
  /** Pinch or ctrl + wheel over the timeline asks for a new zoom. */
  onZoomChange?: (zoom: number) => void
  onSelectBooking: (booking: AdminBooking) => void
  onRemoveTimeOff: (id: string) => void
  /** `time` is null when the slot was chosen from the keyboard: the sheet picks the first free one. */
  onCreateBooking: (specialistId: string, time: string | null) => void
  onMoveBooking: (booking: AdminBooking, specialistId: string, time: string) => void
}

type Hover = { specialistId: string; minutes: number }

type BlockTone = 'plain' | 'accent' | 'warning' | 'success' | 'danger' | 'muted'

// What a visit needs from the salon right now, read at a glance from the first chip.
const blockState = (
  booking: AdminBooking,
  from: number,
  to: number,
  nowMinutes: number | null,
  isPast: boolean,
): { tone: BlockTone; label: string } => {
  if (booking.status === 'cancelled') return { tone: 'muted', label: 'Отменена' }
  if (booking.payment?.status === 'pending') return { tone: 'muted', label: 'Ждёт оплату' }
  if (booking.outcome === 'arrived') return { tone: 'success', label: 'Пришёл' }
  if (booking.outcome === 'no_show') return { tone: 'danger', label: 'Не пришёл' }
  if (isPast || (nowMinutes !== null && to <= nowMinutes)) {
    return { tone: 'warning', label: 'Отметить' }
  }
  if (nowMinutes !== null && from <= nowMinutes) return { tone: 'accent', label: 'Сейчас' }

  return { tone: 'plain', label: 'Ждём' }
}

// Room left under the day before the window's foot.
const BOTTOM_GAP_PX = 24

type Place = (from: number, to: number) => CSSProperties

// A span of the day as a box: down a column, or across a timeline row.
const placer =
  (layout: CalendarLayout, start: number, perMinute: number): Place =>
  (from, to) => {
    const offset = (from - start) * perMinute
    const length = Math.max((to - from) * perMinute - 2, 28)
    return layout === 'timeline' ? { left: offset, width: length } : { top: offset, height: length }
  }

interface OffHoursProps {
  day: { opensMinutes: number; closesMinutes: number } | null
  range: { start: number; end: number }
  place: Place
}

// Each master's own day: hatched before and after it, or all day when they are off.
const OffHours = ({ day, range, place }: OffHoursProps) => {
  if (!day) return <span className={styles.closed} style={place(range.start, range.end)} />

  return (
    <>
      {day.opensMinutes > range.start && (
        <span className={styles.closed} style={place(range.start, day.opensMinutes)} />
      )}
      {day.closesMinutes < range.end && (
        <span className={styles.closed} style={place(day.closesMinutes, range.end)} />
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
  isPast = false,
  slotMinutes,
  layout = 'columns',
  zoom = 1,
  onZoomChange,
  onSelectBooking,
  onRemoveTimeOff,
  onCreateBooking,
  onMoveBooking,
}: DayCalendarProps) => {
  const [hover, setHover] = useState<Hover | null>(null)
  // The timeline can show one master alone: a tap on their face in the corner stack.
  const [focusId, setFocusId] = useState<string | null>(null)
  // Where «now» is while the day is scrolled away from it: before, after, or null when in view.
  const [nowSide, setNowSide] = useState<'before' | 'after' | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const scrolledToNow = useRef<CalendarLayout | null>(null)
  const range = getDayRange(hours, bookings, timeOff)
  const isTimeline = layout === 'timeline'
  const shown = isTimeline && focusId ? specialists.filter(({ id }) => id === focusId) : specialists
  // A master keeps their colour whoever else is shown.
  const tintOf = (id: string) =>
    getMasterTint(
      Math.max(
        0,
        specialists.findIndex((specialist) => specialist.id === id),
      ),
    )
  const perMinute = pxPerMinute(layout, zoom)
  const toPx = (minutes: number) => minutes * perMinute
  const place = placer(layout, range.start, perMinute)
  const step = minorStep(layout, zoom)
  // Halves or quarters between the hours once the timeline is zoomed in far enough.
  const minorMarks = step
    ? Array.from(
        { length: (range.end - range.start) / step },
        (_, index) => range.start + index * step,
      ).filter((minutes) => minutes % HOUR !== 0)
    : []
  // The day's length along its axis: the columns' height, or the timeline rows' width.
  const span = toPx(range.end - range.start)
  const along = (minutes: number): CSSProperties =>
    isTimeline ? { left: toPx(minutes - range.start) } : { top: toPx(minutes - range.start) }
  const daySize: CSSProperties = isTimeline ? { width: span } : { height: span }
  // On the timeline the grid is laid out by hand: hours across the top, then a row per master
  // (its name, then its day) — the same elements as the columns, placed differently.
  const cell = (row: number, column: number): CSSProperties =>
    isTimeline ? { gridRow: row, gridColumn: column } : {}
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
  const drag = useBookingDrag({
    scrollerRef,
    range,
    slotMinutes,
    axis: isTimeline ? 'x' : 'y',
    pxPerMinute: perMinute,
    onMove: onMoveBooking,
  })
  const nowOffset = showNow ? toPx(nowMinutes - range.start) : null
  // What stays under the pointer (or in the middle) while the zoom changes.
  const anchorRef = useRef<{ minutes: number; x: number } | null>(null)
  const perMinuteRef = useRef(perMinute)
  const zoomRef = useRef(zoom)
  const onZoomRef = useRef(onZoomChange)

  useEffect(() => {
    zoomRef.current = zoom
    onZoomRef.current = onZoomChange
  })

  // Zooming keeps the anchored time where it was: under the pointer for a pinch, else the middle.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const previous = perMinuteRef.current
    perMinuteRef.current = perMinute
    if (!scroller || !isTimeline || previous === perMinute) return
    const visible = scroller.clientWidth
    const anchor = anchorRef.current ?? {
      minutes: (scroller.scrollLeft + visible / 2) / previous,
      x: visible / 2,
    }
    anchorRef.current = null
    scroller.scrollLeft = anchor.minutes * perMinute - anchor.x
  }, [perMinute, isTimeline])

  // Pinch on a trackpad (a wheel event with ctrl), ctrl/⌘ + wheel, or two fingers on a screen.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || !isTimeline) return
    const zoomAround = (next: number, clientX: number) => {
      const zoomTo = clampZoom(next)
      if (zoomTo === zoomRef.current) return
      const x = clientX - scroller.getBoundingClientRect().left
      anchorRef.current = {
        minutes: (scroller.scrollLeft + x) / perMinuteRef.current,
        x,
      }
      onZoomRef.current?.(zoomTo)
    }
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      zoomAround(zoomRef.current * Math.exp(-event.deltaY * 0.01), event.clientX)
    }
    let pinch: { distance: number; zoom: number } | null = null
    const spread = (touches: TouchList) => {
      const [first, second] = [touches[0], touches[1]]
      return first && second
        ? Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
        : 0
    }
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2)
        pinch = { distance: spread(event.touches), zoom: zoomRef.current }
    }
    const handleTouchMove = (event: TouchEvent) => {
      if (!pinch || event.touches.length !== 2 || pinch.distance === 0) return
      event.preventDefault()
      const [first, second] = [event.touches[0], event.touches[1]]
      if (!first || !second) return
      zoomAround(
        pinch.zoom * (spread(event.touches) / pinch.distance),
        (first.clientX + second.clientX) / 2,
      )
    }
    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinch = null
    }
    scroller.addEventListener('wheel', handleWheel, { passive: false })
    scroller.addEventListener('touchstart', handleTouchStart, { passive: true })
    scroller.addEventListener('touchmove', handleTouchMove, { passive: false })
    scroller.addEventListener('touchend', handleTouchEnd)
    return () => {
      scroller.removeEventListener('wheel', handleWheel)
      scroller.removeEventListener('touchstart', handleTouchStart)
      scroller.removeEventListener('touchmove', handleTouchMove)
      scroller.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isTimeline])

  // The day fills the window down to its foot in both views, so the page itself does not scroll
  // for it: measured from where the box starts (which moves when the bars above it change), with
  // a small margin under it — floating bars («Все пришли») sit over the day's foot.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const fit = () => {
      const top = scroller.getBoundingClientRect().top + window.scrollY
      const fill = `${Math.max(420, window.innerHeight - top - BOTTOM_GAP_PX)}px`
      if (scroller.style.height === fill) return
      scroller.style.height = fill
      scroller.style.maxHeight = fill
    }
    fit()
    const observer = new ResizeObserver(fit)
    if (scroller.parentElement) observer.observe(scroller.parentElement)
    observer.observe(document.body)
    window.addEventListener('resize', fit)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [])

  // Watch whether «now» is in view, so a «Сейчас» capsule can bring it back.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || nowOffset === null) {
      setNowSide(null)
      return
    }
    const check = () => {
      const position = isTimeline ? nowOffset - scroller.scrollLeft : nowOffset - scroller.scrollTop
      // The columns' masters row (56pt) covers the top of the view.
      const size = isTimeline ? scroller.clientWidth : scroller.clientHeight - 56
      const next = position < 0 ? 'before' : position > size ? 'after' : null
      setNowSide((current) => (current === next ? current : next))
    }
    check()
    scroller.addEventListener('scroll', check, { passive: true })
    return () => scroller.removeEventListener('scroll', check)
  }, [nowOffset, isTimeline])

  const scrollToNow = () => {
    const scroller = scrollerRef.current
    if (!scroller || nowOffset === null) return
    if (isTimeline) {
      scroller.scrollTo({
        left: Math.max(0, nowOffset - scroller.clientWidth / 3),
        behavior: 'smooth',
      })
    } else {
      scroller.scrollTo({
        top: Math.max(0, nowOffset - scroller.clientHeight / 3),
        behavior: 'smooth',
      })
    }
  }

  // The day scrolls inside its own box; on today it opens with the red line a third of the way
  // in, once per layout — the minute ticks after that must not pull the view back.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || nowOffset === null || scrolledToNow.current === layout) return
    scrolledToNow.current = layout
    if (layout === 'timeline') {
      scroller.scrollLeft = Math.max(0, nowOffset - scroller.clientWidth / 3)
    } else {
      scroller.scrollTop = Math.max(0, nowOffset - scroller.clientHeight / 3)
    }
  }, [nowOffset, layout])

  const minutesAt = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const offset = isTimeline ? event.clientX - rect.left : event.clientY - rect.top
    const minutes = range.start + offset / toPx(1)
    const snapped = Math.floor(minutes / slotMinutes) * slotMinutes

    return Math.min(Math.max(snapped, range.start), range.end - slotMinutes)
  }

  // The master's face on what is theirs: a card, the slot preview, an empty lane.
  const face = (specialist: DayCalendarProps['specialists'][number], className: string) => (
    <PersonAvatar
      name={specialist.name}
      src={specialist.photoUrl ?? undefined}
      size='sm'
      className={className}
    />
  )

  const handleCreate = (event: MouseEvent<HTMLElement>, specialistId: string) => {
    // detail is 0 for a click from the keyboard: there is no pointer position to read.
    onCreateBooking(specialistId, event.detail === 0 ? null : formatClock(minutesAt(event)))
  }

  return (
    <div className={styles.frame}>
      {isTimeline && specialists.length > 1 && (
        // Whose day to show: everyone, or one master — capsules with the face and first name.
        <div className={styles.viewBar}>
          <div className={styles.filters}>
            <button
              type='button'
              className={chip.chip}
              aria-pressed={focusId === null}
              onClick={() => setFocusId(null)}
            >
              Все
            </button>
            {specialists.map((specialist) => (
              <button
                key={specialist.id}
                type='button'
                className={`${chip.chip} ${styles.filterChip}`}
                style={{ '--tint': tintOf(specialist.id) } as CSSProperties}
                aria-pressed={focusId === specialist.id}
                onClick={() => setFocusId(focusId === specialist.id ? null : specialist.id)}
              >
                {face(specialist, styles.chipFace)}
                {specialist.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}
      {isTimeline && onZoomChange && (
        // Zoom, like a map's: a small capsule in the corner of the timeline.
        <div className={styles.zoomPill}>
          <button
            type='button'
            aria-label='Уменьшить масштаб'
            disabled={zoom <= MIN_ZOOM}
            onClick={() => onZoomChange(clampZoom(zoom / 1.5))}
          >
            <Minus weight='bold' aria-hidden />
          </button>
          <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
          <button
            type='button'
            aria-label='Увеличить масштаб'
            disabled={zoom >= MAX_ZOOM}
            onClick={() => onZoomChange(clampZoom(zoom * 1.5))}
          >
            <Plus weight='bold' aria-hidden />
          </button>
        </div>
      )}
      {nowSide && nowMinutes !== null && (
        <button
          type='button'
          className={styles.toNow}
          data-side={nowSide}
          data-layout={layout}
          onClick={scrollToNow}
        >
          {isTimeline && nowSide === 'before' && <ArrowLeft weight='bold' aria-hidden />}
          {!isTimeline && nowSide === 'before' && <ArrowUp weight='bold' aria-hidden />}
          Сейчас {formatClock(nowMinutes)}
          {isTimeline && nowSide === 'after' && <ArrowRight weight='bold' aria-hidden />}
          {!isTimeline && nowSide === 'after' && <ArrowDown weight='bold' aria-hidden />}
        </button>
      )}
      <div
        className={styles.scroller}
        ref={scrollerRef}
        data-dragging={drag.dragged ? true : undefined}
      >
        <div className={styles.grid} style={gridStyle} data-layout={layout}>
          <div className={styles.corner} style={cell(1, 1)} />
          {shown.map((specialist, index) => (
            <div
              key={specialist.id}
              className={styles.columnHead}
              style={{ '--tint': tintOf(specialist.id), ...cell(index + 2, 1) } as CSSProperties}
            >
              <PersonAvatar
                name={specialist.name}
                src={specialist.photoUrl ?? undefined}
                size='sm'
                className={styles.face}
              />
              <span className={styles.headText}>
                <span className={styles.master}>{specialist.name}</span>
                <span className={styles.role} data-off={dayOf(specialist) === null || undefined}>
                  {headNote(specialist) ?? specialist.role}
                </span>
              </span>
            </div>
          ))}

          <div className={styles.axis} style={{ ...daySize, ...cell(1, 1) }} aria-hidden='true'>
            {hourMarks.map((minutes) => (
              <span key={minutes} className={styles.hour} style={along(minutes)}>
                {formatClock(minutes)}
              </span>
            ))}
            {minorMarks.map((minutes) => (
              <span key={minutes} className={styles.minorHour} style={along(minutes)}>
                {formatClock(minutes)}
              </span>
            ))}
            {/* The time now, as a red capsule on the hours: what the red line means. */}
            {showNow && nowMinutes !== null && !isTimeline && (
              <span className={styles.nowLabel} style={along(nowMinutes)}>
                {formatClock(nowMinutes)}
              </span>
            )}
          </div>

          {/* On the timeline «now» is one line through every lane, its time on top. */}
          {showNow && nowMinutes !== null && isTimeline && (
            <span className={styles.nowLine} style={along(nowMinutes)} aria-hidden='true'>
              <span className={styles.nowLabel}>{formatClock(nowMinutes)}</span>
            </span>
          )}

          {shown.map((specialist, index) => (
            <section
              key={specialist.id}
              className={styles.column}
              style={
                {
                  ...daySize,
                  '--tint': tintOf(specialist.id),
                  ...cell(index + 2, 1),
                } as CSSProperties
              }
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
                  style={place(hover.minutes, hover.minutes + slotMinutes)}
                  aria-hidden='true'
                >
                  {isTimeline && face(specialist, styles.cardFace)}
                  {isTimeline && `${specialist.name.split(' ')[0]} · `}
                  {formatClock(hover.minutes)}
                </span>
              )}
              {/* Whose lane this is: its first line, above the cards, pinned left while the day scrolls. */}
              {isTimeline && bookings.some((booking) => booking.specialistId === specialist.id) && (
                <span className={styles.laneTag} aria-hidden='true'>
                  {face(specialist, styles.cardFace)}
                  <span className={styles.laneName}>{specialist.name.split(' ')[0]}</span>
                  {headNote(specialist) ?? specialist.role}
                </span>
              )}
              {/* No names on the timeline: a master with nothing booked says so, and books in a tap. */}
              {isTimeline &&
                !bookings.some((booking) => booking.specialistId === specialist.id) &&
                !timeOff.some((item) => item.specialistId === specialist.id) &&
                (isPast || dayOf(specialist) === null || specialist.isOnLeave ? (
                  <span className={styles.laneEmpty} onPointerEnter={() => setHover(null)}>
                    {face(specialist, styles.cardFace)}
                    <span className={styles.laneName}>{specialist.name.split(' ')[0]}</span>
                    {dayOf(specialist) === null || specialist.isOnLeave
                      ? (headNote(specialist) ?? 'Выходной')
                      : 'без записей'}
                  </span>
                ) : (
                  <button
                    type='button'
                    className={styles.laneEmpty}
                    onPointerEnter={() => setHover(null)}
                    data-action
                    onClick={() => onCreateBooking(specialist.id, null)}
                  >
                    {face(specialist, styles.cardFace)}
                    <span className={styles.laneName}>{specialist.name.split(' ')[0]}</span>
                    свободен весь день
                    <span className={styles.laneBook}>
                      <Plus weight='bold' aria-hidden />
                      Записать
                    </span>
                  </button>
                ))}
              {hourMarks.slice(1, -1).map((minutes) => (
                <span
                  key={minutes}
                  className={styles.line}
                  style={along(minutes)}
                  aria-hidden='true'
                />
              ))}
              {minorMarks.map((minutes) => (
                <span
                  key={minutes}
                  className={styles.minorLine}
                  style={along(minutes)}
                  aria-hidden='true'
                />
              ))}
              <OffHours day={dayOf(specialist)} range={range} place={place} />

              {timeOff
                .filter((item) => item.specialistId === specialist.id)
                .map((item) => (
                  <div
                    key={item.id}
                    className={styles.timeOff}
                    onPointerEnter={() => setHover(null)}
                    style={place(parseClock(item.from), parseClock(item.to))}
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
                  const length = toPx(to - from)
                  // Across, a block is as tall as its row: it never grows the footer line.
                  const size = isTimeline
                    ? length < TIMELINE_COMPACT_PX
                      ? 'compact'
                      : 'normal'
                    : length < COMPACT_BLOCK_PX
                      ? 'compact'
                      : length >= TALL_BLOCK_PX
                        ? 'tall'
                        : 'normal'
                  const state = blockState(booking, from, to, nowMinutes, isPast)
                  // The visit under way fills up to now, like a progress bar along its time.
                  const progress =
                    state.tone === 'accent' && nowMinutes !== null
                      ? Math.round(((nowMinutes - from) / (to - from)) * 100)
                      : null
                  const paid =
                    booking.outcome === 'arrived'
                      ? (booking.paidAmount ?? booking.price)
                      : booking.price - (booking.discount?.amount ?? 0)

                  return (
                    <button
                      key={booking.id}
                      type='button'
                      className={styles.booking}
                      data-cancelled={booking.status === 'cancelled' || undefined}
                      data-outcome={booking.outcome ?? undefined}
                      data-tone={state.tone}
                      data-size={size}
                      data-dragging={drag.dragged?.id === booking.id || undefined}
                      style={
                        progress === null
                          ? place(from, to)
                          : ({ ...place(from, to), '--progress': `${progress}%` } as CSSProperties)
                      }
                      onPointerDown={(event) => drag.handlePointerDown(event, booking)}
                      // The empty-slot preview must not peek out from under a card the pointer
                      // moved onto.
                      onPointerEnter={() => setHover(null)}
                      onClick={() => {
                        if (!drag.consumeClick()) onSelectBooking(booking)
                      }}
                      aria-label={`${booking.time}–${end}, ${booking.serviceName}, ${booking.customerName}, ${booking.customerPhone}${booking.status === 'cancelled' ? ', отменена' : ''}${booking.outcome === 'arrived' ? ', пришёл' : booking.outcome === 'no_show' ? ', не пришёл' : ''}`}
                    >
                      {size === 'compact' ? (
                        <span className={styles.blockLine}>
                          {/* On the timeline the card's own fill already says the state; a short card keeps its room
                             for the client's name, the lane's other cards carry the face. */}
                          {state.tone !== 'plain' && !isTimeline && (
                            <span className={styles.stateDot} data-tone={state.tone} aria-hidden />
                          )}
                          <span className={styles.blockTitle}>{booking.customerName}</span>
                          <span className={styles.blockTime}>{booking.time}</span>
                        </span>
                      ) : (
                        <span className={styles.chips}>
                          <span className={styles.chip} data-tone={state.tone}>
                            {state.tone === 'success' && <Check weight='bold' aria-hidden />}
                            {state.tone === 'accent' && (
                              <span className={styles.stateDot} data-tone='accent' aria-hidden />
                            )}
                            {state.label}
                          </span>
                          <span className={styles.chip}>
                            {size === 'tall'
                              ? formatPrice(paid)
                              : // Across, the card's length already shows when it ends.
                                isTimeline
                                ? booking.time
                                : `${booking.time}–${end}`}
                          </span>
                        </span>
                      )}
                      {size !== 'compact' && (
                        <span className={styles.blockTitle}>{booking.customerName}</span>
                      )}
                      <span className={styles.blockService}>↳ {booking.serviceName}</span>
                      {size === 'tall' && (
                        <span className={styles.blockFooter}>
                          <span className={styles.footerNote}>
                            {booking.comment ? (
                              <>
                                <ChatText aria-hidden />«{booking.comment}»
                              </>
                            ) : (
                              formatPhone(booking.customerPhone)
                            )}
                          </span>
                          <span className={styles.footerTime}>
                            <Clock aria-hidden />
                            {booking.time}–{end}
                          </span>
                        </span>
                      )}
                    </button>
                  )
                })}

              {drag.dragged && drag.target?.specialistId === specialist.id && (
                <span
                  className={styles.dropPreview}
                  style={place(
                    drag.target.minutes,
                    drag.target.minutes + drag.dragged.durationMinutes,
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

              {showNow && nowMinutes !== null && !isTimeline && (
                <span className={styles.now} style={along(nowMinutes)} aria-hidden='true' />
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
