'use client'

import { type PointerEvent, useRef } from 'react'

const CLOSE_DISTANCE = 120
// Where a released sheet would coast to with UIScrollView's normal deceleration rate.
const DECELERATION = 0.998
// Critically damped: settles without bouncing back past its rest position.
const SETTLE = 'translate 320ms cubic-bezier(0.22, 1, 0.36, 1)'

type Drag = {
  startY: number
  lastY: number
  lastTime: number
  velocity: number
  popup: HTMLElement
}

// Pulling up past the top meets growing resistance, like iOS edges, instead of a hard stop.
const rubberBand = (offset: number, dimension: number) =>
  (1 - 1 / ((offset * 0.55) / dimension + 1)) * dimension

const projectedDistance = (distance: number, velocity: number) =>
  distance + (velocity * DECELERATION) / (1 - DECELERATION)

// Pull a sheet down by its top bar to dismiss it, like an iOS sheet. The decision uses where the
// gesture is heading (momentum), not only where the finger stopped; a short pull settles back.
export const useSheetDrag = (onClose: () => void) => {
  const drag = useRef<Drag | null>(null)

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button, a, input')) return
    const popup = event.currentTarget.closest<HTMLElement>('[role="dialog"]')
    if (!popup) return
    drag.current = {
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      popup,
    }
    popup.style.transition = 'none'
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current
    if (!current) return
    const raw = event.clientY - current.startY
    const elapsed = Math.max(1, event.timeStamp - current.lastTime)
    current.velocity = (event.clientY - current.lastY) / elapsed
    current.lastY = event.clientY
    current.lastTime = event.timeStamp
    const offset = raw >= 0 ? raw : -rubberBand(-raw, current.popup.offsetHeight)
    current.popup.style.translate = `0 ${offset}px`
  }

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current
    if (!current) return
    drag.current = null
    const distance = Math.max(0, event.clientY - current.startY)
    const { popup, velocity } = current
    const height = popup.offsetHeight
    if (distance > CLOSE_DISTANCE || projectedDistance(distance, velocity) > height / 2) {
      // Leave at the finger's speed so the hand-off from gesture to animation is seamless.
      const duration = Math.min(320, Math.max(160, (height - distance) / Math.max(velocity, 1.2)))
      popup.style.transition = `translate ${Math.round(duration)}ms cubic-bezier(0.25, 0.8, 0.5, 1)`
      popup.style.translate = '0 100%'
      window.setTimeout(onClose, duration - 20)
      return
    }
    popup.style.transition = SETTLE
    popup.style.translate = ''
    window.setTimeout(() => {
      popup.style.transition = ''
    }, 340)
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
}
