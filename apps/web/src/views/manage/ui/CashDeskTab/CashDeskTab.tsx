'use client'

import { Button } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { Select } from '@awaisa/ui/Select'
import { useToast } from '@awaisa/ui/Toast'
import {
  ArrowsDownUp,
  CaretRight,
  DotsThree,
  LockSimple,
  LockSimpleOpen,
  Plus,
} from '@phosphor-icons/react/ssr'
import { useCallback, useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
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
import { type Translate, useT } from '@/shared/i18n'
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

const timeFormat = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})
// Browsers have no Kyrgyz month names, so Kyrgyz keeps the Russian ones.
const dayFormats = {
  ru: new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: BUSINESS_TIME_ZONE,
  }),
  en: new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: BUSINESS_TIME_ZONE,
  }),
}

const formatTime = (iso: string) => timeFormat.format(new Date(iso))
const formatDay = (iso: string, t: Translate) =>
  dayFormats[t.language === 'en' ? 'en' : 'ru'].format(new Date(iso)).replace('.', '')
const formatDateKey = (key: string, t: Translate) => formatDay(`${key}T12:00:00+06:00`, t)

const describeDifference = (difference: number | null, t: Translate) => {
  if (difference === null || difference === 0) return { text: t('сошлось'), tone: undefined }
  return difference < 0
    ? {
        text: t('недостача {amount}', { amount: formatPrice(-difference) }),
        tone: 'danger' as const,
      }
    : { text: t('излишек {amount}', { amount: formatPrice(difference) }), tone: 'success' as const }
}

