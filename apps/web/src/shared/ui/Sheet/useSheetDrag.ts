'use client'

import { type PointerEvent as ReactPointerEvent, useEffect, useRef } from 'react'

const CLOSE_DISTANCE = 120
// Where a released sheet would coast to with UIScrollView's normal deceleration rate.
const DECELERATION = 0.998
// Critically damped: settles without bouncing back past its rest position.
const SETTLE = 'translate 320ms cubic-bezier(0.22, 1, 0.36, 1)'
// A finger moves a little in every tap: under this a press stays a tap on a link or button.
const SLOP = 6

type Drag = {
  startY: number
  lastY: number
  lastTime: number
  velocity: number
  popup: HTMLElement
  /** Became a drag (moved past the slop): from here the sheet follows the finger. */
  isDragging: boolean
}

// Pulling up past the top meets growing resistance, like iOS edges, instead of a hard stop.
const rubberBand = (offset: number, dimension: number) =>
  (1 - 1 / ((offset * 0.55) / dimension + 1)) * dimension

const projectedDistance = (distance: number, velocity: number) =>
  distance + (velocity * DECELERATION) / (1 - DECELERATION)

const swallowClick = (event: Event) => {
  event.preventDefault()
  event.stopPropagation()
}

// Pull a sheet down by its top bar to dismiss it, like an iOS sheet. The decision uses where the
// gesture is heading (momentum), not only where the finger stopped; a short pull settles back.
// The bar may be made of links and buttons (the booking sheet's): a press that does not move is
// still their tap, one that moves down becomes the drag and its click is swallowed. The moves are
// followed on the window, so a quick pull that leaves the bar at once is still caught.
// The sheet is the nearest dialog or `[data-sheet-drag]` element around the bar.
export const useSheetDrag = (onClose: () => void) => {
  const drag = useRef<Drag | null>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  })

  const move = (event: PointerEvent) => {
    const current = drag.current
    if (!current) return
    if (!current.isDragging) {
      if (Math.abs(event.clientY - current.startY) < SLOP) return
      current.isDragging = true
      current.popup.style.transition = 'none'
      // The press is no longer a tap: the link or button under it must not fire.
      window.addEventListener('click', swallowClick, { capture: true, once: true })
    }
    const raw = event.clientY - current.startY
    const elapsed = Math.max(1, event.timeStamp - current.lastTime)
    current.velocity = (event.clientY - current.lastY) / elapsed
    current.lastY = event.clientY
    current.lastTime = event.timeStamp
    const offset = raw >= 0 ? raw : -rubberBand(-raw, current.popup.offsetHeight)
    current.popup.style.translate = `0 ${offset}px`
  }

  const end = (event: PointerEvent) => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    const current = drag.current
    drag.current = null
    if (!current?.isDragging) return
    // A drag released off the link makes no click: the swallower must not eat the next real one.
    window.setTimeout(() => window.removeEventListener('click', swallowClick, { capture: true }), 0)
    const distance = Math.max(0, event.clientY - current.startY)
    const { popup, velocity } = current
    const height = popup.offsetHeight
    if (distance > CLOSE_DISTANCE || projectedDistance(distance, velocity) > height / 2) {
      // Leave at the finger's speed so the hand-off from gesture to animation is seamless.
      const duration = Math.min(320, Math.max(160, (height - distance) / Math.max(velocity, 1.2)))
      popup.style.transition = `translate ${Math.round(duration)}ms cubic-bezier(0.25, 0.8, 0.5, 1)`
      popup.style.translate = '0 100%'
      window.setTimeout(() => closeRef.current(), duration - 20)
      return
    }
    popup.style.transition = SETTLE
    popup.style.translate = ''
    window.setTimeout(() => {
      popup.style.transition = ''
    }, 340)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('input, textarea')) return
    const popup = event.currentTarget.closest<HTMLElement>('[role="dialog"], [data-sheet-drag]')
    if (!popup) return
    drag.current = {
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      popup,
      isDragging: false,
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  return { onPointerDown }
}
