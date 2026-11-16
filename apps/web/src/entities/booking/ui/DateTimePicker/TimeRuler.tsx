'use client'

import { Button } from '@awaisa/ui/Button'
import { useEffect, useRef, useState } from 'react'
import type { TimeSlot } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import styles from './TimeRuler.module.css'

interface TimeRulerProps {
  slots: TimeSlot[]
  time: string | null
  /** The visit's length, for «до 14:45» under the time. */
  durationMinutes: number
  onPick: (time: string) => void
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
}: TimeRulerProps) => {
  const t = useT()
  const trackRef = useRef<HTMLFieldSetElement>(null)
  const hasShown = useRef(false)
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

  const moveTo = (index: number) =>
    trackRef.current?.scrollTo({ left: index * TICK_WIDTH, behavior: 'smooth' })

  const pick = (index: number) => {
    const slot = slots[index]
    if (!slot?.isAvailable) return
    trackRef.current?.scrollTo({ left: index * TICK_WIDTH, behavior: 'smooth' })
    onPick(slot.time)
  }

  const freeCount = slots.filter((slot) => slot.isAvailable).length
  const takenCount = slots.length - freeCount
  const current = slots[centered]
  const isFree = Boolean(current?.isAvailable)
  const nearestFree = slots.reduce(
    (best, slot, index) =>
      slot.isAvailable && (best < 0 || Math.abs(index - centered) < Math.abs(best - centered))
        ? index
        : best,
    -1,
  )

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
          onScroll={handleScroll}
        >
          {slots.map((slot, index) => (
            <button
              key={slot.time}
              type='button'
              className={styles.tick}
              data-free={slot.isAvailable || undefined}
              data-hour={slot.time.endsWith(':00') || undefined}
              aria-pressed={slot.time === time}
              disabled={!slot.isAvailable || isPending}
              onClick={() => pick(index)}
            >
              <span className={styles.label}>{slot.time}</span>
              <span className={styles.bar} aria-hidden />
            </button>
          ))}
        </fieldset>
        <span className={styles.needle} aria-hidden />
      </div>

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

      {/* Never a dead button: on a taken time it leads to the nearest free one. */}
      <Button
        variant='outline'
        size='lg'
        fullWidth
        className={styles.pick}
        onClick={() => (isFree ? pick(centered) : moveTo(nearestFree))}
      >
        {isFree && current
          ? current.time === time
            ? t('Выбрано {time}', { time: current.time })
            : t('Выбрать {time}', { time: current.time })
          : t('Ближайшее свободное: {time}', { time: slots[nearestFree]?.time ?? '' })}
      </Button>
    </div>
  )
}
