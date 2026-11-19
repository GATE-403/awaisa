'use client'

import { ContextMenu } from '@awaisa/ui/ContextMenu'
import { Menu, MenuItem, MenuSeparator } from '@awaisa/ui/Menu'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  ChatText,
  Check,
  CircleDashed,
  Clock,
  Minus,
  Plus,
  Timer,
  X,
  XCircle,
} from '@phosphor-icons/react/ssr'
import {
  type CSSProperties,
  Fragment,
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
import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
import { pluralWord } from '@/shared/lib/plural'
import { VisitMenuItems } from '@/shared/ui/VisitMenuItem/VisitMenuItem'
import {
  type CalendarLayout,
  COMPACT_BLOCK_PX,
  clampZoom,
  getDayRange,
  getMasterTint,
  HOUR,
  MAX_ZOOM,
  MIN_ZOOM,
  masterDayLoad,
  minorStep,
  pxPerMinute,
  TALL_BLOCK_PX,
  TIMELINE_COMPACT_PX,
} from './calendarLayout'
import styles from './DayCalendar.module.css'
import { freeGaps } from './freeGaps'
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
  /** «✓ Пришёл» right on an ended, unmarked visit's card. */
  onMarkArrived?: (booking: AdminBooking) => void
  /** A visit to bring into view and flash (picked from «N визитов прошли без отметки»). */
  focusedBookingId?: string | null
  /** Room kept under the day for a bar floating at the window's foot, so it never covers the scrollbar. */
  bottomInset?: number
  /** The day shown (`YYYY-MM-DD`): when it changes the lanes slide in from that side. */
  dayKey?: string
  /** «Найти место»: light up the gaps where a service this long fits (only these masters). */
  fit?: { minutes: number; specialistIds: string[] | null } | null
  /** «Не пришёл» from a card's right-click menu. */
  onMarkNoShow?: (booking: AdminBooking) => void
  /** «Отменить запись» from a card's right-click menu (undo comes from the toast). */
  onCancelBooking?: (booking: AdminBooking) => void
  /** A swipe sideways past the day's edge: the next (1) or previous (-1) day. */
  onSwipeDay?: (step: 1 | -1) => void
  onSelectBooking: (booking: AdminBooking) => void
  onRemoveTimeOff: (id: string) => void
  /** `time` is null when the slot was chosen from the keyboard: the sheet picks the first free one. */
  onCreateBooking: (specialistId: string, time: string | null) => void
  onMoveBooking: (booking: AdminBooking, specialistId: string, time: string) => void
}

type Hover = { specialistId: string; minutes: number }

type BlockTone = 'plain' | 'accent' | 'warning' | 'success' | 'danger' | 'muted'

