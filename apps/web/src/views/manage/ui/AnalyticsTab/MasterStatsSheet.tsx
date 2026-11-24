'use client'

import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { useToast } from '@awaisa/ui/Toast'
import { msg, ph, plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import { PersonAvatar } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import { addMasterPayout, removeMasterPayout } from '@/shared/api/clientApi'
import type { AnalyticsReport, MasterPayout } from '@/shared/api/types'
import { type Translate, useFormat } from '@/shared/i18n'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { DateField } from '@/shared/ui/DateField/DateField'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { describeRate } from '@/views/manage/lib/payText'
import styles from './AnalyticsTab.module.css'
import { analyticsFormat } from './analyticsFormat'

interface MasterStatsSheetProps {
  master: AnalyticsReport['masters'][number]
  /** "vs last week", translated. */
  comparedLabel: string
  /** "Same as last week", translated. */
  sameLabel: string
  slug: string
  /** The report's period: a payout marked here pays for it. */
  period: AnalyticsReport['period']
  /** A payout was marked or undone: the report is read again. */
  onPayoutsChange: () => void
  onClose: () => void
}

const visits = (t: Translate, count: number) =>
  t(msg`${plural(count, { one: '# visit', other: '# visits' })}`)
const workDays = (t: Translate, count: number) =>
  t(msg`${plural(count, { one: '# working day', other: '# working days' })}`)
const digits = (value: string) => value.replace(/\D/g, '')

// One master's period in the quiet profile style: the face, the name, one line of bold facts, how
// it moved against the period before, who comes back to them, what they do most, what they are
// owed; and their day in the schedule one tap away.
export const MasterStatsSheet = ({
  master,
  comparedLabel,
  sameLabel,
  slug,
  period,
  onPayoutsChange,
  onClose,
}: MasterStatsSheetProps) => {
  const toast = useToast()
  const { t } = useLingui()
  const format = useFormat()
  const { formatDay, formatMoney } = analyticsFormat(t, format)
  const pay = master.pay
  const [payout, setPayout] = useState<{ amount: string; paidOn: string; note: string } | null>(
    null,
  )
  const [isSaving, setIsSaving] = useState(false)
  const change =
    master.previousRevenue > 0
      ? Math.round(((master.revenue - master.previousRevenue) / master.previousRevenue) * 100)
      : null

  const fail = (error: unknown) =>
    toast.show({
      title: t`Something went wrong`,
      description: getErrorMessage(error),
      type: 'error',
    })

  const restore = async (removed: MasterPayout) => {
    try {
      await addMasterPayout(slug, {
        specialistId: removed.specialistId,
        amount: removed.amount,
        from: removed.from,
        to: removed.to,
        paidOn: removed.paidOn,
        note: removed.note,
      })
      onPayoutsChange()
    } catch (error) {
      fail(error)
    }
  }

  const undo = async (item: MasterPayout) => {
    try {
      await removeMasterPayout(slug, item.id)
      onPayoutsChange()
      toast.show({
        title: t`Payout cancelled`,
        description: formatMoney(item.amount),
        action: { label: t`Undo`, onClick: () => void restore(item) },
      })
    } catch (error) {
      fail(error)
    }
  }

  // Marking a payout is reversible: no confirmation, "Undo" in the toast takes it back.
  const markPaid = async () => {
    if (!payout) {
      setPayout({
        amount: maskAmountInput(String(pay?.due ?? ''), format.locale),
        paidOn: period.to,
        note: '',
      })
      return
    }
    const amount = Number(digits(payout.amount))
    if (!amount) return
    setIsSaving(true)
    try {
      const added = await addMasterPayout(slug, {
        specialistId: master.id,
        amount,
        from: period.from,
        to: period.to,
        paidOn: payout.paidOn || period.to,
        note: payout.note.trim(),
      })
      setPayout(null)
      onPayoutsChange()
      toast.show({
        title: t`Payout marked`,
        description: `${master.name} · ${formatMoney(amount)}`,
        type: 'success',
        action: {
          label: t`Undo`,
          onClick: () => void removeMasterPayout(slug, added.id).then(onPayoutsChange).catch(fail),
        },
      })
    } catch (error) {
      fail(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet title={master.name} onClose={onClose} cancelLabel={t`Close`}>
      <div className={sheet.form}>
        <div className={styles.masterHead}>
          <PersonAvatar name={master.name} size='lg' />
          <p className={styles.masterFacts}>
            <b>{visits(t, master.visits)}</b> · <b>{formatMoney(master.revenue)}</b> ·{' '}
            <Trans>
              load <b>{master.load}%</b>
            </Trans>
            {master.rating !== null && (
              <>
                {' '}
                · ★ <b>{format.rating(master.rating)}</b>
              </>
            )}
          </p>
          {change !== null && (
            <p className={styles.masterChange}>
              {change === 0
                ? sameLabel
                : `${change > 0 ? '+' : '−'}${Math.abs(change)}% ${comparedLabel}`}
            </p>
          )}
        </div>

        <section className={sheet.group} aria-label={t`Figures`}>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t`Come back to them`}</span>
              <span className={styles.sheetValue}>
                {master.retention === null ? t`too little data` : `${master.retention}%`}
              </span>
            </div>
            {master.reviews > 0 && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t`Reviews for the period`}</span>
                <span className={styles.sheetValue}>{master.reviews}</span>
              </div>
            )}
          </div>
          <p className={sheet.groupFooter}>
            {t`Come back: clients who booked this specialist again within 6 weeks.`}
          </p>
        </section>

        {pay && (
          <section className={sheet.group} aria-labelledby='master-pay'>
            <SectionCaption id='master-pay'>{t`Pay for the period`}</SectionCaption>
            <div className={sheet.list}>
              {pay.lines.map((line) => (
                <div key={line.serviceId} className={sheet.row}>
                  <span className={styles.payLabel}>
                    {line.name}
                    <span className={sheet.rowHint}>
                      {visits(t, line.visits)} · {describeRate(line, t, format)}
                    </span>
                  </span>
                  <span className={styles.sheetValue}>{formatMoney(line.amount)}</span>
                </div>
              ))}
              {pay.productsSold > 0 && (
                <div className={sheet.row}>
                  <span className={styles.payLabel}>
                    {t`Products`}
                    <span className={sheet.rowHint}>
                      {t`sold ${ph({ amount: formatMoney(pay.productsSold) })}`}
                      {pay.products === 0 && ` · ${t`no percent`}`}
                    </span>
                  </span>
                  <span className={styles.sheetValue}>{formatMoney(pay.products)}</span>
                </div>
              )}
              {pay.salaryKind && (
                <div className={sheet.row}>
                  <span className={styles.payLabel}>
                    {t`Salary`}
                    <span className={sheet.rowHint}>
                      {pay.salaryKind === 'day' ? workDays(t, pay.workDays) : t`per month, by day`}
                    </span>
                  </span>
                  <span className={styles.sheetValue}>{formatMoney(pay.salary)}</span>
                </div>
              )}
              {pay.minimum !== null && (
                <div className={sheet.row}>
                  <span className={sheet.rowLabel}>{t`Minimum for the period`}</span>
                  <span className={styles.sheetValue}>{formatMoney(pay.minimum)}</span>
                </div>
              )}
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t`Earned`}</span>
                <span className={styles.payTotal}>{formatMoney(pay.total)}</span>
              </div>
              {pay.paid > 0 && (
                <div className={sheet.row}>
                  <span className={sheet.rowLabel}>{t`Paid out`}</span>
                  <span className={styles.sheetValue}>{formatMoney(pay.paid)}</span>
                </div>
              )}
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t`Due`}</span>
                <span className={styles.payTotal}>{formatMoney(pay.due)}</span>
              </div>
            </div>
            {pay.total > pay.earned && (
              <RowNote>
                {t`Earned ${ph({ amount: formatMoney(pay.earned) })}, under the minimum: the minimum is paid.`}
              </RowNote>
            )}
          </section>
        )}

        {pay && pay.payouts.length > 0 && (
          <section className={sheet.group} aria-labelledby='master-payouts'>
            <SectionCaption id='master-payouts'>{t`Payouts`}</SectionCaption>
            <div className={sheet.list}>
              {pay.payouts.map((item) => (
                <div key={item.id} className={sheet.row}>
                  <span className={styles.payLabel}>
                    {formatMoney(item.amount)}
                    <span className={sheet.rowHint}>
                      {formatDay(item.paidOn)}
                      {item.note && ` · ${item.note}`}
                    </span>
                  </span>
                  <button
                    type='button'
                    className={sheet.groupLink}
                    onClick={() => void undo(item)}
                    aria-label={t`Cancel payout of ${ph({ amount: formatMoney(item.amount) })}`}
                  >
                    {t`Cancel`}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {pay && payout && (
          <section className={sheet.group} aria-labelledby='master-payout'>
            <SectionCaption id='master-payout'>{t`Payout`}</SectionCaption>
            <div className={sheet.list}>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t`Amount`}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    inputMode='numeric'
                    aria-label={t`Payout amount`}
                    value={payout.amount}
                    onValueChange={(value) =>
                      setPayout({
                        ...payout,
                        amount: maskAmountInput(digits(value), format.locale),
                      })
                    }
                    autoFocus
                  />
                  <span className={sheet.suffix}>{format.currency}</span>
                </span>
              </label>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t`Date`}</span>
                <DateField
                  label={t`Payout date`}
                  value={payout.paidOn}
                  onChange={(paidOn) => setPayout({ ...payout, paidOn })}
                />
              </div>
              <div className={`${sheet.row} ${sheet.textRow}`}>
                <Input
                  variant='plain'
                  aria-label={t`Payout comment`}
                  placeholder={t`Comment, e.g. “advance”`}
                  value={payout.note}
                  maxLength={200}
                  onValueChange={(note) => setPayout({ ...payout, note })}
                />
              </div>
            </div>
            <p className={sheet.groupFooter}>
              {t`For ${ph({ from: formatDay(period.from) })} to ${ph({ to: formatDay(period.to) })}`}
            </p>
          </section>
        )}

        {master.topServices.length > 0 && (
          <section className={sheet.group} aria-labelledby='master-top-services'>
            <SectionCaption id='master-top-services'>{t`Most often`}</SectionCaption>
            <div className={sheet.list}>
              {master.topServices.map((service) => (
                <div key={service.name} className={sheet.row}>
                  <span className={sheet.rowLabel}>{service.name}</span>
                  <span className={styles.sheetValue}>{visits(t, service.visits)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {pay && (pay.due > 0 || payout) && (
          // The sheet's one main action, last and as wide as the groups above it.
          <Button fullWidth onClick={() => void markPaid()} disabled={isSaving}>
            {payout
              ? t`Pay ${ph({ amount: format.price(Number(digits(payout.amount)) || 0) })}`
              : t`Mark payout of ${ph({ amount: formatMoney(pay.due) })}`}
          </Button>
        )}
      </div>
    </Sheet>
  )
}
