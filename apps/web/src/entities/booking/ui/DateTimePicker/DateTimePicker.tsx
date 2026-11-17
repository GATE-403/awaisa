'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { Toggle, ToggleGroup } from '@awaisa/ui/ToggleGroup'
import { type ReactNode, useEffect, useState } from 'react'
import type { TimeSlot } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { addDayKey, type BookingDay } from '../../lib/bookingUtils'
import styles from './DateTimePicker.module.css'
import { TimeRuler } from './TimeRuler'

interface DateTimePickerProps {
  days: BookingDay[]
  dayKey: string | null
  slots: TimeSlot[]
  time: string | null
  isSpecialistSelected: boolean
  isLoading: boolean
  error: string | null
  onRetry: () => void
  onDayChange: (dayKey: string) => void
  onTimeChange: (time: string) => void
  /** Offered on a full day, e.g. «Сообщить, когда освободится» (views pass features in). */
  fullDayAction?: ReactNode
  /** `ruler`: the whole day as a dial of free and taken times (the booking form); `grid`: free times as capsules. */
  view?: 'grid' | 'ruler'
  /** The ruler's free time under the needle, for an action outside the picker. */
  onCenteredTimeChange?: (time: string | null) => void
  /** The visit's length, shown by the ruler as «до 14:45». */
  durationMinutes?: number
}

const toSingleValue = (values: string[], onChange: (value: string) => void) => {
  const [value] = values
  if (value) onChange(value)
}

const SlotsSkeleton = () => (
  <div className={styles.slotsSkeleton} aria-hidden>
    {Array.from({ length: 12 }, (_, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders never reorder
      <Skeleton key={index} className={styles.slotSkeleton} />
    ))}
  </div>
)

// The ruler while the day loads: the big time, the dial's ticks and the button, in place —
// so the step keeps its shape instead of showing a grid of capsules that is not coming.
const RULER_TICKS = [18, 60, 60, 18, 60, 60, 60, 18, 60, 60, 18, 18, 60]

const RulerSkeleton = () => (
  <div className={styles.rulerSkeleton} aria-hidden>
    <Skeleton className={styles.rulerTime} />
    <Skeleton className={styles.rulerStatus} />
    <div className={styles.rulerTicks}>
      {RULER_TICKS.map((height, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders never reorder
        <Skeleton key={index} className={styles.rulerTick} style={{ height }} />
      ))}
    </div>
    <Skeleton className={styles.rulerButton} />
  </div>
)

