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
    { key: 'services', title: t('Услуги'), amount: money.servicesRevenue },
    {
      key: 'products',
      title: t('Товары'),
      meta: sold > 0 ? t('продано {count} шт.', { count: formatCount(sold) }) : undefined,
      amount: money.productsRevenue,
    },
    {
      key: 'subscriptions',
      title: t('Абонементы'),
      meta:
        money.subscriptionsSold > 0
          ? t('продано {count}', { count: formatCount(money.subscriptionsSold) })
          : undefined,
      amount: money.subscriptionsRevenue,
    },
    // Paid online on that day; spending them on visits later is not counted again.
    { key: 'certificates', title: t('Сертификаты'), amount: money.certificatesRevenue },
    { key: 'materials', title: t('Материалы на визиты'), amount: -money.materialsCost },
    { key: 'productsCost', title: t('Себестоимость товаров'), amount: -money.productsCost },
    ...money.expensesByCategory.map((item) => ({
      key: `expense-${item.category}`,
      title: t(expenseCategoryLabel(item.category)),
      amount: -item.amount,
    })),
  ].filter((line) => line.amount !== 0)

  return (
    <section className={styles.group} aria-labelledby='analytics-profit'>
      <SectionCaption id='analytics-profit' isInset={false}>
        {t('Прибыль')}
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
              {t('расходы {amount}', { amount: formatMoney(Math.round(money.expenses)) })}
            </span>
          )}
        </span>
      </div>
      <ScrollArea
        label={t('Из чего прибыль')}
        moreLabel={(count) =>
          t('Ещё {count}', { count: t.count(count, ['строка', 'строки', 'строк']) })
        }
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
        ['Прибыль', 'Сумма'],
        ['Выручка: услуги', money.servicesRevenue],
        ['Выручка: товары', money.productsRevenue],
        ['Выручка: абонементы', money.subscriptionsRevenue],
        ['Выручка: сертификаты', money.certificatesRevenue],
        ['Материалы на визиты', money.materialsCost],
        ['Себестоимость товаров', money.productsCost],
        ['Расходы', money.expenses],
        ['Прибыль', money.profit],
        [],
        ['Статья расхода', 'Сумма'],
        ...money.expensesByCategory.map((item) => [
          expenseCategoryLabel(item.category),
          item.amount,
        ]),
        [],
        ['Товар', 'Продано', 'Выручка'],
        ...money.products.map((product) => [product.name, product.quantity, product.revenue]),
        [],
        ['Дата', 'Выручка', 'Расходы', 'Прибыль'],
        ...money.daily.map((day) => [day.date, day.revenue, day.expenses, day.profit]),
      ]
    : []

export { moneyCsvRows, ProfitSection }
