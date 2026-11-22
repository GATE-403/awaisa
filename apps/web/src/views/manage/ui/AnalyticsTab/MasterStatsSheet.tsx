'use client'

import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { useToast } from '@awaisa/ui/Toast'
import { useState } from 'react'
import { PersonAvatar } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import { addMasterPayout, removeMasterPayout } from '@/shared/api/clientApi'
import type { AnalyticsReport, MasterPayout } from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { DateField } from '@/shared/ui/DateField/DateField'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { describeRate } from '@/views/manage/lib/payText'
import styles from './AnalyticsTab.module.css'
import { analyticsFormat } from './analyticsFormat'
import { Filled } from './Filled'

interface MasterStatsSheetProps {
  master: AnalyticsReport['masters'][number]
  /** «к прошлой неделе», translated. */
  comparedLabel: string
  /** «Как на прошлой неделе», translated. */
  sameLabel: string
  slug: string
  /** The report's period: a payout marked here pays for it. */
  period: AnalyticsReport['period']
  /** A payout was marked or undone: the report is read again. */
  onPayoutsChange: () => void
  onClose: () => void
}

const visits = (t: Translate, count: number) => t.count(count, ['визит', 'визита', 'визитов'])
const workDays = (t: Translate, count: number) =>
  t.count(count, ['рабочий день', 'рабочих дня', 'рабочих дней'])
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
  const t = useT()
  const { formatDay, formatMoney } = analyticsFormat(t)
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
    toast.show({ title: t('Не получилось'), description: getErrorMessage(error), type: 'error' })

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
        title: t('Выплата отменена'),
        description: formatMoney(item.amount),
        action: { label: t('Вернуть'), onClick: () => void restore(item) },
      })
    } catch (error) {
      fail(error)
    }
  }

  // Marking a payout is reversible: no confirmation, «Вернуть» in the toast takes it back.
  const markPaid = async () => {
    if (!payout) {
      setPayout({ amount: maskAmountInput(String(pay?.due ?? '')), paidOn: period.to, note: '' })
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
        title: t('Выплата отмечена'),
        description: `${master.name} · ${formatMoney(amount)}`,
        type: 'success',
        action: {
          label: t('Вернуть'),
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
    <Sheet title={master.name} onClose={onClose} cancelLabel={t('Закрыть')}>
      <div className={sheet.form}>
        <div className={styles.masterHead}>
          <PersonAvatar name={master.name} size='lg' />
          <p className={styles.masterFacts}>
            <b>{visits(t, master.visits)}</b> · <b>{formatMoney(master.revenue)}</b> ·{' '}
            <Filled text={t('загрузка {load}')} parts={{ load: <b>{master.load}%</b> }} />
            {master.rating !== null && (
              <>
                {' '}
                · ★ <b>{master.rating.toFixed(1).replace('.', ',')}</b>
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

        <section className={sheet.group} aria-label={t('Показатели')}>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Возвращаются к мастеру')}</span>
              <span className={styles.sheetValue}>
                {master.retention === null ? t('мало данных') : `${master.retention}%`}
              </span>
            </div>
            {master.reviews > 0 && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Отзывы за период')}</span>
                <span className={styles.sheetValue}>{master.reviews}</span>
              </div>
            )}
          </div>
          <p className={sheet.groupFooter}>
            {t(
              'Возвращаются: клиенты, которые снова записались к этому мастеру в течение 6 недель.',
            )}
          </p>
        </section>

        {pay && (
          <section className={sheet.group} aria-labelledby='master-pay'>
            <SectionCaption id='master-pay'>{t('Зарплата за период')}</SectionCaption>
            <div className={sheet.list}>
              {pay.lines.map((line) => (
                <div key={line.serviceId} className={sheet.row}>
                  <span className={styles.payLabel}>
                    {line.name}
                    <span className={sheet.rowHint}>
                      {visits(t, line.visits)} · {describeRate(line, t)}
                    </span>
                  </span>
                  <span className={styles.sheetValue}>{formatMoney(line.amount)}</span>
                </div>
              ))}
              {pay.productsSold > 0 && (
                <div className={sheet.row}>
                  <span className={styles.payLabel}>
                    {t('Товары')}
                    <span className={sheet.rowHint}>
                      {t('продал на {amount}', { amount: formatMoney(pay.productsSold) })}
                      {pay.products === 0 && ` · ${t('без процента')}`}
                    </span>
                  </span>
                  <span className={styles.sheetValue}>{formatMoney(pay.products)}</span>
                </div>
              )}
              {pay.salaryKind && (
                <div className={sheet.row}>
                  <span className={styles.payLabel}>
                    {t('Оклад')}
                    <span className={sheet.rowHint}>
                      {pay.salaryKind === 'day' ? workDays(t, pay.workDays) : t('в месяц, по дням')}
                    </span>
                  </span>
                  <span className={styles.sheetValue}>{formatMoney(pay.salary)}</span>
                </div>
              )}
              {pay.minimum !== null && (
                <div className={sheet.row}>
                  <span className={sheet.rowLabel}>{t('Минимум за период')}</span>
                  <span className={styles.sheetValue}>{formatMoney(pay.minimum)}</span>
                </div>
              )}
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Начислено')}</span>
                <span className={styles.payTotal}>{formatMoney(pay.total)}</span>
              </div>
              {pay.paid > 0 && (
                <div className={sheet.row}>
                  <span className={sheet.rowLabel}>{t('Выплачено')}</span>
                  <span className={styles.sheetValue}>{formatMoney(pay.paid)}</span>
                </div>
              )}
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t('К выплате')}</span>
                <span className={styles.payTotal}>{formatMoney(pay.due)}</span>
              </div>
            </div>
            {pay.total > pay.earned && (
              <RowNote>
                {t('Заработано {amount}, меньше минимума: выплачивается минимум.', {
                  amount: formatMoney(pay.earned),
                })}
              </RowNote>
            )}
          </section>
        )}

        {pay && pay.payouts.length > 0 && (
          <section className={sheet.group} aria-labelledby='master-payouts'>
            <SectionCaption id='master-payouts'>{t('Выплаты')}</SectionCaption>
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
                    aria-label={t('Отменить выплату {amount}', {
                      amount: formatMoney(item.amount),
                    })}
                  >
                    {t('Отменить')}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {pay && payout && (
          <section className={sheet.group} aria-labelledby='master-payout'>
            <SectionCaption id='master-payout'>{t('Выплата')}</SectionCaption>
            <div className={sheet.list}>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Сумма')}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    inputMode='numeric'
                    aria-label={t('Сумма выплаты')}
                    value={payout.amount}
                    onValueChange={(value) =>
                      setPayout({ ...payout, amount: maskAmountInput(digits(value)) })
                    }
                    autoFocus
                  />
                  <span className={sheet.suffix}>{t('сом')}</span>
                </span>
              </label>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Дата')}</span>
                <DateField
                  label={t('Дата выплаты')}
                  value={payout.paidOn}
                  onChange={(paidOn) => setPayout({ ...payout, paidOn })}
                />
              </div>
              <div className={`${sheet.row} ${sheet.textRow}`}>
                <Input
                  variant='plain'
                  aria-label={t('Комментарий к выплате')}
                  placeholder={t('Комментарий, например «аванс»')}
                  value={payout.note}
                  maxLength={200}
                  onValueChange={(note) => setPayout({ ...payout, note })}
                />
              </div>
            </div>
            <p className={sheet.groupFooter}>
              {t('За период с {from} по {to}', {
                from: formatDay(period.from),
                to: formatDay(period.to),
              })}
            </p>
          </section>
        )}

        {master.topServices.length > 0 && (
          <section className={sheet.group} aria-labelledby='master-top-services'>
            <SectionCaption id='master-top-services'>{t('Чаще всего')}</SectionCaption>
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
              ? t('Выплатить {amount}', {
                  amount: t('{amount} сом', { amount: payout.amount || '0' }),
                })
              : t('Отметить выплату {amount}', { amount: formatMoney(pay.due) })}
          </Button>
        )}
      </div>
    </Sheet>
  )
}