export const DateTimePicker = ({
  days,
  dayKey,
  slots,
  time,
  isSpecialistSelected,
  isLoading,
  error,
  onRetry,
  onDayChange,
  onTimeChange,
  fullDayAction,
  view = 'grid',
  durationMinutes = 0,
  onCenteredTimeChange,
}: DateTimePickerProps) => {
  const t = useT()
  // Another day loading keeps the day before on the ruler (dimmed) until it arrives: swapping
  // the dial for a skeleton and back made the whole step jump.
  const [lastSlots, setLastSlots] = useState<TimeSlot[]>([])
  useEffect(() => {
    if (!isLoading && !error) setLastSlots(slots)
  }, [slots, isLoading, error])
  const rulerSlots = isLoading ? lastSlots : slots
  const isRulerShown =
    view === 'ruler' &&
    isSpecialistSelected &&
    !error &&
    rulerSlots.some((slot) => slot.isAvailable)
  const availableCount = slots.filter((slot) => slot.isAvailable).length
  // «Сегодня» and «Завтра» in place of the weekday: few remember today's date at a glance.
  const todayKey = days.find((day) => day.isToday)?.key ?? null
  const tomorrowKey = todayKey ? addDayKey(todayKey, 1) : null
  // With large text «Сегодня» no longer fits its card and lost the word to «Сего…»: once it
  // overflows, both say it short, like the weekdays beside them.
  const [isShortRelative, setIsShortRelative] = useState(false)
  const measureRelative = (node: HTMLElement | null) => {
    if (node && node.scrollWidth > node.clientWidth + 1) setIsShortRelative(true)
  }
  const relativeDay = (key: string) => {
    if (key === todayKey) return isShortRelative ? t('Сег.') : t('Сегодня')
    if (key === tomorrowKey) return isShortRelative ? t('Завт.') : t('Завтра')
    return null
  }
  const isRussian = t.language === 'ru'

  if (days.length === 0) return <Skeleton className={styles.skeleton} />

  const dayRow = (
    <ToggleGroup
      aria-label={t('День')}
      layout='scroll'
      className={styles.days}
      data-edge-fade=''
      value={dayKey ? [dayKey] : []}
      onValueChange={(values) => toSingleValue(values, onDayChange)}
    >
      {days.map((day) => (
        <Toggle
          key={day.key}
          value={day.key}
          size='card'
          disabled={day.isClosed}
          data-today={day.isToday || undefined}
        >
          <span
            className={styles.weekday}
            data-relative={relativeDay(day.key) ? '' : undefined}
            ref={relativeDay(day.key) ? measureRelative : undefined}
          >
            {relativeDay(day.key) ?? (isRussian ? day.weekday : t.weekdayShort(day.key))}
          </span>
          <span className={styles.dayNumber}>{day.dayOfMonth}</span>
          <span className={styles.month}>{isRussian ? day.month : t.monthShort(day.key)}</span>
          {/* The whole date is read after what the card shows, not instead of it: the name keeps
              the visible words, so voice control finds «Сегодня» (WCAG 2.5.3). */}
          <span className={styles.srOnly}>
            {`, ${
              day.isClosed
                ? t('{day}, выходной', { day: isRussian ? day.label : t.dayLong(day.key) })
                : isRussian
                  ? day.label
                  : t.dayLong(day.key)
            }`}
          </span>
        </Toggle>
      ))}
    </ToggleGroup>
  )

  return (
    <div className={styles.picker} data-view={view}>
      {view === 'grid' && dayRow}

      {!isSpecialistSelected && <p className={styles.hint}>{t('Сначала выберите мастера')}</p>}
      {isSpecialistSelected &&
        isLoading &&
        !isRulerShown &&
        (view === 'ruler' ? <RulerSkeleton /> : <SlotsSkeleton />)}
      {isSpecialistSelected && error && (
        <div className={styles.hint}>
          <p>{error}</p>
          <Button variant='link' size='sm' onClick={onRetry}>
            {t('Повторить')}
          </Button>
        </div>
      )}
      {isSpecialistSelected && !isLoading && !error && availableCount === 0 && (
        <div className={styles.full}>
          <p className={styles.hint}>
            {t('На этот день свободного времени нет — выберите другой')}
          </p>
          {fullDayAction}
        </div>
      )}
      {isRulerShown && (
        <TimeRuler
          slots={rulerSlots}
          isPending={isLoading}
          time={time}
          durationMinutes={durationMinutes}
          onPick={onTimeChange}
          onCenter={onCenteredTimeChange}
          days={dayRow}
        />
      )}
      {/* Without a dial (loading, a full day, an error) the days still sit under it. */}
      {view === 'ruler' && !isRulerShown && dayRow}
      {view === 'grid' && isSpecialistSelected && !isLoading && !error && availableCount > 0 && (
        // Only free times, under a line that says a time is still to be picked: a grid half
        // made of struck-out times read as «nothing to do here».
        <p className={styles.caption} aria-hidden>
          {time ? t('Выбрано {time}', { time }) : t('Выберите время')}
          <span className={styles.captionCount}>
            {t.count(availableCount, ['свободное', 'свободных', 'свободных'])}
          </span>
        </p>
      )}
      {view === 'grid' && isSpecialistSelected && !isLoading && !error && availableCount > 0 && (
        <ToggleGroup
          aria-label={t('Время')}
          layout='grid'
          className={styles.slots}
          value={time ? [time] : []}
          onValueChange={(values) => toSingleValue(values, onTimeChange)}
        >
          {slots
            .filter((slot) => slot.isAvailable)
            .map((slot) => (
              <Toggle key={slot.time} value={slot.time}>
                {slot.time}
              </Toggle>
            ))}
        </ToggleGroup>
      )}
    </div>
  )
}
