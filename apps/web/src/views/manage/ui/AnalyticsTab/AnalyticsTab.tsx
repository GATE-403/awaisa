'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { ArrowDownRight, ArrowUpRight, DownloadSimple } from '@phosphor-icons/react/ssr'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { AnalyticsDays, AnalyticsReport, Business } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { pluralize } from '@/shared/lib/plural'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { useAnalytics } from '@/views/manage/model/useAnalytics'
import { ClientSheet } from '@/views/manage/ui/ClientSheet/ClientSheet'
import forms from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import styles from './AnalyticsTab.module.css'
import { formatDay, formatMoney, numberFormatter, toBuckets } from './analyticsFormat'
import { LoadHeatmap } from './LoadHeatmap'

// Recharts is loaded with the tab, never with the rest of the cabinet.
const chartsModule = () => import('./AnalyticsCharts')
const RevenueChart = dynamic(() => chartsModule().then((charts) => charts.RevenueChart), {
  ssr: false,
  loading: () => <div className={styles.chartPlaceholder} />,
})
const Sparkline = dynamic(() => chartsModule().then((charts) => charts.Sparkline), {
  ssr: false,
  loading: () => <div className={styles.sparkPlaceholder} />,
})
const PaymentsDonut = dynamic(() => chartsModule().then((charts) => charts.PaymentsDonut), {
  ssr: false,
  loading: () => <div className={styles.sparkPlaceholder} />,
})

interface AnalyticsTabProps {
  slug: string
  business: Business
}

interface DeltaProps {
  value: number | null
}

interface StatProps {
  label: string
  value: string
  delta?: number | null
  /** The same measure per day: a sparkline under the value. */
  trend?: number[]
  children?: React.ReactNode
}

const PERIODS: { value: `${AnalyticsDays}`; label: string }[] = [
  { value: '7', label: 'Неделя' },
  { value: '30', label: 'Месяц' },
  { value: '90', label: 'Квартал' },
  { value: '365', label: 'Год' },
]

const PREVIOUS: Record<AnalyticsDays, string> = {
  7: 'прошлой неделе',
  30: 'прошлому месяцу',
  90: 'прошлому кварталу',
  365: 'прошлому году',
}

const visits = (count: number) => pluralize(count, ['визит', 'визита', 'визитов'])

// Direction is shown twice — arrow and sign — so it never relies on colour.
const Delta = ({ value }: DeltaProps) => {
  if (value === null) return <span className={styles.deltaNone}>нет данных для сравнения</span>
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight

  return (
    <span className={styles.delta} data-direction={value > 0 ? 'up' : value < 0 ? 'down' : 'flat'}>
      <Icon weight='bold' aria-hidden='true' className={styles.deltaIcon} />
      {value > 0 ? '+' : value < 0 ? '−' : ''}
      {Math.abs(value)}%
    </span>
  )
}

const Stat = ({ label, value, delta, trend, children }: StatProps) => (
  <div className={styles.stat}>
    <span className={styles.statHead}>
      <span className={styles.statLabel}>{label}</span>
      {delta !== undefined && delta !== null && <Delta value={delta} />}
    </span>
    <span className={styles.statValue}>{value}</span>
    {trend && <Sparkline values={trend} />}
    {children}
  </div>
)

const toCsv = (report: AnalyticsReport) => {
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const rows = [
    ['Дата', 'Выручка', 'Визиты', 'Отмены'],
    ...report.daily.map((day) => [day.date, day.revenue, day.visits, day.cancelled]),
    [],
    ['Мастер', 'Визиты', 'Выручка', 'Процент', 'К выплате'],
    ...report.masters.map((master) => [
      master.name,
      master.visits,
      master.revenue,
      master.percent ?? '',
      master.payout ?? '',
    ]),
    [],
    ['Клиент', 'Телефон', 'Визиты', 'Потратил', 'Последний визит', 'Новый'],
    ...report.clients.map((client) => [
      client.name,
      client.phone,
      client.visits,
      client.revenue,
      client.lastVisit,
      client.isNew ? 'да' : 'нет',
    ]),
  ]
  return `﻿${rows.map((row) => row.map(quote).join(';')).join('\n')}`
}

