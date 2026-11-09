import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { AdminBooking } from '@/common/api/types'
import { formatClock, parseClock } from '@/common/utils/workingHours'
import { type Range, toPx } from './calendarLayout'

type DragTarget = { specialistId: string; minutes: number }

type Pending = {
  booking: AdminBooking
  pointerId: number
  pointerType: string
  startX: number
  startY: number
  offsetMinutes: number
  isDragging: boolean
}

type UseBookingDragOptions = {
  scrollerRef: RefObject<HTMLDivElement | null>
  range: Range
  slotMinutes: number
  onMove: (booking: AdminBooking, specialistId: string, time: string) => void
}

const MOUSE_THRESHOLD_PX = 4
const TOUCH_SLOP_PX = 8
const LONG_PRESS_MS = 350

// Direct manipulation, like Calendar: a mouse drags at once, a finger after a long press
// (so a plain swipe still scrolls the day).
export const useBookingDrag = ({
  scrollerRef,
  range,
  slotMinutes,
  onMove,
}: UseBookingDragOptions) => {
  const pendingRef = useRef<Pending | null>(null)
  const suppressClickRef = useRef(false)
  const [dragged, setDragged] = useState<AdminBooking | null>(null)
  const [target, setTarget] = useState<DragTarget | null>(null)

  const findTarget = (x: number, y: number, offsetMinutes: number): DragTarget | null => {
    const column = document
      .elementsFromPoint(x, y)
      .find(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && Boolean(element.dataset.specialistId),
      )
    if (!column?.dataset.specialistId) return null

    const raw = range.start + (y - column.getBoundingClientRect().top) / toPx(1) - offsetMinutes
    const snapped = Math.round(raw / slotMinutes) * slotMinutes

    return {
      specialistId: column.dataset.specialistId,
      minutes: Math.min(Math.max(snapped, range.start), range.end - slotMinutes),
    }
  }

  const reset = () => {
    pendingRef.current = null
    setDragged(null)
    setTarget(null)
  }

  // Touch scrolling can only be stopped by a non-passive listener that exists before the gesture.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const blockScroll = (event: TouchEvent) => {
      if (pendingRef.current?.isDragging) event.preventDefault()
    }
    scroller.addEventListener('touchmove', blockScroll, { passive: false })

    return () => scroller.removeEventListener('touchmove', blockScroll)
  }, [scrollerRef])

  const startDrag = (pending: Pending) => {
    pending.isDragging = true
    setDragged(pending.booking)
    setTarget({
      specialistId: pending.booking.specialistId,
      minutes: parseClock(pending.booking.time),
    })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>, booking: AdminBooking) => {
    if (booking.status !== 'confirmed' || event.button !== 0) return

    const rect = event.currentTarget.getBoundingClientRect()
    const pending: Pending = {
      booking,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      offsetMinutes: (event.clientY - rect.top) / toPx(1),
      isDragging: false,
    }
    pendingRef.current = pending
    const timer =
      event.pointerType === 'mouse'
        ? null
        : window.setTimeout(() => {
            if (pendingRef.current === pending) startDrag(pending)
          }, LONG_PRESS_MS)

    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pending.pointerId) return
      const distance = Math.hypot(
        moveEvent.clientX - pending.startX,
        moveEvent.clientY - pending.startY,
      )
      if (!pending.isDragging) {
        if (pending.pointerType === 'mouse' && distance > MOUSE_THRESHOLD_PX) startDrag(pending)
        else if (pending.pointerType !== 'mouse' && distance > TOUCH_SLOP_PX) cleanup(true)
        return
      }
      const next = findTarget(moveEvent.clientX, moveEvent.clientY, pending.offsetMinutes)
      if (next) setTarget(next)
    }

    const handleUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pending.pointerId) return
      if (pending.isDragging) {
        suppressClickRef.current = true
        const drop = findTarget(upEvent.clientX, upEvent.clientY, pending.offsetMinutes)
        const time = drop ? formatClock(drop.minutes) : null
        if (drop && time && (drop.specialistId !== booking.specialistId || time !== booking.time)) {
          onMove(booking, drop.specialistId, time)
        }
      }
      cleanup(true)
    }

    const cleanup = (shouldReset: boolean) => {
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
      if (shouldReset) reset()
    }

    const handleCancel = () => cleanup(true)

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
  }

  // The click that ends a drag must not open the booking.
  const consumeClick = () => {
    if (!suppressClickRef.current) return false
    suppressClickRef.current = false
    return true
  }

  return { dragged, target, handlePointerDown, consumeClick }
}
