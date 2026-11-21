import type { ReactNode } from 'react'
import type { MoneyReport } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { ScrollArea } from '@/shared/ui/ScrollArea/ScrollArea'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { expenseCategoryLabel, formatCount } from '@/views/manage/lib/cashFormat'
import styles from './AnalyticsTab.module.css'
import { formatMoney } from './analyticsFormat'

interface ProfitSectionProps {
  money: MoneyReport
  /** The change against the period before, drawn like the revenue's. */
  delta: ReactNode
}

type Line = { key: string; title: string; meta?: string; amount: number }

// «Прибыль»: what came in (services, products, certificates sold online) and what went out (materials, products' cost,
// expenses by category), the profit at the top. Right on the page, rows with hairlines.
const ProfitSection = ({ money, delta }: ProfitSectionProps) => {
  const sold = money.products.reduce((sum, product) => sum + product.quantity, 0)
  const lines: Line[] = [
    { key: 'services', title: 'Услуги', amount: money.servicesRevenue },
    {
      key: 'products',
      title: 'Товары',
      meta: sold > 0 ? `продано ${formatCount(sold)} шт.` : undefined,
      amount: money.productsRevenue,
    },
    // Paid online on that day; spending them on visits later is not counted again.
    { key: 'certificates', title: 'Сертификаты', amount: money.certificatesRevenue },
    { key: 'materials', title: 'Материалы на визиты', amount: -money.materialsCost },
    { key: 'productsCost', title: 'Себестоимость товаров', amount: -money.productsCost },
    ...money.expensesByCategory.map((item) => ({
      key: `expense-${item.category}`,
      title: expenseCategoryLabel(item.category),
      amount: -item.amount,
    })),
  ].filter((line) => line.amount !== 0)

  return (
    <section className={styles.group} aria-labelledby='analytics-profit'>
      <SectionCaption id='analytics-profit' isInset={false}>
        Прибыль
      </SectionCaption>
      <div className={styles.revenueHead}>
        <span className={styles.factValue} data-negative={money.profit < 0 || undefined}>
          {money.profit < 0 ? '−' : ''}
          {formatMoney(Math.abs(Math.round(money.profit)))}
        </span>
        <span className={styles.revenueMeta}>
          {delta}
          {money.expenses > 0 && (
            <span className={styles.muted}>расходы {formatMoney(Math.round(money.expenses))}</span>
          )}
        </span>
      </div>
      <ScrollArea
        label='Из чего прибыль'
        moreLabel={(count) => `Ещё ${pluralize(count, ['строка', 'строки', 'строк'])}`}
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
