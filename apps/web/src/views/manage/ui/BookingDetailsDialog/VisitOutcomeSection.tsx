'use client'

import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { getClientLoyalty } from '@/shared/api/clientApi'
import type { AdminBooking, ClientLoyalty, OutcomeInput, PaymentMethod } from '@/shared/api/types'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { pluralize } from '@/shared/lib/plural'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './BookingDetailsDialog.module.css'

interface VisitOutcomeSectionProps {
  slug: string
  booking: AdminBooking
  onChange: (input: OutcomeInput) => Promise<AdminBooking | null>
}

type OutcomeChoice = 'pending' | 'arrived' | 'no_show'

const OUTCOMES: { value: OutcomeChoice; label: string }[] = [
  { value: 'pending', label: 'Ждём' },
  { value: 'arrived', label: 'Пришёл' },
  { value: 'no_show', label: 'Не пришёл' },
]

const PAID_BY: Partial<Record<PaymentMethod, string>> = {
  subscription: 'Оплачено абонементом',
  certificate: 'Оплачено сертификатом',
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Карта' },
  { value: 'transfer', label: 'Перевод' },
]

// Staff close the visit in two taps: «Пришёл» fills the price and cash; the amount and the way
// of paying can be corrected right there. Each change is saved at once.
export const VisitOutcomeSection = ({ slug, booking, onChange }: VisitOutcomeSectionProps) => {
  const [current, setCurrent] = useState(booking)
  const [loyalty, setLoyalty] = useState<ClientLoyalty | null>(null)
  const [certificateCode, setCertificateCode] = useState('')
  const due = booking.price - (booking.discount?.amount ?? 0)
  const [amount, setAmount] = useState(String(booking.paidAmount ?? due))
  const choice: OutcomeChoice = current.outcome ?? 'pending'

  const isArrived = current.outcome === 'arrived'
  const subscriptions =
    loyalty?.subscriptions.filter(
      (item) => item.serviceId === null || item.serviceId === booking.serviceId,
    ) ?? []
  const isPaidByLoyalty =
    current.paymentMethod === 'subscription' || current.paymentMethod === 'certificate'

  // The client's bonuses and subscriptions, once the visit is marked arrived.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload after each saved outcome
  useEffect(() => {
    if (!isArrived) return
    const controller = new AbortController()
    getClientLoyalty(slug, booking.customerPhone, controller.signal)
      .then(setLoyalty)
      .catch(() => undefined)
    return () => controller.abort()
  }, [isArrived, current])

  const save = async (input: OutcomeInput) => {
    const updated = await onChange(input)
    if (!updated) return
    setCurrent(updated)
    setAmount(String(updated.paidAmount ?? updated.price - (updated.discount?.amount ?? 0)))
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
          {isPaidByLoyalty ? (
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{PAID_BY[current.paymentMethod ?? 'cash']}</span>
            </div>
          ) : (
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
          )}
        </div>
      )}
      {current.outcome === 'arrived' && loyalty && !isPaidByLoyalty && (
        <section className={sheet.list} aria-label='Лояльность клиента'>
          {subscriptions.map((subscription) => (
            <div key={subscription.id} className={sheet.row}>
              <span className={sheet.rowLabel}>
                {subscription.title} · осталось{' '}
                {pluralize(subscription.visitsLeft, ['визит', 'визита', 'визитов'])}
              </span>
              <Button
                size='sm'
                variant='outline'
                onClick={() => void save({ outcome: 'arrived', subscriptionId: subscription.id })}
              >
                Списать визит
              </Button>
            </div>
          ))}
          {loyalty.bonusBalance > 0 && (
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Бонусы · {formatPrice(loyalty.bonusBalance)}</span>
              <Button
                size='sm'
                variant='outline'
                onClick={() =>
                  void save({
                    outcome: 'arrived',
                    bonusAmount: Math.min(loyalty.bonusBalance, current.paidAmount ?? due),
                    paymentMethod: current.paymentMethod,
                  })
                }
              >
                Списать
              </Button>
            </div>
          )}
          <div className={sheet.row}>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                aria-label='Код сертификата'
                placeholder='Код сертификата'
                value={certificateCode}
                onValueChange={(value) =>
                  setCertificateCode(value.toUpperCase().replace(/\s/g, ''))
                }
              />
            </span>
            <Button
              size='sm'
              variant='outline'
              disabled={certificateCode.length < 4}
              onClick={() =>
                void save({
                  outcome: 'arrived',
                  certificateCode,
                  paymentMethod: current.paymentMethod,
                }).then(() => setCertificateCode(''))
              }
            >
              Применить
            </Button>
          </div>
        </section>
      )}
      {current.outcome === 'arrived' && loyalty?.bonusPercent && !isPaidByLoyalty && (
        <p className={sheet.groupFooter}>
          Клиенту начислится {loyalty.bonusPercent}% бонусами от оплаты деньгами.
        </p>
      )}
      {current.outcome === 'no_show' && (
        <p className={sheet.groupFooter}>Неявка видна в карточке клиента и в аналитике.</p>
      )}
    </section>
  )
}