// «Касса»: the day's money at the counter. Shifts of a branch's till (optional: without one
// visits and sales work as before), sales of products, and for the owner the expenses.
export const CashDeskTab = ({ slug, business, catalog }: CashDeskTabProps) => {
  const toast = useToast()
  const t = useT()
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
      toast.show({ title: t('Не сохранилось'), description: getErrorMessage(error), type: 'error' })
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
      toast.show({ title: t('Не сохранилось'), description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  // Closing tells at once whether the counted cash matched what was expected.
  const handleCloseShift = async (open: CashShift, countedCash: number, note: string | null) => {
    try {
      const closedShift = await closeCashShift(slug, open.id, { countedCash, note })
      await reload()
      const difference = closedShift.difference ?? 0
      const amount = formatPrice(Math.abs(difference))
      toast.show({
        title: t('Смена закрыта'),
        description:
          difference === 0
            ? t('Наличные сошлись.')
            : t(difference < 0 ? 'Недостача {amount}.' : 'Излишек {amount}.', { amount }),
        type: difference < 0 ? 'info' : 'success',
      })
      return true
    } catch (error) {
      toast.show({ title: t('Не сохранилось'), description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  const handleCancelSale = (sale: Sale) =>
    void run(
      () => cancelSale(slug, sale.id),
      t('Продажа отменена'),
      t('Товары вернулись на склад.'),
    )

  if (!desk) return null

  const headline = shift ? (
    <>
      {t('Смена с {time} · в кассе', { time: formatTime(shift.openedAt) })}{' '}
      <strong>{formatPrice(shift.expectedCash)}</strong>
    </>
  ) : (
    t('Смена не открыта')
  )

  const primary =
    view === 'expenses' ? (
      <Button size='sm' onClick={() => setEditingExpense('new')}>
        <Plus weight='bold' aria-hidden />
        {t('Расход')}
      </Button>
    ) : (
      <Button size='sm' onClick={() => setIsSelling(true)}>
        <Plus weight='bold' aria-hidden />
        {t('Продажа')}
      </Button>
    )

  return (
    <section className={`${forms.section} ${styles.page}`} aria-label={t('Касса')}>
      <SectionHeader
        title={t('Касса')}
        description={headline}
        isFloatingOnPhone
        actions={
          <>
            <GlyphGroup label={t('Смена')}>
              {shift ? (
                <>
                  <GlyphButton
                    icon={<ArrowsDownUp aria-hidden />}
                    label={t('Внести или изъять')}
                    onClick={() => setShiftSheet('move')}
                  />
                  <GlyphButton
                    icon={<LockSimple aria-hidden />}
                    label={t('Закрыть смену')}
                    onClick={() => setShiftSheet('close')}
                  />
                </>
              ) : (
                <GlyphButton
                  icon={<LockSimpleOpen aria-hidden />}
                  label={t('Открыть смену')}
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
          label={t('Разделы кассы')}
          items={[
            { label: t('Смена'), isActive: view === 'shift', onSelect: () => setView('shift') },
            {
              label: t('Продажи'),
              count: liveSales.length || undefined,
              isActive: view === 'sales',
              onSelect: () => setView('sales'),
            },
            ...(isOwner
              ? [
                  {
                    label: t('Расходы'),
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
            aria-label={t('Филиал')}
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
            title={t('Смена не открыта')}
            text={t(
              'Откройте смену, и касса посчитает, сколько наличных должно быть к вечеру. Без смены визиты и продажи работают как обычно.',
            )}
            action={
              <Button variant='secondary' onClick={() => setShiftSheet('open')}>
                {t('Открыть смену')}
              </Button>
            }
          />
        ))}

      {view === 'shift' && closed.length > 0 && (
        <section className={forms.group} aria-label={t('Прошлые смены')}>
          <SectionCaption>{t('Прошлые смены')}</SectionCaption>
          <ul className={forms.list}>
            {closed.map((item) => {
              const difference = describeDifference(item.difference, t)
              return (
                <li key={item.id} className={`${forms.settingRow} ${styles.row}`}>
                  <span className={`${forms.rowBody} ${styles.grow}`}>
                    <span className={forms.rowTitle}>
                      {formatDay(item.openedAt, t)}, {formatTime(item.openedAt)}-
                      {item.closedAt ? formatTime(item.closedAt) : ''}
                    </span>
                    <span className={forms.rowMeta}>
                      {formatPrice(item.openingCash)} → {formatPrice(item.countedCash ?? 0)}
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
            title={t('Сегодня продаж нет')}
            text={
              desk.products.length > 0
                ? t('Продайте товар отдельно или добавьте его к визиту в «Итоге визита».')
                : t('Отметьте позиции склада «Продаётся клиентам», чтобы продавать их здесь.')
            }
          />
        ) : (
          <section className={forms.group} aria-label={t('Продажи сегодня')}>
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
                            : `${item.name} × ${formatCount(item.quantity)}`,
                        )
                        .join(', ')}
                    </span>
                    <span className={forms.rowMeta}>
                      {[
                        sale.isCancelled ? t('отменена') : t(METHOD_LABEL[sale.paymentMethod]),
                        sale.customerName ??
                          (sale.customerPhone ? formatPhone(sale.customerPhone) : null),
                        sale.sellerName ? t('продал {name}', { name: sale.sellerName }) : null,
                        sale.bookingId ? t('с визитом') : null,
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
                    {formatPrice(sale.total)}
                  </span>
                  {sale.isCancelled && !sale.receipt ? (
                    <span className={styles.moreSpace} aria-hidden='true' />
                  ) : (
                    <Menu
                      label={t('Действия с продажей')}
                      className={styles.more}
                      trigger={<DotsThree weight='bold' aria-hidden />}
                    >
                      {sale.receipt && (
                        <MenuItem onClick={() => setOpenReceipt(sale.receipt)}>
                          {t(sale.receipt.kind === 'refund' ? 'Чек возврата' : 'Чек')}
                        </MenuItem>
                      )}
                      {!sale.isCancelled && (
                        <MenuItem variant='danger' onClick={() => handleCancelSale(sale)}>
                          {t('Отменить продажу')}
                        </MenuItem>
                      )}
                    </Menu>
                  )}
                </li>
              ))}
            </ul>
            <RowNote>
              {t('{sales} на {amount}. Отмена возвращает товары на склад.', {
                sales: t.count(liveSales.length, ['продажа', 'продажи', 'продаж']),
                amount: formatPrice(salesTotal),
              })}
            </RowNote>
          </section>
        ))}

      {view === 'expenses' &&
        expenses &&
        (expenses.items.length === 0 ? (
          <EmptyState
            variant='inline'
            title={t('Добавьте первый расход')}
            text={t(
              'Аренда, закупки, зарплаты, реклама: из них и выручки «Аналитика» считает прибыль.',
            )}
            action={
              <Button onClick={() => setEditingExpense('new')}>{t('Добавить расход')}</Button>
            }
          />
        ) : (
          <section className={forms.group} aria-label={t('Расходы')}>
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
                        {[formatDateKey(expense.date, t), expense.note].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className={forms.cellValue}>{formatPrice(expense.amount)}</span>
                    <CaretRight className={forms.chevron} weight='bold' aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <RowNote>
              {t('За {days} дней {amount}. Прибыль по периодам в «Аналитике».', {
                days: EXPENSE_DAYS,
                amount: formatPrice(expenses.total),
              })}
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
            run(() => openCashShift(slug, { branchId, openingCash }), t('Смена открыта'))
          }
          onMove={(kind, amount, reason) =>
            shift
              ? run(
                  () => addCashMovement(slug, shift.id, { kind, amount, reason }),
                  t(kind === 'in' ? 'Внесено' : 'Изъято'),
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
              t('Расход записан'),
            )
          }
          onDelete={
            editingExpense === 'new'
              ? undefined
              : () =>
                  void runExpense(() => deleteExpense(slug, editingExpense.id), t('Расход удалён'))
          }
        />
      )}
    </section>
  )
}

// The open shift line by line: what it started with, what came in and went out, what should be
// in the till now; then the cash moved, with why.
const ShiftDetails = ({ shift }: { shift: CashShift }) => {
  const t = useT()
  const lines = [
    { label: 'В начале смены', amount: shift.openingCash, isShown: true },
    { label: 'Наличные за визиты', amount: shift.visitsCash, isShown: shift.visitsCash > 0 },
    { label: 'Наличные за товары', amount: shift.salesCash, isShown: shift.salesCash > 0 },
    { label: 'Внесено', amount: shift.cashIn, isShown: shift.cashIn > 0 },
    { label: 'Изъято', amount: -shift.cashOut, isShown: shift.cashOut > 0 },
  ].filter((line) => line.isShown)

  return (
    <>
      <section className={forms.group} aria-label={t('Наличные в смене')}>
        <ul className={forms.list}>
          {lines.map((line) => (
            <li key={line.label} className={`${forms.settingRow} ${styles.row}`}>
              <span className={`${forms.rowTitle} ${styles.grow}`}>{t(line.label)}</span>
              <span className={styles.amount}>
                {line.amount < 0 ? '−' : ''}
                {formatPrice(Math.abs(line.amount))}
              </span>
            </li>
          ))}
          <li className={`${forms.settingRow} ${styles.row}`}>
            <span className={`${forms.rowTitle} ${styles.grow}`}>{t('Должно быть в кассе')}</span>
            <span className={styles.amount} data-strong>
              {formatPrice(shift.expectedCash)}
            </span>
          </li>
        </ul>
        <RowNote>
          {t('Наличные за визиты: отмеченные «Пришёл» за время смены в этом филиале.')}
        </RowNote>
      </section>
      {shift.movements.length > 0 && (
        <section className={forms.group} aria-label={t('Движение наличных')}>
          <SectionCaption>{t('Внесения и изъятия')}</SectionCaption>
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
                  {formatPrice(move.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
