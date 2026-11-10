'use client'

import { type PointerEvent, useRef } from 'react'

const CLOSE_DISTANCE = 120
const CLOSE_VELOCITY = 0.7
const SNAP_BACK = 'translate 260ms cubic-bezier(0.32, 1.12, 0.5, 1)'

type Drag = {
  startY: number
  lastY: number
  lastTime: number
  velocity: number
  popup: HTMLElement
}

// Pull a sheet down by its top bar to dismiss it, like an iOS sheet; a short pull springs back.
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
    const distance = Math.max(0, event.clientY - current.startY)
    const elapsed = Math.max(1, event.timeStamp - current.lastTime)
    current.velocity = (event.clientY - current.lastY) / elapsed
    current.lastY = event.clientY
    current.lastTime = event.timeStamp
    current.popup.style.translate = `0 ${distance}px`
  }

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current
    if (!current) return
    drag.current = null
    const distance = event.clientY - current.startY
    const { popup } = current
    if (distance > CLOSE_DISTANCE || current.velocity > CLOSE_VELOCITY) {
      popup.style.transition = 'translate 200ms ease-in'
      popup.style.translate = '0 100%'
      window.setTimeout(onClose, 180)
      return
    }
    popup.style.transition = SNAP_BACK
    popup.style.translate = ''
    window.setTimeout(() => {
      popup.style.transition = ''
    }, 280)
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
}