// A visit's state as a glyph, never a bare dot: to mark — a dashed circle waiting for its tick;
// came — a tick; did not come — a crossed circle; under way — a timer.
const StateGlyph = ({ tone }: { tone: BlockTone }) => {
  if (tone === 'warning') return <CircleDashed weight='bold' aria-hidden />
  if (tone === 'success') return <Check weight='bold' aria-hidden />
  if (tone === 'danger') return <XCircle weight='bold' aria-hidden />
  if (tone === 'accent') return <Timer weight='bold' aria-hidden />
  return null
}

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
  onMarkArrived,
  focusedBookingId = null,
  bottomInset = 0,
  dayKey,
  fit = null,
  onMarkNoShow,
  onCancelBooking,
  onSwipeDay,
  onSelectBooking,
  onRemoveTimeOff,
  onCreateBooking,
  onMoveBooking,
}: DayCalendarProps) => {
  const [hover, setHover] = useState<Hover | null>(null)
  // A right click opens the visit's menu with a mouse; on touch screens a long press drags.
  const isFinePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  // What the right click landed on: a visit, or a free spot in a master's lane.
  const [menuTarget, setMenuTarget] = useState<
    { booking: AdminBooking } | { specialistId: string; minutes: number | null } | null
  >(null)
  // The timeline can show one master alone: a tap on their face in the corner stack.
  const [focusId, setFocusId] = useState<string | null>(null)
  // Where «now» is while the day is scrolled away from it: before, after, or null when in view.
  const [nowSide, setNowSide] = useState<'before' | 'after' | null>(null)
  // The timeline's visible stretch, for the «‹ 2 записи» / «3 записи ›» hints at the lanes' edges.
  // The part of the day in view, along its axis (the columns' masters row covers `inset` of it).
  const [view, setView] = useState({ start: 0, size: 0, inset: 0 })
  // Which way the day moved, kept beside the key (the «previous prop in state» pattern): the lanes
  // slide in from the right for a later day, from the left for an earlier one.
  const [shownDay, setShownDay] = useState<{ key?: string; direction?: 'next' | 'prev' }>({
    key: dayKey,
  })
  if (dayKey !== shownDay.key) {
    setShownDay({
      key: dayKey,
      direction: dayKey && shownDay.key ? (dayKey > shownDay.key ? 'next' : 'prev') : undefined,
    })
  }
  // Visits that have just turned «Пришёл» (one at a time, or the whole day by «Все пришли»), in
  // the day's order: their cards play the check in a wave. Kept beside the outcomes they came
  // from, so a newly loaded day animates nothing.
  const outcomesKey = bookings.map((booking) => `${booking.id}:${booking.outcome ?? ''}`).join('|')
  const [marked, setMarked] = useState<{ key: string; ids: string[] }>({
    key: outcomesKey,
    ids: [],
  })
  if (outcomesKey !== marked.key) {
    const before = new Map(
      marked.key.split('|').map((pair) => pair.split(':') as [string, string | undefined]),
    )
    const ids = bookings
      .filter(
        (booking) =>
          booking.outcome === 'arrived' &&
          before.has(booking.id) &&
          before.get(booking.id) !== 'arrived',
      )
      .sort((first, second) => first.time.localeCompare(second.time))
      .map((booking) => booking.id)
    setMarked({ key: outcomesKey, ids })
  }
  const scrollerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const edgeKeyRef = useRef<(left: number, width: number) => string>(() => '')
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
  const gridStyle = {
    '--columns': specialists.length,
    // The timeline draws its hour lines down the whole box, under and below the lanes.
    '--hour-px': `${toPx(HOUR)}px`,
    '--view-size': view.size > 0 ? `${view.size}px` : undefined,
    '--view-inset': `${view.inset}px`,
  } as CSSProperties
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
      // A plain wheel turns the day sideways while every lane fits the box's height (a mouse
      // otherwise needs Shift); a trackpad's own sideways swipe passes through untouched.
      if (!event.ctrlKey && !event.metaKey) {
        const fitsHeight = scroller.scrollHeight <= scroller.clientHeight + 2
        if (fitsHeight && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
          event.preventDefault()
          scroller.scrollLeft += event.deltaY
        }
        return
      }
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
      const fill = `${Math.max(420, window.innerHeight - top - BOTTOM_GAP_PX - bottomInset)}px`
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
  }, [bottomInset])

  // On a short screen (iPhone SE) the day keeps its least height and runs under the floating
  // «Все пришли» bar: the corner controls (masters, zoom, «Сейчас») rise above the bar by as much
  // as it covers. Written to a CSS variable on scroll — no re-render.
  useEffect(() => {
    const box = frameRef.current
    if (!box) return
    if (!bottomInset) {
      box.style.removeProperty('--foot-lift')
      return
    }
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const covered = box.getBoundingClientRect().bottom - (window.innerHeight - bottomInset)
        const lift = `${Math.max(0, Math.round(covered))}px`
        if (box.style.getPropertyValue('--foot-lift') !== lift) {
          box.style.setProperty('--foot-lift', lift)
        }
      })
    }
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      box.style.removeProperty('--foot-lift')
    }
  }, [bottomInset])

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

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    let frame = 0
    const read = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const inset = isTimeline
          ? 0
          : (scroller.querySelector<HTMLElement>('[data-column-head]')?.offsetHeight ?? 0)
        const next = isTimeline
          ? { start: scroller.scrollLeft, size: scroller.clientWidth, inset }
          : { start: scroller.scrollTop, size: scroller.clientHeight - inset, inset }
        // Re-render only when a visit crosses an edge of the view (the tabs change), not on every
        // scrolled frame — a re-render of the whole day per frame made it shake.
        setView((current) =>
          current.size === next.size &&
          current.inset === next.inset &&
          edgeKeyRef.current(current.start, current.size) ===
            edgeKeyRef.current(next.start, next.size)
            ? current
            : next,
        )
      })
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(scroller)
    scroller.addEventListener('scroll', read, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      scroller.removeEventListener('scroll', read)
    }
  }, [isTimeline])

  // A visit picked from the list of unmarked ones glides into the middle and flashes.
  useEffect(() => {
    if (!focusedBookingId) return
    const card = scrollerRef.current?.querySelector<HTMLElement>(
      `[data-booking-id="${focusedBookingId}"]`,
    )
    if (!card) return
    card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    card.dataset.flash = ''
    const timer = window.setTimeout(() => delete card.dataset.flash, 1800)
    return () => window.clearTimeout(timer)
  }, [focusedBookingId])

  // Going to a visit from an edge tab: the day glides there and the card lights up for a moment,
  // so the eye lands on it.
  const goToVisit = (bookingId: string, offset: number) => {
    scrollToOffset(offset)
    const card = scrollerRef.current?.querySelector<HTMLElement>(`[data-booking-id="${bookingId}"]`)
    if (!card) return
    card.dataset.flash = ''
    window.setTimeout(() => delete card.dataset.flash, 1800)
  }

  const scrollToOffset = (offset: number) =>
    scrollerRef.current?.scrollTo({
      [isTimeline ? 'left' : 'top']: Math.max(0, offset - view.size / 3),
      behavior: 'smooth',
    })

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
  // Another day (no «now») forgets it, so coming back to today opens at now again; the scroll waits
  // a frame, until the day's width and the box's height are laid out.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (nowOffset === null) {
      scrolledToNow.current = null
      return
    }
    if (!scroller || scrolledToNow.current === layout) return
    // The flag is set in the frame itself: a cleanup that cancels the frame (React runs effects
    // twice in development) must leave the next run free to scroll.
    const frame = requestAnimationFrame(() => {
      scrolledToNow.current = layout
      if (layout === 'timeline') {
        scroller.scrollLeft = Math.max(0, nowOffset - scroller.clientWidth / 3)
      } else {
        scroller.scrollTop = Math.max(0, nowOffset - scroller.clientHeight / 3)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [nowOffset, layout])

  // A swipe sideways turns the day: on the columns whenever they fit the width, on the timeline
  // only past its start or end (inside, the finger scrolls the day).
  const swipeRef = useRef(onSwipeDay)
  useEffect(() => {
    swipeRef.current = onSwipeDay
  })
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    let start: { x: number; y: number; left: number; atStart: boolean; atEnd: boolean } | null =
      null
    const handleStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (event.touches.length !== 1 || !touch) {
        start = null
        return
      }
      const maxLeft = scroller.scrollWidth - scroller.clientWidth
      start = {
        x: touch.clientX,
        y: touch.clientY,
        left: scroller.scrollLeft,
        atStart: scroller.scrollLeft <= 1,
        atEnd: scroller.scrollLeft >= maxLeft - 1,
      }
    }
    const handleEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0]
      if (!start || !touch || !swipeRef.current) return
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      const moved = Math.abs(scroller.scrollLeft - start.left) > 2
      const isSideways = Math.abs(dx) > 72 && Math.abs(dx) > 2 * Math.abs(dy)
      const fits = scroller.scrollWidth <= scroller.clientWidth + 2
      if (isSideways && !moved) {
        if (dx < 0 && (fits || start.atEnd)) swipeRef.current(1)
        if (dx > 0 && (fits || start.atStart)) swipeRef.current(-1)
      }
      start = null
    }
    scroller.addEventListener('touchstart', handleStart, { passive: true })
    scroller.addEventListener('touchend', handleEnd, { passive: true })
    return () => {
      scroller.removeEventListener('touchstart', handleStart)
      scroller.removeEventListener('touchend', handleEnd)
    }
  }, [])

  const handleContextMenu = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    const card = target.closest<HTMLElement>('[data-booking-id]')
    const booking = card && bookings.find((item) => item.id === card.dataset.bookingId)
    if (booking) {
      setMenuTarget({ booking })
      return
    }
    const lane = target.closest<HTMLElement>('section[data-specialist-id]')
    const specialistId = lane?.dataset.specialistId
    if (!lane || !specialistId) {
      setMenuTarget(null)
      return
    }
    const rect = lane.getBoundingClientRect()
    const offset = isTimeline ? event.clientX - rect.left : event.clientY - rect.top
    const snapped = Math.floor((range.start + offset / toPx(1)) / slotMinutes) * slotMinutes
    const minutes = Math.min(Math.max(snapped, range.start), range.end - slotMinutes)
    setMenuTarget({
      specialistId,
      minutes: isPast || isTaken(specialistId, minutes) ? null : minutes,
    })
  }

  const contextItems = (() => {
    if (!menuTarget) return null
    if ('booking' in menuTarget) {
      const { booking } = menuTarget
      const digits = booking.customerPhone.replace(/\D/g, '')
      const isLive = booking.status === 'confirmed'
      const hasStarted = isPast || (nowMinutes !== null && parseClock(booking.time) <= nowMinutes)
      return (
        <>
          <MenuItem onClick={() => onSelectBooking(booking)}>Открыть запись</MenuItem>
          <MenuSeparator />
          <MenuItem onClick={() => window.open(`tel:+${digits}`, '_self')}>Позвонить</MenuItem>
          <MenuItem onClick={() => window.open(`https://wa.me/${digits}`, '_blank', 'noopener')}>
            Написать в WhatsApp
          </MenuItem>
          {isLive && hasStarted && (onMarkArrived || onMarkNoShow) && (
            <>
              <MenuSeparator />
              {onMarkArrived && booking.outcome !== 'arrived' && (
                <MenuItem onClick={() => onMarkArrived(booking)}>Пришёл</MenuItem>
              )}
              {onMarkNoShow && booking.outcome !== 'no_show' && (
                <MenuItem onClick={() => onMarkNoShow(booking)}>Не пришёл</MenuItem>
              )}
            </>
          )}
          {isLive && onCancelBooking && (
            <>
              <MenuSeparator />
              <MenuItem variant='danger' onClick={() => onCancelBooking(booking)}>
                Отменить запись
              </MenuItem>
            </>
          )}
        </>
      )
    }
    const specialist = specialists.find(({ id }) => id === menuTarget.specialistId)
    if (!specialist || isPast) return null
    const { minutes } = menuTarget
    return (
      <MenuItem
        onClick={() =>
          onCreateBooking(specialist.id, minutes === null ? null : formatClock(minutes))
        }
      >
        Новая запись{minutes === null ? '' : ` · ${formatClock(minutes)}`} ·{' '}
        {specialist.name.split(' ')[0]}
      </MenuItem>
    )
  })()

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

  // A master's visits as minute spans, to keep new bookings off taken time.
  const busyOf = (specialistId: string) =>
    bookings
      .filter((booking) => booking.specialistId === specialistId && booking.status === 'confirmed')
      .map((booking) => {
        const from = parseClock(booking.time)
        return { from, to: from + booking.durationMinutes }
      })
  // A master's visits off each side of the view, nearest to the view first.
  const edgeVisits = (specialistId: string) => {
    const visits = bookings
      .filter((booking) => booking.specialistId === specialistId && booking.status === 'confirmed')
      .map((booking) => {
        const start = parseClock(booking.time)
        return {
          booking,
          from: toPx(start - range.start),
          to: toPx(start + booking.durationMinutes - range.start),
        }
      })
    return {
      before: visits.filter(({ to }) => to < view.start).sort((a, b) => b.from - a.from),
      after: visits
        .filter(({ from }) => from > view.start + view.size)
        .sort((a, b) => a.from - b.from),
    }
  }
  const loadOf = (specialist: DayCalendarProps['specialists'][number]) => {
    const day = dayOf(specialist)
    return masterDayLoad(
      day,
      bookings.filter((booking) => booking.specialistId === specialist.id),
      isPast ? (day?.closesMinutes ?? null) : nowMinutes,
      slotMinutes,
    )
  }
  // One fact after the role that decides where the next client goes: busy now, or free from when.
  const laneFact = (specialist: DayCalendarProps['specialists'][number]) => {
    if (isPast || headNote(specialist)) return null
    if (nowMinutes !== null) {
      const current = bookings.find((booking) => {
        const start = parseClock(booking.time)
        return (
          booking.specialistId === specialist.id &&
          booking.status === 'confirmed' &&
          start <= nowMinutes &&
          start + booking.durationMinutes > nowMinutes
        )
      })
      if (current) {
        return `с клиентом до ${formatClock(parseClock(current.time) + current.durationMinutes)}`
      }
    }
    const { freeFrom } = loadOf(specialist)
    if (freeFrom === null) return 'занят до конца дня'
    if (nowMinutes !== null && freeFrom <= nowMinutes + slotMinutes) return 'свободен сейчас'
    return `свободен с ${formatClock(freeFrom)}`
  }
  const ringStyle = (specialist: DayCalendarProps['specialists'][number]) =>
    ({ '--load': `${Math.round(loadOf(specialist).share * 360)}deg` }) as CSSProperties
  // «Барбер · свободен с 15:00»: phones keep only the fact.
  const roleLine = (specialist: DayCalendarProps['specialists'][number]) => {
    const fact = laneFact(specialist)
    return (
      <span className={styles.laneRole}>
        <span className={styles.laneRoleName}>
          {headNote(specialist) ?? specialist.role}
          {fact && ' · '}
        </span>
        {fact && <span>{fact}</span>}
      </span>
    )
  }
  // A tab flush with the day's edge: the nearest visit beyond it and how many more. One visit —
  // a tap glides to it; several — the kit's pull-down menu lists who is there, nearest first.
  const edgeTab = (side: 'before' | 'after', visits: ReturnType<typeof edgeVisits>['before']) => {
    const [nearest] = visits
    if (!nearest) return null
    const more = visits.length - 1
    const Lead = isTimeline ? CaretLeft : CaretUp
    const Trail = isTimeline ? CaretRight : CaretDown
    const where = isTimeline
      ? side === 'before'
        ? 'раньше'
        : 'позже'
      : side === 'before'
        ? 'выше'
        : 'ниже'
    const count = `${visits.length} ${pluralWord(visits.length, ['запись', 'записи', 'записей'])} ${where}`
    const content = (
      <>
        {side === 'before' && <Lead weight='bold' aria-hidden />}
        <span className={styles.edgeTime}>{nearest.booking.time}</span>
        {more > 0 && <span className={styles.edgeMore}>+{more}</span>}
        {side === 'after' && <Trail weight='bold' aria-hidden />}
      </>
    )
    return (
      <span className={styles.edgeTab} data-side={side}>
        {more === 0 ? (
          <button
            type='button'
            className={styles.edgeHint}
            onClick={() => goToVisit(nearest.booking.id, nearest.from)}
          >
            {content}
            <span className={styles.srOnlyText}> — {count}</span>
          </button>
        ) : (
          <Menu
            label={`${nearest.booking.time} +${more} — ${count}`}
            className={styles.edgeHint}
            trigger={content}
          >
            <VisitMenuItems
              visits={visits.map(({ booking }) => booking)}
              onPick={(booking) =>
                goToVisit(
                  booking.id,
                  visits.find((visit) => visit.booking.id === booking.id)?.from ?? 0,
                )
              }
            />
          </Menu>
        )}
      </span>
    )
  }
  // How many visits sit off each side of the view, per lane — what the edge capsules show.
  useEffect(() => {
    edgeKeyRef.current = (left, width) =>
      specialists
        .map(({ id }) => {
          const visits = busyOf(id).map(({ from, to }) => ({
            from: toPx(from - range.start),
            to: toPx(to - range.start),
          }))
          const before = visits.filter(({ to }) => to < left).length
          const after = visits.filter(({ from }) => from > left + width).length
          return `${before}:${after}`
        })
        .join('|')
  })
  const isTaken = (specialistId: string, minutes: number) =>
    busyOf(specialistId).some(({ from, to }) => from < minutes + slotMinutes && to > minutes)
  // How far the free time runs from a slot, so the preview never reaches under the next visit.
  const freeUntil = (specialistId: string, minutes: number) =>
    Math.min(
      range.end,
      ...busyOf(specialistId)
        .filter(({ from }) => from >= minutes)
        .map(({ from }) => from),
    )

  const handleCreate = (event: MouseEvent<HTMLElement>, specialistId: string) => {
    // detail is 0 for a click from the keyboard: there is no pointer position to read.
    if (event.detail === 0) {
      onCreateBooking(specialistId, null)
      return
    }
    const minutes = minutesAt(event)
    // Taken time is not offered: a click there does nothing (the visit's card is the target).
    if (isTaken(specialistId, minutes)) return
    onCreateBooking(specialistId, formatClock(minutes))
  }

  return (
    <div className={styles.frame} ref={frameRef}>
      {isTimeline && specialists.length > 1 && (
        // Whose day to show, as one track of faces like the kit's segmented control: each face in a
        // ring of how full their day is; the chosen one opens into a white capsule with the name
        // and when they are free next — where a new client fits.
        <div className={styles.viewBar}>
          <fieldset className={styles.track}>
            <legend className={styles.trackLegend}>Мастера</legend>
            <button
              type='button'
              className={styles.trackAll}
              aria-pressed={focusId === null}
              onClick={() => setFocusId(null)}
            >
              Все
            </button>
            {specialists.map((specialist) => {
              const isChosen = focusId === specialist.id
              const day = dayOf(specialist)
              const load = masterDayLoad(
                day,
                bookings.filter((booking) => booking.specialistId === specialist.id),
                isPast ? (day?.closesMinutes ?? null) : nowMinutes,
                slotMinutes,
              )
              const note =
                day === null || specialist.isOnLeave
                  ? (headNote(specialist) ?? 'Выходной')
                  : load.share === 0 && !isPast
                    ? 'свободен весь день'
                    : `занят на ${Math.round(load.share * 100)}%${
                        isPast
                          ? ''
                          : load.freeFrom === null
                            ? ' · до конца дня'
                            : ` · свободен с ${formatClock(load.freeFrom)}`
                      }`
              return (
                <button
                  key={specialist.id}
                  type='button'
                  className={styles.trackMaster}
                  style={
                    {
                      '--tint': tintOf(specialist.id),
                      '--load': `${Math.round(load.share * 360)}deg`,
                    } as CSSProperties
                  }
                  aria-pressed={isChosen}
                  onClick={(event) => {
                    const button = event.currentTarget
                    setFocusId(isChosen ? null : specialist.id)
                    // Once its name has opened, keep the chosen face in the track's view.
                    window.setTimeout(
                      () => button.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
                      320,
                    )
                  }}
                >
                  <span className={styles.ring}>{face(specialist, styles.ringFace)}</span>
                  {/* Folded to nothing unless chosen; screen readers always read it. */}
                  <span className={styles.trackLabel}>
                    <span className={styles.trackLabelInner}>
                      <span className={styles.trackName}>{specialist.name.split(' ')[0]}</span>
                      <span className={styles.trackNote}>{note}</span>
                    </span>
                  </span>
                </button>
              )
            })}
          </fieldset>
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
        <ContextMenu menu={contextItems} disabled={!isFinePointer || !contextItems}>
          <div
            className={styles.grid}
            style={gridStyle}
            data-layout={layout}
            data-fit={fit ? '' : undefined}
            onContextMenuCapture={handleContextMenu}
          >
            <div className={styles.corner} style={cell(1, 1)} />
            {shown.map((specialist, index) => (
              <div
                key={specialist.id}
                className={styles.columnHead}
                data-column-head
                style={{ '--tint': tintOf(specialist.id), ...cell(index + 2, 1) } as CSSProperties}
              >
                <span className={styles.laneRing} style={ringStyle(specialist)}>
                  <PersonAvatar
                    name={specialist.name}
                    src={specialist.photoUrl ?? undefined}
                    size='sm'
                    className={styles.face}
                  />
                </span>
                <span className={styles.headText}>
                  <span className={styles.master}>{specialist.name}</span>
                  <span className={styles.role} data-off={dayOf(specialist) === null || undefined}>
                    {roleLine(specialist)}
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
                // A new day remounts the lanes, so their entrance plays again.
                key={`${dayKey ?? ''}:${specialist.id}`}
                className={styles.column}
                data-enter={shownDay.direction ?? 'first'}
                style={
                  {
                    ...daySize,
                    '--tint': tintOf(specialist.id),
                    '--enter-i': index,
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
                  // A mouse press must not focus the lane: the new-booking sheet gives focus back on
                  // close, and the whole lane then wore a focus ring.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => handleCreate(event, specialist.id)}
                  onPointerMove={(event) => {
                    if (event.pointerType !== 'mouse' || drag.dragged) return
                    const minutes = minutesAt(event)
                    if (isTaken(specialist.id, minutes)) {
                      if (hover) setHover(null)
                      return
                    }
                    if (hover?.specialistId !== specialist.id || hover.minutes !== minutes) {
                      setHover({ specialistId: specialist.id, minutes })
                    }
                  }}
                />
                {fit &&
                  !isPast &&
                  (fit.specialistIds === null || fit.specialistIds.includes(specialist.id)) &&
                  freeGaps({
                    day: dayOf(specialist),
                    bookings: bookings.filter((booking) => booking.specialistId === specialist.id),
                    timeOff: timeOff.filter((item) => item.specialistId === specialist.id),
                    from: nowMinutes,
                    slotMinutes,
                    minMinutes: fit.minutes,
                  }).map((gap) => (
                    <button
                      key={gap.from}
                      type='button'
                      className={styles.fitSlot}
                      data-layout={layout}
                      style={place(gap.from, gap.to)}
                      onClick={() => onCreateBooking(specialist.id, formatClock(gap.from))}
                    >
                      <Plus weight='bold' aria-hidden />
                      {formatClock(gap.from)}–{formatClock(gap.to)}
                      <span className={styles.srOnlyText}>
                        : записать к мастеру {specialist.name}
                      </span>
                    </button>
                  ))}
                {!drag.dragged && hover?.specialistId === specialist.id && (
                  <span
                    className={styles.ghost}
                    data-narrow={
                      (isTimeline &&
                        toPx(freeUntil(specialist.id, hover.minutes) - hover.minutes) < 130) ||
                      undefined
                    }
                    style={
                      isTimeline
                        ? ({
                            ...place(hover.minutes, hover.minutes + slotMinutes),
                            '--free': `${toPx(freeUntil(specialist.id, hover.minutes) - hover.minutes) - 4}px`,
                          } as CSSProperties)
                        : place(hover.minutes, hover.minutes + slotMinutes)
                    }
                    aria-hidden='true'
                  >
                    {/* A time cursor, not a card: a thin line in the master's colour where the
                        visit would start, and one small capsule «+ 14:00 · Эрлан» on it. */}
                    <span className={styles.ghostChip}>
                      <Plus weight='bold' aria-hidden />
                      {formatClock(hover.minutes)}
                      {isTimeline && (
                        <span className={styles.ghostChipWho}>
                          {face(specialist, styles.cardFace)}
                          {specialist.name.split(' ')[0]}
                        </span>
                      )}
                    </span>
                  </span>
                )}
                {view.size > 0 &&
                  (() => {
                    // A sticky band as big as the view: the browser keeps the tabs in place while
                    // the day scrolls, so they never lag. On the timeline only the right tab lives
                    // here (the left one leads the lane's first line); the columns hold both.
                    const { before, after } = edgeVisits(specialist.id)
                    if (after.length === 0 && (isTimeline || before.length === 0)) return null
                    return (
                      <span className={styles.edgeRail}>
                        <span className={styles.edgeBand}>
                          {!isTimeline && edgeTab('before', before)}
                          {edgeTab('after', after)}
                        </span>
                      </span>
                    )
                  })()}
                {/* Whose lane this is: its first line, above the cards, pinned left while the day scrolls. */}
                {isTimeline &&
                  bookings.some((booking) => booking.specialistId === specialist.id) && (
                    <span
                      className={styles.laneTag}
                      data-has-after={
                        (view.size > 0 && edgeVisits(specialist.id).after.length > 0) || undefined
                      }
                    >
                      {view.size > 0 && edgeTab('before', edgeVisits(specialist.id).before)}
                      <span className={styles.laneWho} aria-hidden='true'>
                        <span className={styles.laneRing} style={ringStyle(specialist)}>
                          {face(specialist, styles.cardFace)}
                        </span>
                        <span className={styles.laneName}>{specialist.name.split(' ')[0]}</span>
                        {roleLine(specialist)}
                      </span>
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

                    const box = place(from, to) as {
                      left?: number
                      width?: number
                      top?: number
                      height?: number
                    }
                    // One press marks an ended visit arrived, right on its card (shown on hover;
                    // always on touch screens) — the sheet stays for anything more.
                    const quickMark = state.tone === 'warning' &&
                      onMarkArrived &&
                      size !== 'compact' && (
                        <button
                          type='button'
                          className={styles.quickMark}
                          style={
                            isTimeline
                              ? { left: (box.left ?? 0) + (box.width ?? 0) - 10 }
                              : { top: (box.top ?? 0) + (box.height ?? 0) - 8, right: 12 }
                          }
                          data-layout={layout}
                          onClick={() => onMarkArrived(booking)}
                        >
                          <Check weight='bold' aria-hidden />
                          Пришёл
                          <span className={styles.srOnlyText}>: {booking.customerName}</span>
                        </button>
                      )
                    return (
                      <Fragment key={booking.id}>
                        <button
                          type='button'
                          className={styles.booking}
                          data-cancelled={booking.status === 'cancelled' || undefined}
                          data-outcome={booking.outcome ?? undefined}
                          data-tone={state.tone}
                          data-ended={
                            isPast || (nowMinutes !== null && to <= nowMinutes) || undefined
                          }
                          data-size={size}
                          data-narrow={(isTimeline && length < 190) || undefined}
                          data-booking-id={booking.id}
                          data-dragging={drag.dragged?.id === booking.id || undefined}
                          data-just-marked={marked.ids.includes(booking.id) || undefined}
                          style={
                            {
                              ...place(from, to),
                              ...(progress === null ? {} : { '--progress': `${progress}%` }),
                              '--mark-i': Math.max(0, marked.ids.indexOf(booking.id)),
                            } as CSSProperties
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
                                <span className={styles.stateGlyph} data-tone={state.tone}>
                                  <StateGlyph tone={state.tone} />
                                </span>
                              )}
                              <span className={styles.blockTitle}>{booking.customerName}</span>
                              <span className={styles.blockTime}>{booking.time}</span>
                            </span>
                          ) : (
                            // The time and the state on one quiet line, like an event in Calendar.
                            <span className={styles.blockTop}>
                              <span className={styles.blockRange}>
                                {booking.time}
                                <span className={styles.rangeEnd}>–{end}</span>
                              </span>
                              <span className={styles.blockState} data-tone={state.tone}>
                                <StateGlyph tone={state.tone} />
                                {state.label}
                              </span>
                            </span>
                          )}
                          {size !== 'compact' && (
                            <span className={styles.blockTitle}>{booking.customerName}</span>
                          )}
                          <span className={styles.blockService}>
                            {booking.serviceName}
                            {size !== 'compact' &&
                              (progress !== null && nowMinutes !== null
                                ? ` · ещё ${to - nowMinutes} мин`
                                : ` · ${formatPrice(paid)}`)}
                          </span>
                          {/* The visit under way: how much of it has passed, as a thin bar. */}
                          {progress !== null && size !== 'compact' && (
                            <span className={styles.progressTrack} aria-hidden>
                              <span className={styles.progressFill} />
                            </span>
                          )}
                          {/* Across, a card is as tall as its lane: room for the phone or the comment. */}
                          {(size === 'tall' || (isTimeline && size === 'normal')) && (
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
                        {quickMark}
                      </Fragment>
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
                {/* What has passed, a shade darker: today up to now, a past day whole. */}
                {(isPast || (showNow && nowMinutes !== null)) && (
                  <span
                    className={styles.past}
                    style={
                      isTimeline
                        ? {
                            width: isPast
                              ? '100%'
                              : toPx((nowMinutes ?? range.start) - range.start),
                          }
                        : {
                            height: isPast
                              ? '100%'
                              : toPx((nowMinutes ?? range.start) - range.start),
                          }
                    }
                    aria-hidden='true'
                  />
                )}
              </section>
            ))}
          </div>
        </ContextMenu>
      </div>
    </div>
  )
}
