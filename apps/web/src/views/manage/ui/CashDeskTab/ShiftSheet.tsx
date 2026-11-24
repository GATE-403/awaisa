'use client'

import { Input } from '@awaisa/ui/Input'
import { type FormEvent, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import type { CashShift } from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './CashDeskTab.module.css'

type ShiftSheetMode = 'open' | 'move' | 'close'

interface ShiftSheetProps {
  mode: ShiftSheetMode
  shift: CashShift | null
  branchName?: string
  onClose: () => void
  onOpen: (openingCash: number) => Promise<boolean>
  onMove: (kind: 'in' | 'out', amount: number, reason: string) => Promise<boolean>
  onCloseShift: (countedCash: number, note: string | null) => Promise<boolean>
}

const FORM_ID = 'shift-form'

const MOVES: { value: 'in' | 'out'; label: string }[] = [
  { value: 'in', label: 'Put in' },
  { value: 'out', label: 'Take out' },
]

const TITLES: Record<ShiftSheetMode, string> = {
  open: 'Open shift',
  move: 'Cash in the till',
  close: 'Close shift',
}

const ACTIONS: Record<ShiftSheetMode, string> = {
  open: 'Open',
  move: 'Record',
  close: 'Close',
}

const toAmount = (value: string) => Number(value.replace(/\D/g, '') || 0)

// What the difference at closing means, in words: a shortage, a surplus or a match.
const describeDifference = (difference: number, t: Translate) => {
  if (difference === 0) return { text: t('Matches what was expected.'), tone: undefined }
  const amount = formatPrice(Math.abs(difference))
  return difference < 0
    ? { text: t('Short by {amount}.', { amount }), tone: 'danger' as const }
    : { text: t('Over by {amount}.', { amount }), tone: 'success' as const }
}

// One sheet for the till: open a shift with the counted cash, put cash in or take it out with
// a reason, close it with the counted cash against what is expected.
export const ShiftSheet = ({
  mode,
  shift,
  branchName,
  onClose,
  onOpen,
  onMove,
  onCloseShift,
}: ShiftSheetProps) => {
  const t = useT()
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<'in' | 'out'>('out')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const value = toAmount(amount)
  const isValid = mode === 'move' ? value > 0 && reason.trim() !== '' : amount !== ''
  const difference = shift && amount !== '' ? value - shift.expectedCash : null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    setIsSaving(true)
    const isDone =
      mode === 'open'
        ? await onOpen(value)
        : mode === 'move'
          ? await onMove(kind, value, reason.trim())
          : await onCloseShift(value, note.trim() || null)
    setIsSaving(false)
    if (isDone) onClose()
  }

  // The shift's cash, line by line, so a difference can be traced; zero lines are left out.
  const summary = shift
    ? [
        { label: 'At shift start', amount: shift.openingCash, isShown: true },
        { label: 'Cash for visits', amount: shift.visitsCash, isShown: shift.visitsCash > 0 },
        { label: 'Cash for products', amount: shift.salesCash, isShown: shift.salesCash > 0 },
        { label: 'Put in', amount: shift.cashIn, isShown: shift.cashIn > 0 },
        { label: 'Taken out', amount: -shift.cashOut, isShown: shift.cashOut > 0 },
      ].filter((line) => line.isShown)
    : []

  return (
    <Sheet
      title={t(TITLES[mode])}
      onClose={onClose}
      action={{ label: t(ACTIONS[mode]), form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        {mode === 'move' && (
          <div className={styles.segment}>
            <SegmentedControl
              label={t('Action')}
              value={kind}
              items={MOVES.map((move) => ({ ...move, label: t(move.label) }))}
              onChange={setKind}
            />
          </div>
        )}

        {mode === 'close' && shift && (
          <section className={sheet.group} aria-label={t('Expected')}>
            <div className={sheet.list}>
              {summary.map((line) => (
                <div key={line.label} className={sheet.row}>
                  <span className={sheet.rowLabel}>{t(line.label)}</span>
                  <span className={styles.value}>
                    {line.amount < 0 ? '−' : ''}
                    {formatPrice(Math.abs(line.amount))}
                  </span>
                </div>
              ))}
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Should be in the till')}</span>
                <span className={styles.value} data-strong>
                  {formatPrice(shift.expectedCash)}
                </span>
              </div>
            </div>
          </section>
        )}

        <section className={sheet.group} aria-label={t('Amount')}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>
                {t(mode === 'move' ? 'Amount' : mode === 'open' ? 'In the till now' : 'Counted')}
              </span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t(mode === 'close' ? 'Cash counted, som' : 'Amount, som')}
                  inputMode='numeric'
                  placeholder='0'
                  autoFocus
                  value={maskAmountInput(amount.replace(/\D/g, ''))}
                  onValueChange={setAmount}
                />
                <span className={sheet.suffix}>{t('som')}</span>
              </span>
            </label>
            {mode === 'move' && (
              <div className={`${sheet.row} ${sheet.textRow}`}>
                <Input
                  variant='plain'
                  aria-label={t('Reason')}
                  placeholder={t(
                    kind === 'out' ? 'For example, «Water and coffee»' : 'For example, «Change»',
                  )}
                  value={reason}
                  onValueChange={setReason}
                  maxLength={160}
                />
              </div>
            )}
            {mode === 'close' && (
              <div className={`${sheet.row} ${sheet.textRow}`}>
                <Input
                  variant='plain'
                  aria-label={t('Comment')}
                  placeholder={t('Comment, if needed')}
                  value={note}
                  onValueChange={setNote}
                  maxLength={240}
                />
              </div>
            )}
          </div>
          <p
            className={`${sheet.groupFooter} ${styles.footer}`}
            data-tone={difference === null ? undefined : describeDifference(difference, t).tone}
          >
            {mode === 'open' &&
              (branchName
                ? t(
                    'Count the cash in the «{branch}» till: the balance is worked out from this amount.',
                    {
                      branch: branchName,
                    },
                  )
                : t('Count the cash: the balance is worked out from this amount.'))}
            {mode === 'move' &&
              (kind === 'out'
                ? t(
                    'Taking cash out lowers the expected balance. Record business costs in «Expenses».',
                  )
                : t('For example, change at the start of the day.'))}
            {mode === 'close' &&
              (difference === null
                ? t('Count the cash: we will show any difference.')
                : describeDifference(difference, t).text)}
          </p>
        </section>
      </form>
    </Sheet>
  )
}
