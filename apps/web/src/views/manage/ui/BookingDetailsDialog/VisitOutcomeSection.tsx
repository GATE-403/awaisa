'use client'

import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { getClientLoyalty, listVisitReceipts, listVisitSales } from '@/shared/api/clientApi'
import type {
  AdminBooking,
  ClientLoyalty,
  FiscalReceipt,
  OutcomeInput,
  PaymentMethod,
  Sale,
} from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { describeReceipt } from '@/views/manage/lib/cashFormat'
import { ReceiptSheet } from '@/views/manage/ui/ReceiptSheet/ReceiptSheet'
import styles from './BookingDetailsDialog.module.css'

interface VisitOutcomeSectionProps {
  slug: string
  booking: AdminBooking
  onChange: (input: OutcomeInput) => Promise<AdminBooking | null>
  /** In the inspector: no caption, the small segmented control. */
  isCompact?: boolean
  /** The segmented control's size (compact defaults to the small one). */
  controlSize?: 'sm' | 'md'
  /** "Products · Add": sell products with this visit (paid together with it). */
  onSellProducts?: () => void
}

type OutcomeChoice = 'pending' | 'arrived' | 'no_show'

const OUTCOMES: { value: OutcomeChoice; label: string }[] = [
  { value: 'pending', label: 'Waiting' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'no_show', label: 'No-show' },
]

const PAID_BY: Partial<Record<PaymentMethod, string>> = {
  subscription: 'Paid with a membership',
  certificate: 'Paid with a certificate',
}

// The receipt goes out right after the save; look again shortly while it is on its way.
const RECEIPT_RECHECK_MS = 2000
const RECEIPT_RECHECKS = 3

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'transfer', label: 'Transfer' },
]

