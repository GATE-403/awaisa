'use client'

import { useState } from 'react'
import { pluralize } from '@/shared/lib/plural'
import styles from './AnalyticsTab.module.css'
import { type Bucket, formatMoney, formatTick, niceCeiling } from './analyticsFormat'

interface RevenueChartProps {
  buckets: Bucket[]
}

const TICKS = 4

// One series (revenue), so no legend: the card title names it. Columns grow from one
// baseline; the tooltip carries exact values, a hidden table carries all of them.
export const RevenueChart = ({ buckets }: RevenueChartProps) => {
  const [active, setActive] = useState<string | null>(null)
  const max = niceCeiling(Math.max(...buckets.map((bucket) => bucket.revenue)))
  const ticks = Array.from({ length: TICKS + 1 }, (_, index) => (max / TICKS) * (TICKS - index))
  const labelEvery = Math.ceil(buckets.length / 8)
  const activeBucket = buckets.find((bucket) => bucket.key === active)

  return (
    <div className={styles.chart}>
      <div className={styles.axis} aria-hidden='true'>
        {ticks.map((tick) => (
          <span key={tick}>{formatTick(tick)}</span>
        ))}
      </div>
      <div className={styles.plot} onPointerLeave={() => setActive(null)}>
        <div className={styles.grid} aria-hidden='true'>
          {ticks.map((tick) => (
            <span key={tick} />
          ))}
        </div>
        <div className={styles.columns}>
          {buckets.map((bucket, index) => (
            <button
              key={bucket.key}
              type='button'
              className={styles.column}
              data-active={bucket.key === active || undefined}
              aria-label={`${bucket.title}: ${formatMoney(bucket.revenue)}, ${pluralize(bucket.visits, ['визит', 'визита', 'визитов'])}`}
              onPointerEnter={() => setActive(bucket.key)}
              onFocus={() => setActive(bucket.key)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(bucket.key)}
            >
              <span className={styles.track}>
                <span
                  className={styles.bar}
                  style={{ height: `${(bucket.revenue / max) * 100}%` }}
                  data-empty={bucket.revenue === 0 || undefined}
                />
              </span>
              <span className={styles.columnLabel} aria-hidden='true'>
                {index % labelEvery === 0 ? bucket.label : ''}
              </span>
            </button>
          ))}
        </div>
        {activeBucket && (
          <div
            className={styles.tooltip}
            style={{
              left: `${((buckets.indexOf(activeBucket) + 0.5) / buckets.length) * 100}%`,
            }}
            aria-hidden='true'
          >
            <span className={styles.tooltipTitle}>{activeBucket.title}</span>
            <span className={styles.tooltipValue}>{formatMoney(activeBucket.revenue)}</span>
            <span className={styles.tooltipMeta}>
              {pluralize(activeBucket.visits, ['визит', 'визита', 'визитов'])}
            </span>
          </div>
        )}
      </div>
      <table className={styles.srOnly}>
        <caption>Выручка по периодам</caption>
        <thead>
          <tr>
            <th scope='col'>Период</th>
            <th scope='col'>Выручка</th>
            <th scope='col'>Визиты</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.key}>
              <th scope='row'>{bucket.title}</th>
              <td>{formatMoney(bucket.revenue)}</td>
              <td>{bucket.visits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
