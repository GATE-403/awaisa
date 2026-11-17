'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { TimeSlot } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import styles from './TimeRuler.module.css'

interface TimeRulerProps {
  slots: TimeSlot[]
  time: string | null
  /** The visit's length, for «до 14:45» under the time. */
  durationMinutes: number
  onPick: (time: string) => void
  /** The day row, set under the dial (the time is what is asked for; the day tunes it). */
  days?: ReactNode
  /** The free time under the needle (null on a taken one): the booking bar offers to take it. */
  onCenter?: (time: string | null) => void
  /** Another day is loading: the dial stays, dimmed and still. */
  isPending?: boolean
}

// One tick per slot, as wide as a finger.
const TICK_WIDTH = 44

const toMinutes = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

// The day as a ruler, like a dial: free times stand tall, taken ones lie low, so the shape of the
// day — a busy morning, a free evening — reads before any number. Scrolling moves the day under
// the needle and the big time follows it; a tap on a free tick (or «Выбрать») takes that time.
export const TimeRuler = ({
  slots,
  time,
  durationMinutes,
  onPick,
  isPending = false,
  days,
  onCenter,
}: TimeRulerProps) => {
  const t = useT()
  const trackRef = useRef<HTMLFieldSetElement>(null)
  const hasShown = useRef(false)
  // Until the dial is touched, one line says how it works.
  const [hasMoved, setHasMoved] = useState(false)
  const firstFree = Math.max(
    0,
    slots.findIndex((slot) => slot.isAvailable),
  )
  const chosenIndex = time ? slots.findIndex((slot) => slot.time === time) : -1
  const [centered, setCentered] = useState(chosenIndex >= 0 ? chosenIndex : firstFree)
  const startIndex = chosenIndex >= 0 ? chosenIndex : firstFree
  const slotsKey = slots.map((slot) => slot.time).join()

  // A new day (or a time chosen before) opens with that time under the needle.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per day's slots
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    // The first day jumps into place; a next day glides there, so the step never blinks.
    if (hasShown.current) track.scrollTo({ left: startIndex * TICK_WIDTH, behavior: 'smooth' })
    else track.scrollLeft = startIndex * TICK_WIDTH
    hasShown.current = true
    setCentered(startIndex)
  }, [slotsKey])

  // A mouse wheel turns the ruler: it has no other sideways gesture.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      track.scrollLeft += event.deltaY
    }
    track.addEventListener('wheel', onWheel, { passive: false })
    return () => track.removeEventListener('wheel', onWheel)
  }, [])

  const handleScroll = () => {
    const track = trackRef.current
    if (!track) return
    const index = Math.round(track.scrollLeft / TICK_WIDTH)
    setCentered(Math.min(slots.length - 1, Math.max(0, index)))
  }

  const pick = (index: number) => {
    const slot = slots[index]
    if (!slot?.isAvailable) return
    trackRef.current?.scrollTo({ left: index * TICK_WIDTH, behavior: 'smooth' })
    onPick(slot.time)
  }

  const freeCount = slots.filter((slot) => slot.isAvailable).length
  const takenCount = slots.length - freeCount
  const current = slots[centered]
  const centeredTime = !isPending && current?.isAvailable ? current.time : null

  // The form (and its bar) hears of the time under the needle once the dial settles, not on every
  // tick it passes: each tick re-rendered the whole booking form mid-scroll.
  // biome-ignore lint/correctness/useExhaustiveDependencies: tell only when the time changes
  useEffect(() => {
    const timer = window.setTimeout(() => onCenter?.(centeredTime), 140)
    return () => window.clearTimeout(timer)
  }, [centeredTime])
  const isFree = Boolean(current?.isAvailable)

  return (
    <div className={styles.ruler} data-pending={isPending || undefined} aria-busy={isPending}>
      <div className={styles.readout} aria-hidden>
        <span className={styles.time} data-taken={isFree ? undefined : ''}>
          {current?.time ?? '—'}
        </span>
        <span className={styles.status}>
          {!current
            ? ''
            : isFree
              ? t('до {time} · свободно', {
                  time: toTime(toMinutes(current.time) + durationMinutes),
                })
              : t('Занято — прокрутите дальше')}
        </span>
      </div>

      <div className={styles.frame}>
        <fieldset
          ref={trackRef}
          className={styles.track}
          aria-label={t('Время')}
          onPointerDown={() => setHasMoved(true)}
          onWheel={() => setHasMoved(true)}
          onScroll={handleScroll}
        >
          {slots.map((slot, index) => (
            <button
              key={slot.time}
              type='button'
              className={styles.tick}
              data-free={slot.isAvailable || undefined}
              data-hour={slot.time.endsWith(':00') || undefined}
              data-centered={index === centered || undefined}
              aria-pressed={slot.time === time}
              disabled={!slot.isAvailable || isPending}
              onClick={() => pick(index)}
            >
              <span className={styles.label}>{slot.time}</span>
              <span className={styles.bar} aria-hidden />
            </button>
          ))}
        </fieldset>
        {/* A pointer over the dial, like a time picker's: the tick under it is the one offered. */}
        <span className={styles.needle} aria-hidden />
        <span className={styles.edge} data-side='left' aria-hidden>
          ‹
        </span>
        <span className={styles.edge} data-side='right' aria-hidden>
          ›
        </span>
      </div>

      {!hasMoved && <p className={styles.hint}>{t('Листайте шкалу или нажмите на время')}</p>}

      {/* The legend mirrors the ruler — a tall bar for free, a low one for taken — with counts. */}
      <p className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swatch} data-free='' aria-hidden />
          {t.count(freeCount, ['свободное окно', 'свободных окна', 'свободных окон'])}
        </span>
        {takenCount > 0 && (
          <span className={styles.legendItem}>
            <span className={styles.swatch} aria-hidden />
            {t('{count} занято', { count: takenCount })}
          </span>
        )}
      </p>

      {days}
    </div>
  )
}
