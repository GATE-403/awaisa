'use client'

import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useT } from '@/shared/i18n'
import { haptic } from '@/shared/lib/nativeBridge'
import styles from './CardStack.module.css'

interface StackCardProps {
  /** The step's id: the card keeps the step's `#step-<id>` so links and tests find it. */
  id: string
  /** The step's name, for screen readers (the card shows what was chosen). */
  title: string
  media: ReactNode
  primary: string
  secondary?: string
  trailing?: string
  /** The card's colour: dark for the service, the master's own, the accent for the time. */
  tone: string
}

interface CardStackProps {
  cards: StackCardProps[]
  onEdit?: (id: string) => void
  /** «Начать заново», offered under the open stack (a half-made booking is let go of here). */
  onStartOver?: () => void
}

// How far a sideways pull goes before it shuffles the stack.
const SWIPE_DISTANCE = 48
// How far a pull down spreads the folded stack fully; past a third of it, it stays fanned.
const PULL_DISTANCE = 140
const NUDGE_KEY = 'awaisa:stack-nudge:v1'

// Done steps become cards — torn-off parts of the ticket the booking turns into — and slide into a
// stack above the open question, the newest in front. A sideways swipe shuffles the folded stack
// (the front card goes to the back, the next one comes forward, like passes in Wallet); one tap
// fans it out so each card can be changed; a single card is changed straight away.
export const CardStack = ({ cards, onEdit, onStartOver }: CardStackProps) => {
  const t = useT()
  const [isFanned, setIsFanned] = useState(false)
  // How many times the folded stack was shuffled; the front card is the newest one moved by that.
  const [shift, setShift] = useState(0)
  // The first time a stack of two shows, its front card leans aside once: it can be swiped.
  const [isNudging, setIsNudging] = useState(false)
  // The finger's path lives outside React: written straight to CSS variables once a frame, so a
  // drag never re-renders the form (each re-render cost a dropped frame on phones).
  const gesture = useRef<{
    x: number
    y: number
    isSideways: boolean | null
    dx: number
    pull: number
  } | null>(null)
  const frame = useRef(0)
  const swallowClick = useRef(false)
  const stackRef = useRef<HTMLDivElement>(null)
  const count = cards.length
  const isOpen = isFanned || count === 1
  // Where each card lies in the folded stack: 0 at the back, count - 1 in front.
  const placeOf = (index: number) => (((index + shift) % count) + count) % count

  const canMove = !isOpen && count > 1
  useEffect(() => {
    if (!canMove) return
    try {
      if (window.sessionStorage.getItem(NUDGE_KEY)) return
      window.sessionStorage.setItem(NUDGE_KEY, '1')
    } catch {
      return
    }
    setIsNudging(true)
    const timer = window.setTimeout(() => setIsNudging(false), 1800)
    return () => window.clearTimeout(timer)
  }, [canMove])

  // A fanned stack folds back on a tap anywhere outside it, like a menu.
  useEffect(() => {
    if (!isFanned) return
    const fold = (event: globalThis.PointerEvent) => {
      if (stackRef.current?.contains(event.target as Node)) return
      setIsFanned(false)
      setShift(0)
    }
    document.addEventListener('pointerdown', fold)
    return () => document.removeEventListener('pointerdown', fold)
  }, [isFanned])

  if (count === 0) return null

  const paint = () => {
    frame.current = 0
    const stack = stackRef.current
    const state = gesture.current
    if (!stack) return
    const dx = state?.isSideways ? state.dx : 0
    const pull = state && state.isSideways === false ? state.pull : 0
    stack.style.setProperty('--stack-drag', `${dx}px`)
    stack.style.setProperty('--stack-tilt', `${dx / 40}deg`)
    stack.style.setProperty('--pull', `${pull}`)
    stack.toggleAttribute('data-dragging', dx !== 0 || pull > 0)
  }

  const schedulePaint = () => {
    if (!frame.current) frame.current = requestAnimationFrame(paint)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isOpen || count < 2) return
    gesture.current = { x: event.clientX, y: event.clientY, isSideways: null, dx: 0, pull: 0 }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (start.isSideways === null && Math.hypot(dx, dy) > 6) {
      start.isSideways = Math.abs(dx) > Math.abs(dy)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (start.isSideways) start.dx = dx
    else if (start.isSideways === false) start.pull = Math.min(1, Math.max(0, dy / PULL_DISTANCE))
    schedulePaint()
  }

  const handlePointerUp = () => {
    const start = gesture.current
    gesture.current = null
    schedulePaint()
    if (!start || start.isSideways === null) return
    swallowClick.current = true
    if (!start.isSideways) {
      if (start.pull > 0.33) {
        setIsFanned(true)
        haptic('selection')
      }
      return
    }
    if (Math.abs(start.dx) > SWIPE_DISTANCE) {
      setShift((current) => current + (start.dx < 0 ? 1 : -1))
      haptic('selection')
    }
  }

  return (
    <div
      ref={stackRef}
      className={styles.stack}
      data-fanned={isOpen || undefined}
      data-movable={canMove || undefined}
      data-nudge={isNudging || undefined}
      style={{ '--count': count } as CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClickCapture={(event) => {
        if (!swallowClick.current) return
        swallowClick.current = false
        event.stopPropagation()
        event.preventDefault()
      }}
    >
      {cards.map((card, index) => {
        const place = isOpen ? index : placeOf(index)
        const isFront = place === count - 1
        return (
          <section
            key={card.id}
            id={`step-${card.id}`}
            aria-labelledby={`step-${card.id}-title`}
            className={styles.card}
            data-back={!isOpen && !isFront ? '' : undefined}
            data-front={isFront || undefined}
            style={
              {
                '--i': place,
                '--depth': count - 1 - place,
                '--tone': card.tone,
              } as CSSProperties
            }
          >
            <h2 id={`step-${card.id}-title`} className={styles.srOnly}>
              {card.title}
            </h2>
            <span className={styles.media}>{card.media}</span>
            <span className={styles.text}>
              <span className={styles.primary}>{card.primary}</span>
              {card.secondary && <span className={styles.secondary}>{card.secondary}</span>}
            </span>
            {card.trailing && <span className={styles.trailing}>{card.trailing}</span>}
            <button
              type='button'
              className={styles.edit}
              tabIndex={isOpen ? undefined : -1}
              onClick={() => {
                setIsFanned(false)
                setShift(0)
                onEdit?.(card.id)
              }}
            >
              {t('Изменить')}
            </button>
          </section>
        )
      })}
      {canMove && (
        // Which card is in front, like a pager: the stack can be swiped and pulled.
        <span className={styles.dots} aria-hidden>
          {cards.map((card, index) => (
            <span
              key={card.id}
              className={styles.dot}
              data-current={placeOf(index) === count - 1 || undefined}
            />
          ))}
        </span>
      )}
      {!isOpen && (
        <button
          type='button'
          className={styles.reveal}
          aria-expanded={false}
          onClick={() => setIsFanned(true)}
        >
          <span className={styles.srOnly}>{t('Показать выбор')}</span>
        </button>
      )}
      {isOpen && (onStartOver || (isFanned && count > 1)) && (
        <div className={styles.foot}>
          {onStartOver && (
            <button
              type='button'
              className={styles.footAction}
              onClick={() => {
                setIsFanned(false)
                setShift(0)
                onStartOver()
              }}
            >
              {t('Начать заново')}
            </button>
          )}
          {isFanned && count > 1 && (
            <button
              type='button'
              className={styles.footAction}
              data-end=''
              onClick={() => {
                setIsFanned(false)
                setShift(0)
              }}
            >
              {t('Свернуть')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export type { StackCardProps }
