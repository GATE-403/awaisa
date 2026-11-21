'use client'

import { useSyncExternalStore } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { pluralize } from '@/shared/lib/plural'
import styles from './AnalyticsCharts.module.css'
import { type Bucket, formatMoney, formatTick } from './analyticsFormat'

// Recharts lives only here: the analytics tab loads this file on demand, so the rest of the
// cabinet never ships it. Colours are our tokens, passed as CSS variables to the SVG.

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(reducedMotionQuery)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const useAnimate = () =>
  useSyncExternalStore(
    subscribeMotion,
    () => !window.matchMedia(reducedMotionQuery).matches,
    () => false,
  )

const visits = (count: number) => pluralize(count, ['визит', 'визита', 'визитов'])

type RevenueRow = Bucket & { previous: number; previousTitle: string }

const changeOf = (current: number, previous: number) =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 100)

const RevenueTooltip = ({ active, payload }: TooltipContentProps<ValueType, NameType>) => {
  const row = payload?.[0]?.payload as RevenueRow | undefined
  if (!active || !row) return null
  const change = changeOf(row.revenue, row.previous)

  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipTitle}>{row.title}</span>
      <span className={styles.tooltipValue}>{formatMoney(row.revenue)}</span>
      <span className={styles.tooltipMeta}>{visits(row.visits)}</span>
      <span className={styles.tooltipCompare}>
        <i data-series='previous' aria-hidden='true' />
        {row.previousTitle}: {formatMoney(row.previous)}
        {change !== null && (
          <b data-direction={change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}>
            {change > 0 ? '+' : change < 0 ? '−' : ''}
            {Math.abs(change)}%
          </b>
        )}
      </span>
    </div>
  )
}

interface RevenueChartProps {
  buckets: Bucket[]
  previous: Bucket[]
  /** A column clicked: its bucket's key (a day's date for daily columns). */
  onBucketClick?: (key: string) => void
}

// This period as solid columns, the one before as hatched ones behind each: the comparison is
// the picture itself; the tooltip carries exact values, a hidden table carries all of them.
const RevenueChart = ({ buckets, previous, onBucketClick }: RevenueChartProps) => {
  const animate = useAnimate()
  const rows: RevenueRow[] = buckets.map((bucket, index) => ({
    ...bucket,
    previous: previous[index]?.revenue ?? 0,
    previousTitle: previous[index]?.title ?? '',
  }))
  const labelEvery = Math.ceil(rows.length / 8)
  const openBucket = (index: number) => {
    const row = rows[index]
    if (row) onBucketClick?.(row.key)
  }

  return (
    <div className={styles.revenue}>
      {/* Not aria-hidden: Recharts makes the chart a focusable application (arrows move the
          tooltip), and a focusable element hidden from screen readers is a trap. */}
      <div className={styles.chart}>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart
            title='Выручка по периодам'
            data={rows}
            barGap={2}
            barCategoryGap='18%'
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <pattern
                id='revenue-hatch'
                width='6'
                height='6'
                patternUnits='userSpaceOnUse'
                patternTransform='rotate(45)'
              >
                <rect width='6' height='6' fill='var(--color-fill)' />
                <line
                  x1='0'
                  y1='0'
                  x2='0'
                  y2='6'
                  stroke='var(--color-border-strong)'
                  strokeWidth='2.5'
                />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} stroke='var(--color-border)' strokeDasharray='3 4' />
            <XAxis
              dataKey='key'
              tickLine={false}
              axisLine={false}
              interval={0}
              tickFormatter={(_, index) =>
                index % labelEvery === 0 ? (rows[index]?.label ?? '') : ''
              }
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tickCount={5}
              tickFormatter={formatTick}
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
            />
            <Tooltip
              content={RevenueTooltip}
              cursor={{ fill: 'var(--color-fill)', radius: 8 }}
              animationDuration={animate ? 160 : 0}
            />
            <Bar
              dataKey='previous'
              onClick={(_, index) => openBucket(index)}
              cursor={onBucketClick ? 'pointer' : undefined}
              fill='url(#revenue-hatch)'
              radius={[6, 6, 2, 2]}
              isAnimationActive={animate}
              animationDuration={500}
            />
            <Bar
              dataKey='revenue'
              onClick={(_, index) => openBucket(index)}
              cursor={onBucketClick ? 'pointer' : undefined}
              fill='var(--color-primary)'
              radius={[6, 6, 2, 2]}
              isAnimationActive={animate}
              animationDuration={700}
              activeBar={{ fill: 'var(--color-primary-hover)' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.legend} aria-hidden='true'>
        <span>
          <i data-series='current' />
          Этот период
        </span>
        <span>
          <i data-series='previous' />
          Прошлый
        </span>
      </div>
      {/* A table keeps its content's width whatever it is told, so a block hides it: the table
          itself stretched the page sideways on phones. */}
      <div className={styles.srOnly}>
        <table>
          <caption>Выручка по периодам и тот же отрезок в прошлом периоде</caption>
          <thead>
            <tr>
              <th scope='col'>Период</th>
              <th scope='col'>Выручка</th>
              <th scope='col'>Визиты</th>
              <th scope='col'>Прошлый период</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope='row'>{row.title}</th>
                <td>{formatMoney(row.revenue)}</td>
                <td>{row.visits}</td>
                <td>{formatMoney(row.previous)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface SparklineProps {
  values: number[]
  /** The point under the pointer (its index), or null when it leaves: the stat shows that day. */
  onActiveChange?: (index: number | null) => void
}

type ChartPointer = { activeTooltipIndex?: number | string | null } | null

// One series, no axis: the shape of the period under a number. Scrubbed like a stock chart:
// pointing at it (or a finger along it) puts that day's figure in the number above, with a cursor
// line and a dot on the curve; leaving brings the period's figure back.
const Sparkline = ({ values, onActiveChange }: SparklineProps) => {
  const animate = useAnimate()
  if (values.length < 2) return null
  const data = values.map((value, index) => ({ index, value }))
  const handleMove = (state: ChartPointer) => {
    const index = state?.activeTooltipIndex
    onActiveChange?.(index === undefined || index === null ? null : Number(index))
  }

  return (
    <div className={styles.sparkline}>
      <ResponsiveContainer width='100%' height='100%'>
        <AreaChart
          data={data}
          margin={{ top: 6, right: 6, bottom: 0, left: 6 }}
          onMouseMove={handleMove}
          onMouseLeave={() => onActiveChange?.(null)}
        >
          <defs>
            <linearGradient id='spark-fill' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor='var(--color-primary)' stopOpacity={0.28} />
              <stop offset='100%' stopColor='var(--color-primary)' stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            content={() => null}
            cursor={{ stroke: 'var(--color-border-strong)', strokeDasharray: '3 3' }}
            isAnimationActive={false}
          />
          <Area
            dataKey='value'
            type='monotone'
            stroke='var(--color-primary)'
            strokeWidth={2}
            fill='url(#spark-fill)'
            dot={false}
            activeDot={{
              r: 4,
              fill: 'var(--color-primary)',
              stroke: 'var(--color-background)',
              strokeWidth: 2,
            }}
            isAnimationActive={animate}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export { RevenueChart, Sparkline }
