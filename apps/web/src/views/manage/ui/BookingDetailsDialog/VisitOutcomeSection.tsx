'use client'

import { Input } from '@awaisa/ui/Input'
import { useState } from 'react'
import type { AdminBooking, OutcomeInput, PaymentMethod } from '@/shared/api/types'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './BookingDetailsDialog.module.css'

interface VisitOutcomeSectionProps {
  booking: AdminBooking
  onChange: (input: OutcomeInput) => Promise<AdminBooking | null>
}

type OutcomeChoice = 'pending' | 'arrived' | 'no_show'

const OUTCOMES: { value: OutcomeChoice; label: string }[] = [
  { value: 'pending', label: 'Ждём' },
  { value: 'arrived', label: 'Пришёл' },
  { value: 'no_show', label: 'Не пришёл' },
]

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Карта' },
  { value: 'transfer', label: 'Перевод' },
]

// Staff close the visit in two taps: «Пришёл» fills the price and cash; the amount and the way
// of paying can be corrected right there. Each change is saved at once.
export const VisitOutcomeSection = ({ booking, onChange }: VisitOutcomeSectionProps) => {
  const [current, setCurrent] = useState(booking)
  const [amount, setAmount] = useState(String(booking.paidAmount ?? booking.price))
  const choice: OutcomeChoice = current.outcome ?? 'pending'

  const save = async (input: OutcomeInput) => {
    const updated = await onChange(input)
    if (!updated) return
    setCurrent(updated)
    setAmount(String(updated.paidAmount ?? updated.price))
  }

  const handleAmountBlur = () => {
    const paid = Number(amount.replace(/\D/g, '') || 0)
    if (paid === current.paidAmount) return
    void save({ outcome: 'arrived', paidAmount: paid, paymentMethod: current.paymentMethod })
  }

  return (
    <section className={sheet.group} aria-label='Итог визита'>
      <h3 className={sheet.groupTitle}>Итог визита</h3>
      {/* The control stands on its own, like a macOS segmented control in a form. */}
      <div className={styles.outcomeRow}>
        <SegmentedControl
          label='Итог визита'
          value={choice}
          items={OUTCOMES}
          onChange={(value) => void save({ outcome: value === 'pending' ? null : value })}
        />
      </div>
      {current.outcome === 'arrived' && (
        <div className={sheet.list}>
          <>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Оплачено, сом</span>
              <Input
                variant='plain'
                inputMode='numeric'
                aria-label='Оплачено, сом'
                value={maskAmountInput(amount.replace(/\D/g, ''))}
                onChange={(event) => setAmount(event.target.value)}
                onBlur={handleAmountBlur}
              />
            </label>
            <div className={styles.outcomeRow}>
              <SegmentedControl
                label='Способ оплаты'
                value={current.paymentMethod ?? 'cash'}
                items={METHODS}
                onChange={(method) =>
                  void save({
                    outcome: 'arrived',
                    paidAmount: current.paidAmount,
                    paymentMethod: method,
                  })
                }
              />
            </div>
          </>
        </div>
      )}
      {current.outcome === 'no_show' && (
        <p className={sheet.groupFooter}>Неявка видна в карточке клиента и в аналитике.</p>
      )}
    </section>
  )
}
