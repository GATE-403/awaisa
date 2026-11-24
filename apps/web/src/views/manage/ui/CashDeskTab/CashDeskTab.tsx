'use client'

import { Button } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { Select } from '@awaisa/ui/Select'
import { useToast } from '@awaisa/ui/Toast'
import { msg, ph, plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import {
  ArrowsDownUp,
  CaretRight,
  DotsThree,
  LockSimple,
  LockSimpleOpen,
  Plus,
} from '@phosphor-icons/react/ssr'
import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import {
  addCashMovement,
  cancelSale,
  closeCashShift,
  deleteExpense,
  getCashDesk,
  listExpenses,
  openCashShift,
  saveExpense,
} from '@/shared/api/clientApi'
import type {
  Business,
  CashDesk,
  CashShift,
  Catalog,
  Expense,
  ExpenseList,
  Sale,
} from '@/shared/api/types'
import {
  type Format,
  formatDate,
  type Locale,
  type Translate,
  useFormat,
  useLocale,
} from '@/shared/i18n'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useToday } from '@/shared/lib/hooks/useToday'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import {
  describeReceipt,
  expenseCategoryLabel,
  formatCount,
  METHOD_LABEL,
} from '@/views/manage/lib/cashFormat'
import { useCanSeeMoney } from '@/views/manage/model/useManageRole'
import forms from '@/views/manage/ui/manageForms.module.css'
import { ReceiptSheet } from '@/views/manage/ui/ReceiptSheet/ReceiptSheet'
import { SaleSheet } from '@/views/manage/ui/SaleSheet/SaleSheet'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import styles from './CashDeskTab.module.css'
import { ExpenseSheet } from './ExpenseSheet'
import { ShiftSheet } from './ShiftSheet'

interface CashDeskTabProps {
  slug: string
  business: Business
  catalog: Catalog
}

type CashView = 'shift' | 'sales' | 'expenses'

const EXPENSE_DAYS = 30
// A receipt goes to the provider right after the sale; the list looks again shortly while one
// made just now is still on its way (later retries are minutes apart, not worth watching).
const RECEIPT_RECHECK_MS = 2000
const RECEIPT_FRESH_MS = 30_000

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

const formatTime = (iso: string) => timeFormat.format(new Date(iso))
const formatDay = (iso: string, locale: Locale) =>
  formatDate(locale, iso, { day: 'numeric', month: 'short' })
const formatDateKey = (key: string, locale: Locale) => formatDay(`${key}T12:00:00+06:00`, locale)

const describeDifference = (difference: number | null, t: Translate, format: Format) => {
  if (difference === null || difference === 0) return { text: t(msg`balanced`), tone: undefined }
  return difference < 0
    ? {
        text: t(msg`short by ${ph({ amount: format.price(-difference) })}`),
        tone: 'danger' as const,
      }
    : {
        text: t(msg`over by ${ph({ amount: format.price(difference) })}`),
        tone: 'success' as const,
      }
}

