'use client'

import { Button } from '@awaisa/ui/Button'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { addDayKey } from '@/entities/booking'
import type { Format, Translate } from '@/shared/i18n'
import { useFormat } from '@/shared/i18n/useFormat'
import type { QuickSlot } from '@/views/booking/model/useQuickSlots'
import styles from './QuickSlots.module.css'

interface QuickSlotsProps {
  title: string
  /** What the times are for: "Men's haircut, any specialist". */
  subtitle: string
  slots: QuickSlot[]
  isLoading: boolean
  todayKey: string | null
  onPick: (slot: QuickSlot) => void
}

const PLACEHOLDERS = ['first', 'second', 'third']

const dayLabel = (dayKey: string, todayKey: string | null, t: Translate, format: Format) => {
  if (todayKey && dayKey === todayKey) return t(msg`Today`)
  if (todayKey && dayKey === addDayKey(todayKey, 1)) return t(msg`Tomorrow`)
  const weekday = format.weekdayLong(dayKey)
  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
}

// One tap books the nearest time: a quiet line and the kit's own capsules, nothing louder than
// the steps under it.
export const QuickSlots = ({
  title,
  subtitle,
  slots,
  isLoading,
  todayKey,
  onPick,
}: QuickSlotsProps) => {
  const { t } = useLingui()
  const format = useFormat()
  if (!isLoading && slots.length === 0) return null

  return (
    <section className={styles.quick} aria-labelledby='quick-slots-title'>
      <h2 id='quick-slots-title' className={styles.caption}>
        {title}
        <span className={styles.for}> · {subtitle}</span>
      </h2>
      <div className={styles.slots}>
        {isLoading
          ? PLACEHOLDERS.map((key) => <span key={key} className={styles.placeholder} aria-hidden />)
          : slots.map((slot) => (
              <Button
                key={`${slot.dayKey}|${slot.time}`}
                variant='secondary'
                className={styles.slot}
                onClick={() => onPick(slot)}
              >
                <span className={styles.day}>{dayLabel(slot.dayKey, todayKey, t, format)}</span>
                {slot.time}
              </Button>
            ))}
      </div>
    </section>
  )
}