export const AnalyticsTab = ({ slug, business }: AnalyticsTabProps) => {
  const [days, setDays] = useState<AnalyticsDays>(30)
  const [openPhone, setOpenPhone] = useState<string | null>(null)
  const { report, error, isLoading } = useAnalytics(slug, days)

  const totals = report?.totals
  const servicesRevenue = report ? Math.max(1, ...report.services.map((row) => row.revenue)) : 1
  const isEmpty =
    report !== null && !isLoading && totals?.visits === 0 && totals.upcomingVisits === 0

  const handleExport = () => {
    if (!report) return
    const url = URL.createObjectURL(new Blob([toCsv(report)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${slug}-${report.period.from}-${report.period.to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className={forms.section}>
      <SectionHeader
        title='Аналитика'
        description={
          report
            ? `${formatDay(report.period.from)} – ${formatDay(report.period.to)} · по прошедшим визитам`
            : 'Выручка, клиенты и загрузка'
        }
        actions={
          <>
            <SegmentedControl
              label='Период'
              value={String(days) as `${AnalyticsDays}`}
              items={PERIODS}
              onChange={(value) => setDays(Number(value) as AnalyticsDays)}
            />
            <Button variant='secondary' size='sm' onClick={handleExport} disabled={!report}>
              <DownloadSimple aria-hidden='true' />
              CSV
            </Button>
          </>
        }
      />

      {error && <p className={styles.error}>{error}</p>}
      {!report && !error && <Skeleton className={styles.skeleton} />}

      {isEmpty && (
        <EmptyState
          title='Визитов пока нет'
          text='Поделитесь ссылкой на страницу — здесь появятся выручка, клиенты и загрузка мастеров.'
        />
      )}

      {report && totals && !isEmpty && (
        <div className={styles.report} data-loading={isLoading || undefined} aria-busy={isLoading}>
          <article className={styles.hero}>
            <div className={styles.heroTop}>
              <div className={styles.heroHead}>
                <span className={styles.heroLabel}>Выручка</span>
                <span className={styles.heroValue}>{formatMoney(totals.revenue)}</span>
                <span className={styles.heroMeta}>
                  <Delta value={totals.revenueChange} />
                  {totals.revenueChange !== null && (
                    <span className={styles.muted}>к {PREVIOUS[report.period.days]}</span>
                  )}
                </span>
              </div>
              <div className={styles.heroSide}>
                {totals.upcomingVisits > 0 && (
                  <div className={styles.ahead}>
                    <span className={styles.heroLabel}>Впереди</span>
                    <span className={styles.aheadValue}>{formatMoney(totals.upcomingRevenue)}</span>
                    <span className={styles.muted}>{visits(totals.upcomingVisits)} записано</span>
                  </div>
                )}
                <PaymentsLine payments={totals.payments} />
                {totals.materialsCost > 0 && (
                  <div className={styles.ahead}>
                    <span className={styles.heroLabel}>Без материалов</span>
                    <span className={styles.aheadValue}>{formatMoney(totals.margin)}</span>
                    <span className={styles.muted}>
                      расходники {formatMoney(totals.materialsCost)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <RevenueChart
              buckets={toBuckets(report.daily, report.period.days)}
              previous={toBuckets(report.previousDaily, report.period.days)}
            />
          </article>

          <div className={styles.stats}>
            <Stat
              label='Визиты'
              value={numberFormatter.format(totals.visits)}
              delta={totals.visitsChange}
              trend={report.daily.map((day) => day.visits)}
            />
            <Stat
              label='Средний чек'
              value={formatMoney(totals.averageCheck)}
              delta={totals.averageCheckChange}
              trend={report.daily.map((day) => (day.visits === 0 ? 0 : day.revenue / day.visits))}
            />
            <Stat label='Клиенты' value={numberFormatter.format(totals.clients)}>
              <ClientsSplit newClients={totals.newClients} returning={totals.returningClients} />
            </Stat>
            <Stat label='Отмены' value={`${totals.cancellationRate}%`}>
              <span className={styles.deltaNone}>
                {totals.noShows > 0
                  ? `и неявки ${totals.noShowRate}% · ${totals.noShows}`
                  : 'от всех записей'}
              </span>
            </Stat>
          </div>

          <div className={styles.pairs}>
            <div className={forms.group}>
              <SectionCaption>Услуги</SectionCaption>
              {report.services.length === 0 ? (
                <p className={forms.groupEmpty}>
                  Здесь появятся услуги, которые приносят больше всего.
                </p>
              ) : (
                <ol className={forms.list}>
                  {report.services.map((service) => (
                    <li key={service.id} className={styles.row}>
                      <span className={styles.rowText}>
                        <span className={styles.rowTitle}>{service.name}</span>
                        <span className={styles.rowMeta}>
                          {visits(service.visits)}
                          {service.materialsCost > 0 &&
                            ` · материалы ${formatMoney(service.materialsCost)}`}
                        </span>
                      </span>
                      <span className={styles.rowValue}>{formatMoney(service.revenue)}</span>
                      <span className={styles.meter} aria-hidden='true'>
                        <span style={{ width: `${(service.revenue / servicesRevenue) * 100}%` }} />
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className={forms.group}>
              <SectionCaption>Мастера</SectionCaption>
              <ul className={forms.list}>
                {report.masters.map((master) => (
                  <li key={master.id} className={styles.row}>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{master.name}</span>
                      <span className={styles.rowMeta}>
                        {visits(master.visits)} · {formatMoney(master.revenue)}
                      </span>
                    </span>
                    <span className={styles.rowValue}>
                      {master.load}%<span className={styles.srOnly}> загрузки</span>
                    </span>
                    <span className={styles.meter} data-tone='load' aria-hidden='true'>
                      <span style={{ width: `${master.load}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
              <p className={styles.groupFooter}>Загрузка — доля рабочих часов, занятых визитами.</p>
            </div>
          </div>

          <div className={forms.group}>
            <SectionCaption>Загрузка по часам</SectionCaption>
            <div className={styles.card}>
              <LoadHeatmap cells={report.heatmap} hours={business.hours} />
            </div>
          </div>

          <div className={styles.pairs}>
            <PayrollGroup masters={report.masters} />
            <div className={forms.group}>
              <SectionCaption>
                Клиенты <span className={forms.groupCount}>{report.clients.length}</span>
              </SectionCaption>
              {report.clients.length === 0 ? (
                <p className={forms.groupEmpty}>
                  Здесь появятся клиенты, которые пришли за период.
                </p>
              ) : (
                <ul className={forms.list}>
                  {report.clients.map((client) => (
                    <li key={client.phone}>
                      <button
                        type='button'
                        className={styles.clientRow}
                        onClick={() => setOpenPhone(client.phone)}
                      >
                        <span className={styles.rowText}>
                          <span className={styles.rowTitle}>
                            {client.name || formatPhone(client.phone)}
                            {client.isNew && <span className={styles.badge}>Новый</span>}
                          </span>
                          <span className={styles.rowMeta}>
                            {formatPhone(client.phone)} · {visits(client.visits)} · был{' '}
                            {formatDay(client.lastVisit)}
                          </span>
                        </span>
                        <span className={styles.rowValue}>{formatMoney(client.revenue)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      {openPhone && (
        <ClientSheet slug={slug} phone={openPhone} onClose={() => setOpenPhone(null)} />
      )}
    </section>
  )
}

interface PayrollGroupProps {
  masters: AnalyticsReport['masters']
}

// Who is owed what for the period: the master's percent of what their visits earned.
const PayrollGroup = ({ masters }: PayrollGroupProps) => {
  const paid = masters.filter((master) => master.payout !== null && master.revenue > 0)
  const total = paid.reduce((sum, master) => sum + (master.payout ?? 0), 0)
  const missing = masters.some((master) => master.percent === null)

  return (
    <div className={forms.group}>
      <SectionCaption>Зарплата мастерам</SectionCaption>
      {paid.length === 0 ? (
        <p className={forms.groupEmpty}>
          Укажите процент мастера в его карточке (Мастера) — здесь появится, сколько кому выплатить.
        </p>
      ) : (
        <ul className={forms.list}>
          {paid.map((master) => (
            <li key={master.id} className={styles.row}>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{master.name}</span>
                <span className={styles.rowMeta}>
                  {master.percent}% от {formatMoney(master.revenue)}
                </span>
              </span>
              <span className={styles.rowValue}>{formatMoney(master.payout ?? 0)}</span>
            </li>
          ))}
          <li className={styles.row}>
            <span className={styles.rowTitle}>Итого к выплате</span>
            <span className={styles.rowValue}>{formatMoney(total)}</span>
          </li>
        </ul>
      )}
      {paid.length > 0 && missing && (
        <p className={styles.groupFooter}>У части мастеров процент не задан — их здесь нет.</p>
      )}
    </div>
  )
}

interface PaymentsLineProps {
  payments: AnalyticsReport['totals']['payments']
}

// Where the money came in, as staff marked it; the rest is counted at the price list.
const PaymentsLine = ({ payments }: PaymentsLineProps) => {
  const parts = [
    { label: 'Наличные', value: payments.cash },
    { label: 'Карта', value: payments.card },
    { label: 'Перевод', value: payments.transfer },
    { label: 'Не отмечено', value: payments.unmarked },
  ].filter((part) => part.value > 0)
  if (parts.length === 0) return null

  return (
    <div className={styles.payments}>
      <span className={styles.heroLabel}>Как платили</span>
      <PaymentsDonut parts={parts} />
    </div>
  )
}

interface ClientsSplitProps {
  newClients: number
  returning: number
}

// Two parts of one whole: a thin segmented bar plus a legend that names and counts both.
const ClientsSplit = ({ newClients, returning }: ClientsSplitProps) => {
  const total = newClients + returning

  return (
    <span className={styles.split}>
      {total > 0 && (
        <span className={styles.splitBar} aria-hidden='true'>
          {newClients > 0 && <span data-part='new' style={{ flexGrow: newClients }} />}
          {returning > 0 && <span data-part='returning' style={{ flexGrow: returning }} />}
        </span>
      )}
      <span className={styles.splitLegend}>
        <span>
          <i data-part='new' aria-hidden='true' />
          {pluralize(newClients, ['новый', 'новых', 'новых'])}
        </span>
        <span>
          <i data-part='returning' aria-hidden='true' />
          {pluralize(returning, ['вернулся', 'вернулись', 'вернулись'])}
        </span>
      </span>
    </span>
  )
}
