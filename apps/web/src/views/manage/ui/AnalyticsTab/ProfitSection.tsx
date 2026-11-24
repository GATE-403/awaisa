'use client'

import type { ReactNode } from 'react'
import type { MoneyReport } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { ScrollArea } from '@/shared/ui/ScrollArea/ScrollArea'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { expenseCategoryLabel, formatCount } from '@/views/manage/lib/cashFormat'
import styles from './AnalyticsTab.module.css'
import { analyticsFormat } from './analyticsFormat'

interface ProfitSectionProps {
  money: MoneyReport
  /** The change against the period before, drawn like the revenue's. */
  delta: ReactNode
}

type Line = { key: string; title: string; meta?: string; amount: number }

// «Прибыль»: what came in (services, products, subscriptions sold) and what went out (materials, products' cost,
// expenses by category), the profit at the top. Right on the page, rows with hairlines.
const ProfitSection = ({ money, delta }: ProfitSectionProps) => {
  const t = useT()
  const { formatMoney } = analyticsFormat(t)
  const sold = money.products.reduce((sum, product) => sum + product.quantity, 0)
  const lines: Line[] = [
    { key: 'services', title: t('Services'), amount: money.servicesRevenue },
    {
      key: 'products',
      title: t('Products'),
      meta: sold > 0 ? t('{count} pcs sold', { count: formatCount(sold) }) : undefined,
      amount: money.productsRevenue,
    },
    {
      key: 'subscriptions',
      title: t('Passes'),
      meta:
        money.subscriptionsSold > 0
          ? t('{count} sold', { count: formatCount(money.subscriptionsSold) })
          : undefined,
      amount: money.subscriptionsRevenue,
    },
    // Paid online on that day; spending them on visits later is not counted again.
    { key: 'certificates', title: t('Certificates'), amount: money.certificatesRevenue },
    { key: 'materials', title: t('Materials for visits'), amount: -money.materialsCost },
    { key: 'productsCost', title: t('Cost of products'), amount: -money.productsCost },
    ...money.expensesByCategory.map((item) => ({
      key: `expense-${item.category}`,
      title: t(expenseCategoryLabel(item.category)),
      amount: -item.amount,
    })),
  ].filter((line) => line.amount !== 0)

  return (
    <section className={styles.group} aria-labelledby='analytics-profit'>
      <SectionCaption id='analytics-profit' isInset={false}>
        {t('Profit')}
      </SectionCaption>
      <div className={styles.revenueHead}>
        <span className={styles.factValue} data-negative={money.profit < 0 || undefined}>
          {money.profit < 0 ? '−' : ''}
          {formatMoney(Math.abs(Math.round(money.profit)))}
        </span>
        <span className={styles.revenueMeta}>
          {delta}
          {money.expenses > 0 && (
            <span className={styles.muted}>
              {t('expenses {amount}', { amount: formatMoney(Math.round(money.expenses)) })}
            </span>
          )}
        </span>
      </div>
      <ScrollArea
        label={t('What makes the profit')}
        moreLabel={(count) => t('{count} more', { count: t.count(count, ['row', 'rows']) })}
      >
        <ol className={styles.rows}>
          {lines.map((line) => (
            <li key={line.key} className={styles.row}>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{line.title}</span>
                {line.meta && <span className={styles.rowMeta}>{line.meta}</span>}
              </span>
              <span className={styles.rowValue}>
                {line.amount < 0 ? '−' : '+'}
                {formatMoney(Math.abs(Math.round(line.amount)))}
              </span>
            </li>
          ))}
        </ol>
      </ScrollArea>
    </section>
  )
}

/** The money block of the analytics CSV: the profit's parts, expenses by category, products. */
const moneyCsvRows = (money: MoneyReport | null): (string | number)[][] =>
  money
    ? [
        [],
        ['Profit', 'Amount'],
        ['Выручка: услуги', money.servicesRevenue],
        ['Выручка: товары', money.productsRevenue],
        ['Выручка: абонементы', money.subscriptionsRevenue],
        ['Выручка: сертификаты', money.certificatesRevenue],
        ['Materials for visits', money.materialsCost],
        ['Cost of products', money.productsCost],
        ['Expenses', money.expenses],
        ['Profit', money.profit],
        [],
        ['Expense category', 'Amount'],
        ...money.expensesByCategory.map((item) => [
          expenseCategoryLabel(item.category),
          item.amount,
        ]),
        [],
        ['Product', 'Продано', 'Revenue'],
        ...money.products.map((product) => [product.name, product.quantity, product.revenue]),
        [],
        ['Date', 'Revenue', 'Expenses', 'Profit'],
        ...money.daily.map((day) => [day.date, day.revenue, day.expenses, day.profit]),
      ]
    : []

export { moneyCsvRows, ProfitSection }