// Staff close the visit in two taps: "Arrived" fills the price and cash; the amount and the way
// of paying can be corrected right there. Each change is saved at once.
export const VisitOutcomeSection = ({
  slug,
  booking,
  onChange,
  isCompact = false,
  controlSize = isCompact ? 'sm' : 'md',
  onSellProducts,
}: VisitOutcomeSectionProps) => {
  const t = useT()
  const [current, setCurrent] = useState(booking)
  const [loyalty, setLoyalty] = useState<ClientLoyalty | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [receipt, setReceipt] = useState<FiscalReceipt | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [certificateCode, setCertificateCode] = useState('')
  const [isCertificateOpen, setIsCertificateOpen] = useState(false)
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

  // The visit's fiscal receipt (the latest: a refund once the payment changed).
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload after each saved outcome
  useEffect(() => {
    if (!isArrived) return
    const controller = new AbortController()
    let timer = 0
    const load = async (checksLeft: number) => {
      const [latest] = await listVisitReceipts(slug, booking.id, controller.signal)
      setReceipt(latest ?? null)
      const isOnItsWay = latest?.status === 'pending' || latest?.status === 'sending'
      if (isOnItsWay && checksLeft > 0) {
        timer = window.setTimeout(
          () => void load(checksLeft - 1).catch(() => undefined),
          RECEIPT_RECHECK_MS,
        )
      }
    }
    load(RECEIPT_RECHECKS).catch(() => undefined)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [isArrived, current])

  // Products already sold with this visit.
  useEffect(() => {
    if (!isArrived || !onSellProducts) return
    const controller = new AbortController()
    listVisitSales(slug, booking.id, controller.signal)
      .then((items) => setSales(items.filter((sale) => !sale.isCancelled)))
      .catch(() => undefined)
    return () => controller.abort()
  }, [isArrived, onSellProducts, slug, booking.id])

  const outcomes = OUTCOMES.map((item) => ({ ...item, label: t(item.label) }))
  const methods = METHODS.map((item) => ({
    ...item,
    label: t(item.label),
  }))

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
    <section className={sheet.group} aria-label={t('Visit outcome')}>
      {!isCompact && <SectionCaption>{t('Visit outcome')}</SectionCaption>}
      {/* The control stands on its own, like a macOS segmented control in a form. */}
      <div className={styles.outcomeRow}>
        <SegmentedControl
          label={t('Visit outcome')}
          size={controlSize}
          value={choice}
          items={outcomes}
          onChange={(value) => void save({ outcome: value === 'pending' ? null : value })}
        />
      </div>
      {current.outcome === 'arrived' && (
        <div className={sheet.list}>
          {isPaidByLoyalty ? (
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>
                {t(PAID_BY[current.paymentMethod ?? 'cash'] ?? '')}
              </span>
            </div>
          ) : (
            <>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Paid, som')}</span>
                <Input
                  variant='plain'
                  inputMode='numeric'
                  aria-label={t('Paid, som')}
                  value={maskAmountInput(amount.replace(/\D/g, ''))}
                  onChange={(event) => setAmount(event.target.value)}
                  onBlur={handleAmountBlur}
                />
              </label>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Method')}</span>
                <Select
                  variant='plain'
                  aria-label={t('Payment method')}
                  items={methods}
                  value={current.paymentMethod ?? 'cash'}
                  onValueChange={(method) =>
                    method &&
                    void save({
                      outcome: 'arrived',
                      paidAmount: current.paidAmount,
                      paymentMethod: method,
                    })
                  }
                />
              </div>
              {receipt && (
                <button type='button' className={sheet.row} onClick={() => setIsReceiptOpen(true)}>
                  <span className={sheet.rowLabel}>{t('Receipt')}</span>
                  <span
                    className={
                      describeReceipt(receipt, t).isAlert ? styles.rowAlert : styles.rowLink
                    }
                  >
                    {receipt.status === 'issued'
                      ? receipt.kind === 'refund'
                        ? t('Refund №{number}', { number: receipt.fiscalNumber ?? '' })
                        : `№${receipt.fiscalNumber}`
                      : describeReceipt(receipt, t).text}{' '}
                    ›
                  </span>
                </button>
              )}
              {sales.flatMap((sale) =>
                sale.items.map((item) => (
                  <div key={`${sale.id}-${item.name}`} className={sheet.row}>
                    <span className={sheet.rowLabel}>
                      {item.quantity === 1 ? item.name : `${item.name} × ${item.quantity}`}
                    </span>
                    <span className={styles.rowValue}>
                      {formatPrice(item.quantity * item.price)}
                    </span>
                  </div>
                )),
              )}
              {onSellProducts && (
                <button type='button' className={sheet.row} onClick={onSellProducts}>
                  <span className={sheet.rowLabel}>{t('Products')}</span>
                  <span className={styles.rowLink}>{t('Add')} ›</span>
                </button>
              )}
              {/* A certificate is rare: a row that opens its field only when asked. */}
              {isCertificateOpen ? (
                <div className={sheet.row}>
                  <span className={sheet.rowControl}>
                    <Input
                      variant='plain'
                      aria-label={t('Certificate code')}
                      placeholder={t('Certificate code')}
                      autoFocus
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
                      }).then(() => {
                        setCertificateCode('')
                        setIsCertificateOpen(false)
                      })
                    }
                  >
                    {t('Apply')}
                  </Button>
                </div>
              ) : (
                <button
                  type='button'
                  className={sheet.row}
                  onClick={() => setIsCertificateOpen(true)}
                >
                  <span className={sheet.rowLabel}>{t('Certificate')}</span>
                  <span className={styles.rowLink}>{t('Enter code')} ›</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
      {current.outcome === 'arrived' &&
        loyalty &&
        !isPaidByLoyalty &&
        (subscriptions.length > 0 || loyalty.bonusBalance > 0) && (
          <section className={sheet.list} aria-label={t('Client loyalty')}>
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className={sheet.row}>
                <span className={sheet.rowLabel}>
                  {subscription.title} ·{' '}
                  {t('{count} left', {
                    count: t.count(subscription.visitsLeft, ['visit', 'visits']),
                  })}
                </span>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => void save({ outcome: 'arrived', subscriptionId: subscription.id })}
                >
                  {t('Use a visit')}
                </Button>
              </div>
            ))}
            {loyalty.bonusBalance > 0 && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>
                  {t('Bonuses · {amount}', { amount: formatPrice(loyalty.bonusBalance) })}
                </span>
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
                  {t('Use')}
                </Button>
              </div>
            )}
          </section>
        )}
      {current.outcome === 'arrived' && loyalty?.bonusPercent && !isPaidByLoyalty && (
        <p className={sheet.groupFooter}>
          {t('The client earns {percent}% of the money paid in bonuses.', {
            percent: loyalty.bonusPercent,
          })}
        </p>
      )}
      {isReceiptOpen && receipt && (
        <ReceiptSheet
          slug={slug}
          receipt={receipt}
          onClose={() => setIsReceiptOpen(false)}
          onChange={setReceipt}
        />
      )}
      {current.outcome === 'no_show' && (
        <p className={sheet.groupFooter}>
          {t('The no-show shows on the client card and in analytics.')}
        </p>
      )}
    </section>
  )
}
