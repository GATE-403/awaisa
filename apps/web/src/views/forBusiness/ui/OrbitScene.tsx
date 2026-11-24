'use client'

import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react'
import { useT } from '@/shared/i18n'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import styles from './OrbitScene.module.css'

const CHIPS = [
  { text: '10:30 · free', tone: 'free' },
  { text: '★ 4.9 · 128 reviews', tone: 'rating' },
  { text: 'New booking · Данияр', tone: 'accent' },
  { text: 'Reminder sent', tone: 'plain' },
  { text: 'Haircut · 900 som', tone: 'plain' },
  { text: 'Тимур · barber', tone: 'plain' },
  { text: 'Today from 15:00', tone: 'free' },
  { text: 'Pass in Wallet', tone: 'accent' },
]

const RAYS = 96
const EDGE_LAYERS = Array.from({ length: 10 }, (_, layer) => `edge-${layer}`)
const MAX_TILT = 14
const EASE = 0.08
const IDLE_SPEED = 0.12
const FRICTION = 0.95

const random = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

// Deterministic, so server and browser render the same rays.
const rays = Array.from({ length: RAYS }, (_, index) => {
  const angle = (index / RAYS) * Math.PI * 2
  const inner = 150 + random(index) * 20
  const outer = inner + 50 + random(index + 7) * 150
  const round = (value: number) => Math.round(value * 10) / 10

  return {
    x1: round(300 + Math.cos(angle) * inner),
    y1: round(300 + Math.sin(angle) * inner),
    x2: round(300 + Math.cos(angle) * outer),
    y2: round(300 + Math.sin(angle) * outer),
  }
})

// A small 3D scene with plain CSS transforms: the app icon as a thick glass tile, product chips
// orbiting around it. The pointer tilts the scene, dragging spins the orbit, a tap sends a pulse.
export const OrbitScene = () => {
  const t = useT()
  const sceneRef = useRef<HTMLDivElement>(null)
  const state = useRef({
    tiltX: 0,
    tiltY: 0,
    targetX: 0,
    targetY: 0,
    spin: 0,
    velocity: IDLE_SPEED,
  })
  const drag = useRef<{ x: number; last: number } | null>(null)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    let frame = 0
    let isVisible = true
    const tick = () => {
      if (!isVisible) {
        frame = 0
        return
      }
      const s = state.current
      s.tiltX += (s.targetX - s.tiltX) * EASE
      s.tiltY += (s.targetY - s.tiltY) * EASE
      if (!drag.current) {
        // Inertia after a drag, settling back to the idle spin.
        s.velocity = s.velocity * FRICTION + IDLE_SPEED * (1 - FRICTION)
      }
      s.spin = (s.spin + s.velocity) % 360
      scene.style.setProperty('--tilt-x', `${s.tiltX.toFixed(2)}deg`)
      scene.style.setProperty('--tilt-y', `${s.tiltY.toFixed(2)}deg`)
      scene.style.setProperty('--spin', `${s.spin.toFixed(2)}deg`)
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    // Off screen or in a background tab the scene stops, instead of restyling it 60 times a second.
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = Boolean(entry?.isIntersecting) && document.visibilityState === 'visible'
      if (isVisible && frame === 0) frame = window.requestAnimationFrame(tick)
    })
    observer.observe(scene)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [])

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    state.current.targetY = x * MAX_TILT * 2
    state.current.targetX = -y * MAX_TILT * 2
    event.currentTarget.style.setProperty('--glare-x', `${(x + 0.5) * 100}%`)
    event.currentTarget.style.setProperty('--glare-y', `${(y + 0.5) * 100}%`)
    if (drag.current) {
      const delta = event.clientX - drag.current.last
      drag.current.last = event.clientX
      state.current.velocity = delta * 0.35
    }
  }

  const reset = () => {
    state.current.targetX = 0
    state.current.targetY = 0
    drag.current = null
  }

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
      aria-hidden='true'
      onPointerMove={handleMove}
      onPointerLeave={reset}
      onPointerDown={(event) => {
        drag.current = { x: event.clientX, last: event.clientX }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerUp={(event) => {
        if (drag.current && Math.abs(event.clientX - drag.current.x) < 4)
          setPulse((value) => value + 1)
        drag.current = null
      }}
    >
      <div className={styles.stage}>
        <svg viewBox='0 0 600 600' className={styles.rays} aria-hidden='true'>
          {rays.map((ray) => (
            <line key={`${ray.x2}-${ray.y2}`} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} />
          ))}
        </svg>

        <div className={styles.orbit}>
          {CHIPS.map((chip, index) => (
            <span
              key={chip.text}
              className={styles.chip}
              data-tone={chip.tone}
              style={
                {
                  '--angle': `${(index / CHIPS.length) * 360}deg`,
                  '--lift': `${(index % 3) * 26 - 26}px`,
                } as CSSProperties
              }
            >
              {t(chip.text)}
            </span>
          ))}
        </div>

        <div className={styles.tile}>
          {EDGE_LAYERS.map((id, layer) => (
            <span
              key={id}
              className={styles.edge}
              style={{ '--depth': `${-layer * 2.4}px` } as CSSProperties}
            />
          ))}
          <span className={styles.face}>
            <Mascot className={styles.mascot} />
            <span className={styles.glare} />
          </span>
          <span key={pulse} className={styles.pulse} data-active={pulse > 0 || undefined} />
        </div>
      </div>
    </div>
  )
}