// "Till": the day's money at the counter. Shifts of a branch's till (optional: without one
// visits and sales work as before), sales of products, and for the owner the expenses.
export const CashDeskTab = ({ slug, business, catalog }: CashDeskTabProps) => {
  const format = useFormat()
  const toast = useToast()
  const { t } = useLingui()
  const locale = useLocale()
  const isOwner = useCanSeeMoney()
  const today = useToday()
  const branches = business.branches.filter((branch) => branch.isActive !== false)
  const [desk, setDesk] = useState<CashDesk | null>(null)
  const [expenses, setExpenses] = useState<ExpenseList | null>(null)
  const [view, setView] = useState<CashView>('shift')
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')
  const [shiftSheet, setShiftSheet] = useState<'open' | 'move' | 'close' | null>(null)
  const [isSelling, setIsSelling] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | 'new' | null>(null)
  const [openReceipt, setOpenReceipt] = useState<Sale['receipt']>(null)
  const shift = desk?.open.find((item) => item.branchId === branchId) ?? null
  const branchName = branches.find((branch) => branch.id === branchId)?.name
  const closed = desk?.closed.filter((item) => item.branchId === branchId) ?? []
  const liveSales = desk?.sales.filter((sale) => !sale.isCancelled) ?? []
  const salesTotal = liveSales.reduce((sum, sale) => sum + sale.total, 0)

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      const next = await getCashDesk(slug, signal)
      setDesk(next)
    },
    [slug],
  )

  useEffect(() => {
    const isWaiting = desk?.sales.some(
      (sale) =>
        (sale.receipt?.status === 'pending' || sale.receipt?.status === 'sending') &&
        Date.now() - Date.parse(sale.receipt.createdAt) < RECEIPT_FRESH_MS,
    )
    if (!isWaiting) return
    const timer = window.setTimeout(() => void reload().catch(() => undefined), RECEIPT_RECHECK_MS)
    return () => window.clearTimeout(timer)
  }, [desk, reload])

  useEffect(() => {
    const controller = new AbortController()
    reload(controller.signal).catch(() => undefined)
    if (isOwner) {
      listExpenses(slug, EXPENSE_DAYS, controller.signal)
        .then(setExpenses)
        .catch(() => undefined)
    }
    return () => controller.abort()
  }, [slug, isOwner, reload])

  const run = async (action: () => Promise<unknown>, title: string, description?: string) => {
    try {
      await action()
      await reload()
      toast.show({ title, description, type: 'success' })
      return true
    } catch (error) {
      toast.show({ title: t`Not saved`, description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  const runExpense = async (action: () => Promise<unknown>, title: string) => {
    try {
      await action()
      setExpenses(await listExpenses(slug, EXPENSE_DAYS))
      toast.show({ title, type: 'success' })
      return true
    } catch (error) {
      toast.show({ title: t`Not saved`, description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  // Closing tells at once whether the counted cash matched what was expected.
  const handleCloseShift = async (open: CashShift, countedCash: number, note: string | null) => {
    try {
      const closedShift = await closeCashShift(slug, open.id, { countedCash, note })
      await reload()
      const difference = closedShift.difference ?? 0
      const amount = format.price(Math.abs(difference))
      toast.show({
        title: t`Shift closed`,
        description:
          difference === 0
            ? t`Cash balanced.`
            : difference < 0
              ? t`Short by ${amount}.`
              : t`Over by ${amount}.`,
        type: difference < 0 ? 'info' : 'success',
      })
      return true
    } catch (error) {
      toast.show({ title: t`Not saved`, description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  const handleCancelSale = (sale: Sale) =>
    void run(() => cancelSale(slug, sale.id), t`Sale cancelled`, t`The products are back in stock.`)

  if (!desk) return null

  const headline = shift ? (
    <>
      {t`Shift since ${ph({ time: formatTime(shift.openedAt) })} · in the till`}{' '}
      <strong>{format.price(shift.expectedCash)}</strong>
    </>
  ) : (
    t`No shift open`
  )

  const primary =
    view === 'expenses' ? (
      <Button size='sm' onClick={() => setEditingExpense('new')}>
        <Plus aria-hidden />
        {t`Expense`}
      </Button>
    ) : (
      <Button size='sm' onClick={() => setIsSelling(true)}>
        <Plus aria-hidden />
        {t`Sale`}
      </Button>
    )

  return (
    <section className={`${forms.section} ${styles.page}`} aria-label={t`Till`}>
      <SectionHeader
        title={t`Till`}
        description={headline}
        isFloatingOnPhone
        actions={
          <>
            <GlyphGroup label={t`Shift`}>
              {shift ? (
                <>
                  <GlyphButton
                    icon={<ArrowsDownUp aria-hidden />}
                    label={t`Put in or take out`}
                    onClick={() => setShiftSheet('move')}
                  />
                  <GlyphButton
                    icon={<LockSimple aria-hidden />}
                    label={t`Close shift`}
                    onClick={() => setShiftSheet('close')}
                  />
                </>
              ) : (
                <GlyphButton
                  icon={<LockSimpleOpen aria-hidden />}
                  label={t`Open shift`}
                  onClick={() => setShiftSheet('open')}
                />
              )}
            </GlyphGroup>
            {primary}
          </>
        }
      />

      <div className={styles.head}>
        <TextTabs
          label={t`Till sections`}
          items={[
            { label: t`Shift`, isActive: view === 'shift', onSelect: () => setView('shift') },
            {
              label: t`Sales`,
              count: liveSales.length || undefined,
              isActive: view === 'sales',
              onSelect: () => setView('sales'),
            },
            ...(isOwner
              ? [
                  {
                    label: t`Expenses`,
                    isActive: view === 'expenses',
                    onSelect: () => setView('expenses'),
                  },
                ]
              : []),
          ]}
        />
        {branches.length > 1 && view === 'shift' && (
          <Select
            variant='plain'
            aria-label={t`Branch`}
            items={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
            value={branchId}
            onValueChange={(value) => value && setBranchId(value)}
          />
        )}
      </div>

      {view === 'shift' &&
        (shift ? (
          <ShiftDetails shift={shift} />
        ) : (
          <EmptyState
            variant='inline'
            title={t`No shift open`}
            text={t`Open a shift and the till will work out how much cash there should be by evening. Without a shift, visits and sales work as usual.`}
            action={
              <Button variant='secondary' onClick={() => setShiftSheet('open')}>
                {t`Open shift`}
              </Button>
            }
          />
        ))}

      {view === 'shift' && closed.length > 0 && (
        <section className={forms.group} aria-label={t`Past shifts`}>
          <SectionCaption>{t`Past shifts`}</SectionCaption>
          <ul className={forms.list}>
            {closed.map((item) => {
              const difference = describeDifference(item.difference, t, format)
              return (
                <li key={item.id} className={`${forms.settingRow} ${styles.row}`}>
                  <span className={`${forms.rowBody} ${styles.grow}`}>
                    <span className={forms.rowTitle}>
                      {formatDay(item.openedAt, locale)}, {formatTime(item.openedAt)}-
                      {item.closedAt ? formatTime(item.closedAt) : ''}
                    </span>
                    <span className={forms.rowMeta}>
                      {format.price(item.openingCash)} → {format.price(item.countedCash ?? 0)}
                      {item.note ? ` · ${item.note}` : ''}
                    </span>
                  </span>
                  <span className={styles.amount} data-tone={difference.tone}>
                    {difference.text}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {view === 'sales' &&
        (desk.sales.length === 0 ? (
          <EmptyState
            variant='inline'
            title={t`No sales today`}
            text={
              desk.products.length > 0
                ? t`Sell a product on its own or add it to a visit in “Visit outcome”.`
                : t`Mark stock items “Sold to clients” to sell them here.`
            }
          />
        ) : (
          <section className={forms.group} aria-label={t`Sales today`}>
            <ul className={forms.list}>
              {desk.sales.map((sale) => (
                <li
                  key={sale.id}
                  className={`${forms.settingRow} ${styles.row}`}
                  data-cancelled={sale.isCancelled || undefined}
                >
                  <span className={styles.time}>{formatTime(sale.createdAt)}</span>
                  <span className={`${forms.rowBody} ${styles.grow}`}>
                    <span className={forms.rowTitle}>
                      {sale.items
                        .map((item) =>
                          item.quantity === 1
                            ? item.name
                            : `${item.name} × ${formatCount(format, item.quantity)}`,
                        )
                        .join(', ')}
                    </span>
                    <span className={forms.rowMeta}>
                      {[
                        sale.isCancelled ? t`cancelled` : t(METHOD_LABEL[sale.paymentMethod]),
                        sale.customerName ??
                          (sale.customerPhone ? formatPhone(sale.customerPhone) : null),
                        sale.sellerName ? t`sold by ${ph({ name: sale.sellerName })}` : null,
                        sale.bookingId ? t`with a visit` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      {sale.receipt && (
                        <>
                          {' · '}
                          <span
                            className={
                              describeReceipt(sale.receipt, t).isAlert ? styles.alert : undefined
                            }
                          >
                            {describeReceipt(sale.receipt, t).text}
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className={styles.amount} data-struck={sale.isCancelled || undefined}>
                    {format.price(sale.total)}
                  </span>
                  {sale.isCancelled && !sale.receipt ? (
                    <span className={styles.moreSpace} aria-hidden='true' />
                  ) : (
                    <Menu
                      label={t`Sale actions`}
                      className={styles.more}
                      trigger={<DotsThree aria-hidden />}
                    >
                      {sale.receipt && (
                        <MenuItem onClick={() => setOpenReceipt(sale.receipt)}>
                          {sale.receipt.kind === 'refund' ? t`Refund receipt` : t`Receipt`}
                        </MenuItem>
                      )}
                      {!sale.isCancelled && (
                        <MenuItem variant='danger' onClick={() => handleCancelSale(sale)}>
                          {t`Cancel sale`}
                        </MenuItem>
                      )}
                    </Menu>
                  )}
                </li>
              ))}
            </ul>
            <RowNote>
              {t`${plural(liveSales.length, { one: '# sale', other: '# sales' })} for ${ph({ amount: format.price(salesTotal) })}. Cancelling puts the products back in stock.`}
            </RowNote>
          </section>
        ))}

      {view === 'expenses' &&
        expenses &&
        (expenses.items.length === 0 ? (
          <EmptyState
            variant='inline'
            title={t`Add your first expense`}
            text={t`Rent, supplies, salaries, marketing: "Analytics" works out profit from these and revenue.`}
            action={<Button onClick={() => setEditingExpense('new')}>{t`Add expense`}</Button>}
          />
        ) : (
          <section className={forms.group} aria-label={t`Expenses`}>
            <ul className={forms.list}>
              {expenses.items.map((expense) => (
                <li key={expense.id}>
                  <button
                    type='button'
                    className={forms.serviceRow}
                    onClick={() => setEditingExpense(expense)}
                  >
                    <span className={`${forms.rowBody} ${styles.grow}`}>
                      <span className={forms.rowTitle}>
                        {expenseCategoryLabel(expense.category, t)}
                      </span>
                      <span className={forms.rowMeta}>
                        {[formatDateKey(expense.date, locale), expense.note]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span className={forms.cellValue}>{format.price(expense.amount)}</span>
                    <CaretRight className={forms.chevron} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <RowNote>
              {t`${ph({ amount: format.price(expenses.total) })} over ${ph({ days: EXPENSE_DAYS })} days. Profit by period is in "Analytics".`}
            </RowNote>
          </section>
        ))}

      {shiftSheet && (
        <ShiftSheet
          mode={shiftSheet}
          shift={shift}
          branchName={branches.length > 1 ? branchName : undefined}
          onClose={() => setShiftSheet(null)}
          onOpen={(openingCash) =>
            run(() => openCashShift(slug, { branchId, openingCash }), t`Shift opened`)
          }
          onMove={(kind, amount, reason) =>
            shift
              ? run(
                  () => addCashMovement(slug, shift.id, { kind, amount, reason }),
                  kind === 'in' ? t`Put in` : t`Taken out`,
                )
              : Promise.resolve(false)
          }
          onCloseShift={(countedCash, note) =>
            shift ? handleCloseShift(shift, countedCash, note) : Promise.resolve(false)
          }
        />
      )}

      {openReceipt && (
        <ReceiptSheet
          slug={slug}
          receipt={openReceipt}
          onClose={() => setOpenReceipt(null)}
          onChange={() => void reload()}
        />
      )}

      {isSelling && (
        <SaleSheet
          slug={slug}
          specialists={catalog.specialists}
          branches={branches}
          branchId={branchId}
          onClose={() => setIsSelling(false)}
          onChange={() => {
            setView('sales')
            void reload()
          }}
        />
      )}

      {editingExpense && today && (
        <ExpenseSheet
          key={editingExpense === 'new' ? 'new' : editingExpense.id}
          expense={editingExpense === 'new' ? null : editingExpense}
          customCategories={expenses?.categories ?? []}
          branches={branches}
          today={today.dayKey}
          onClose={() => setEditingExpense(null)}
          onSave={(input) =>
            runExpense(
              () =>
                saveExpense(slug, input, editingExpense === 'new' ? undefined : editingExpense.id),
              t`Expense recorded`,
            )
          }
          onDelete={
            editingExpense === 'new'
              ? undefined
              : () =>
                  void runExpense(() => deleteExpense(slug, editingExpense.id), t`Expense deleted`)
          }
        />
      )}
    </section>
  )
}

// The open shift line by line: what it started with, what came in and went out, what should be
// in the till now; then the cash moved, with why.
const ShiftDetails = ({ shift }: { shift: CashShift }) => {
  const format = useFormat()
  const { t } = useLingui()
  const lines = [
    { key: 'start', label: t`At shift start`, amount: shift.openingCash, isShown: true },
    {
      key: 'visits',
      label: t`Cash for visits`,
      amount: shift.visitsCash,
      isShown: shift.visitsCash > 0,
    },
    {
      key: 'products',
      label: t`Cash for products`,
      amount: shift.salesCash,
      isShown: shift.salesCash > 0,
    },
    { key: 'in', label: t`Put in`, amount: shift.cashIn, isShown: shift.cashIn > 0 },
    { key: 'out', label: t`Taken out`, amount: -shift.cashOut, isShown: shift.cashOut > 0 },
  ].filter((line) => line.isShown)

  return (
    <>
      <section className={forms.group} aria-label={t`Cash in the shift`}>
        <ul className={forms.list}>
          {lines.map((line) => (
            <li key={line.key} className={`${forms.settingRow} ${styles.row}`}>
              <span className={`${forms.rowTitle} ${styles.grow}`}>{line.label}</span>
              <span className={styles.amount}>
                {line.amount < 0 ? '−' : ''}
                {format.price(Math.abs(line.amount))}
              </span>
            </li>
          ))}
          <li className={`${forms.settingRow} ${styles.row}`}>
            <span className={`${forms.rowTitle} ${styles.grow}`}>{t`Should be in the till`}</span>
            <span className={styles.amount} data-strong>
              {format.price(shift.expectedCash)}
            </span>
          </li>
        </ul>
        <RowNote>
          {t`Cash for visits: visits marked “Arrived” during the shift at this branch.`}
        </RowNote>
      </section>
      {shift.movements.length > 0 && (
        <section className={forms.group} aria-label={t`Cash movements`}>
          <SectionCaption>{t`Cash in and out`}</SectionCaption>
          <ul className={forms.list}>
            {shift.movements.map((move) => (
              <li key={move.id} className={`${forms.settingRow} ${styles.row}`}>
                <span className={styles.time}>{formatTime(move.createdAt)}</span>
                <span className={`${forms.rowTitle} ${styles.grow}`}>{move.reason}</span>
                <span
                  className={styles.amount}
                  data-tone={move.kind === 'out' ? undefined : 'success'}
                >
                  {move.kind === 'out' ? '−' : '+'}
                  {format.price(move.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
