'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { ArrowDownRight, ArrowUpRight, CaretRight, DownloadSimple } from '@phosphor-icons/react/ssr'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { createPromotion, setAnalyticsGoal } from '@/shared/api/clientApi'
import type {
  AnalyticsDays,
  AnalyticsReport,
  Business,
  Catalog,
  MoneyReport,
  PromotionInput,
} from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
import { formatPhone } from '@/shared/lib/formatPhone'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { FloatingToolbar } from '@/shared/ui/FloatingToolbar/FloatingToolbar'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { ScrollArea } from '@/shared/ui/ScrollArea/ScrollArea'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { plainPercent } from '@/views/manage/lib/payText'
import { useAnalytics } from '@/views/manage/model/useAnalytics'
import { useMoneyReport } from '@/views/manage/model/useMoneyReport'
import { ClientSheet } from '@/views/manage/ui/ClientSheet/ClientSheet'
import { MailingSheet } from '@/views/manage/ui/MailingSheet/MailingSheet'
import forms from '@/views/manage/ui/manageForms.module.css'
import { PromotionSheet } from '@/views/manage/ui/PromotionsTab/PromotionSheet'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import styles from './AnalyticsTab.module.css'
import { analyticsFormat, numberFormatter } from './analyticsFormat'
import { Filled } from './Filled'
import {
  AttentionList,
  ChangeReasons,
  GoalLine,
  GoalSheet,
  LossesGroup,
  PromotionsGroup,
  SourcesGroup,
} from './Insights'
import { type HeatmapCell, LoadHeatmap } from './LoadHeatmap'
import { MasterStatsSheet } from './MasterStatsSheet'
import { moneyCsvRows, ProfitSection } from './ProfitSection'

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
interface AnalyticsTabProps {
  slug: string
  business: Business
  /** The services, for a promotion made from the heatmap. */
  catalog: Catalog
}

interface DeltaProps {
  value: number | null
}

interface StatProps {
  label: string
  value: string
  delta?: number | null
  /** The same measure per day: a sparkline under the value, scrubbed to read one day. */
  trend?: { values: number[]; days: string[]; format: (value: number) => string }
  children?: React.ReactNode
}

const PERIODS: { value: `${AnalyticsDays}`; label: string }[] = [
  { value: '7', label: 'Week' },
  { value: '30', label: 'Month' },
  { value: '90', label: 'Quarter' },
  { value: '365', label: 'Year' },
]

const COMPARED: Record<AnalyticsDays, string> = {
  7: 'vs last week',
  30: 'vs last month',
  90: 'vs last quarter',
  365: 'vs last year',
}

const SAME: Record<AnalyticsDays, string> = {
  7: 'Same as last week',
  30: 'Same as last month',
  90: 'Same as last quarter',
  365: 'Same as last year',
}

const visits = (t: Translate, count: number) => t.count(count, ['visit', 'visits'])

// Direction is shown twice - arrow and sign - so it never relies on colour.
const Delta = ({ value }: DeltaProps) => {
  const t = useT()
  if (value === null) {
    return <span className={styles.deltaNone}>{t('nothing to compare with')}</span>
  }
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight

  return (
    <span className={styles.delta} data-direction={value > 0 ? 'up' : value < 0 ? 'down' : 'flat'}>
      <Icon aria-hidden='true' className={styles.deltaIcon} />
      {value > 0 ? '+' : value < 0 ? '−' : ''}
      {Math.abs(value)}%
    </span>
  )
}

// A figure for the period; scrubbing its sparkline puts one day's figure in its place and the day
// where the change was, so the line under the number is something to read, not a decoration.
const Stat = ({ label, value, delta, trend, children }: StatProps) => {
  const [active, setActive] = useState<number | null>(null)
  const day = active === null ? null : trend?.days[active]
  const dayValue = active === null ? undefined : trend?.values[active]

  return (
    <div className={styles.stat}>
      <span className={styles.statHead}>
        <span className={styles.statLabel}>{label}</span>
        {day ? (
          <span className={styles.statDay}>{day}</span>
        ) : (
          delta !== undefined && delta !== null && <Delta value={delta} />
        )}
      </span>
      <span className={styles.statValue}>
        {dayValue !== undefined && trend ? trend.format(dayValue) : value}
      </span>
      {trend && <Sparkline values={trend.values} onActiveChange={setActive} />}
      {children}
    </div>
  )
}

const toCsv = (report: AnalyticsReport, money: MoneyReport | null) => {
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const rows = [
    ['Date', 'Revenue', 'Visits', 'Cancellations'],
    ...report.daily.map((day) => [day.date, day.revenue, day.visits, day.cancelled]),
    [],
    [
      'Specialist',
      'Visits',
      'Revenue',
      'Percent',
      'From services',
      'From products',
      'Salary',
      'Minimum',
      'Earned',
      'Paid out',
      'Due',
    ],
    ...report.masters.map((master) => [
      master.name,
      master.visits,
      master.revenue,
      master.percent ?? '',
      master.pay?.services ?? '',
      master.pay?.products ?? '',
      master.pay?.salary ?? '',
      master.pay?.minimum ?? '',
      master.pay?.total ?? '',
      master.pay?.paid ?? '',
      master.pay?.due ?? '',
    ]),
    [],
    ['Client', 'Phone', 'Visits', 'Spent', 'Last visit', 'New'],
    ...report.clients.map((client) => [
      client.name,
      client.phone,
      client.visits,
      client.revenue,
      client.lastVisit,
      client.isNew ? 'yes' : 'no',
    ]),
    ...moneyCsvRows(money),
  ]
  return `﻿${rows.map((row) => row.map(quote).join(';')).join('\n')}`
}

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

export const AnalyticsTab = ({ slug, business, catalog }: AnalyticsTabProps) => {
  const router = useRouter()
  const toast = useToast()
  const t = useT()
  const { formatDay, formatMoney, toBuckets } = analyticsFormat(t)
  const [days, setDays] = useState<AnalyticsDays>(30)
  const [openPhone, setOpenPhone] = useState<string | null>(null)
  const [openMasterId, setOpenMasterId] = useState<string | null>(null)
  const [isMailingOpen, setIsMailingOpen] = useState(false)
  const [isGoalOpen, setIsGoalOpen] = useState(false)
  // A promotion started from the heatmap's quiet hour.
  const [promotionDraft, setPromotionDraft] = useState<Partial<PromotionInput> | null>(null)
  const { report, error, isLoading, setGoal, reload } = useAnalytics(slug, days)
  const money = useMoneyReport(slug, days)
  // Sales and expenses count even in a period without visits.
  const profit = money &&
    money.period.days === days &&
    (money.revenue > 0 || money.expenses > 0) && (
      <ProfitSection money={money} delta={<Delta value={money.profitChange} />} />
    )
  const openMaster = report?.masters.find((master) => master.id === openMasterId)

  const totals = report?.totals
  const servicesRevenue = report ? Math.max(1, ...report.services.map((row) => row.revenue)) : 1
  const isEmpty =
    report !== null && !isLoading && totals?.visits === 0 && totals.upcomingVisits === 0

  const saveGoal = async (goal: number | null) => {
    try {
      await setAnalyticsGoal(slug, goal)
      setGoal(goal)
    } catch (goalError) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(goalError),
        type: 'error',
      })
      throw goalError
    }
  }

  const savePromotion = async (input: PromotionInput) => {
    try {
      await createPromotion(slug, input)
      toast.show({ title: t('Promotion created'), type: 'success' })
      return true
    } catch (promotionError) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(promotionError),
        type: 'error',
      })
      return false
    }
  }

  // A quiet hour on the heatmap becomes a happy-hours promotion on that weekday and hour.
  const makePromotion = (cell: HeatmapCell) =>
    setPromotionDraft({
      kind: 'happy_hours',
      title: `${WEEKDAY_NAMES[cell.weekday]} ${cell.hour}:00`,
      weekdays: [cell.weekday],
      fromMinutes: cell.hour * 60,
      toMinutes: (cell.hour + 1) * 60,
    })

  // A day on the revenue chart opens that day in the schedule (weeks and months open their start).
  const openDay = (key: string) => {
    if (DAY_KEY.test(key)) router.push(`?tab=schedule&date=${key}`)
  }

  const handleExport = () => {
    if (!report) return
    const url = URL.createObjectURL(
      new Blob([toCsv(report, money)], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `${slug}-${report.period.from}-${report.period.to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className={`${forms.section} ${styles.page}`}>
      <SectionHeader
        title={t('Analytics')}
        description={
          report
            ? t('{from} to {to} · past visits', {
                from: formatDay(report.period.from),
                to: formatDay(report.period.to),
              })
            : t('Revenue, clients and load')
        }
        actions={
          <FloatingToolbar className={styles.tools}>
            <SegmentedControl
              size='sm'
              label={t('Period')}
              value={String(days) as `${AnalyticsDays}`}
              items={PERIODS.map((period) => ({ ...period, label: t(period.label) }))}
              onChange={(value) => setDays(Number(value) as AnalyticsDays)}
            />
            <GlyphGroup label={t('Report')}>
              <GlyphButton
                icon={<DownloadSimple />}
                label={t('Download CSV')}
                onClick={handleExport}
                disabled={!report}
              />
            </GlyphGroup>
          </FloatingToolbar>
        }
      />

      {error && <p className={styles.error}>{error}</p>}
      {!report && !error && <Skeleton className={styles.skeleton} />}

      {isEmpty && (
        <EmptyState
          title={t('No visits yet')}
          text={t(
            'Share your page link, and revenue, clients and specialists’ load will show here.',
          )}
        />
      )}

      {isEmpty && profit}

      {report && totals && !isEmpty && (
        <div className={styles.report} data-loading={isLoading || undefined} aria-busy={isLoading}>
          <AttentionList attention={report.attention} onCallBack={() => setIsMailingOpen(true)} />

          {/* Money: the one number the tab leads with, what is booked ahead, its chart and how
              people paid. Right on the page, no card. */}
          <section className={styles.revenue} aria-label={t('Revenue')}>
            <div className={styles.revenueTop}>
              <div className={styles.revenueHead}>
                <span className={styles.label}>{t('Revenue')}</span>
                <span className={styles.revenueValue}>{formatMoney(totals.revenue)}</span>
                <span className={styles.revenueMeta}>
                  <Delta value={totals.revenueChange} />
                  {totals.revenueChange !== null && (
                    <span className={styles.muted}>{t(COMPARED[report.period.days])}</span>
                  )}
                </span>
                <ChangeReasons totals={totals} masters={report.masters} />
              </div>
              <dl className={styles.facts}>
                {totals.upcomingVisits > 0 && (
                  <div className={styles.fact}>
                    <dt className={styles.label}>{t('Ahead')}</dt>
                    <dd className={styles.factValue}>{formatMoney(totals.upcomingRevenue)}</dd>
                    <dd className={styles.muted}>
                      {t('{visits} booked', { visits: visits(t, totals.upcomingVisits) })}
                    </dd>
                  </div>
                )}
                {totals.materialsCost > 0 && (
                  <div className={styles.fact}>
                    <dt className={styles.label}>{t('Less materials')}</dt>
                    <dd className={styles.factValue}>{formatMoney(totals.margin)}</dd>
                    <dd className={styles.muted}>
                      {t('consumables {amount}', { amount: formatMoney(totals.materialsCost) })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <GoalLine month={report.month} onEdit={() => setIsGoalOpen(true)} />
            <RevenueChart
              buckets={toBuckets(report.daily, report.period.days)}
              previous={toBuckets(report.previousDaily, report.period.days)}
              onBucketClick={openDay}
            />
            <PaymentsSplit payments={totals.payments} />
          </section>

          {profit}

          <section className={styles.group} aria-labelledby='analytics-visits'>
            <SectionCaption id='analytics-visits' isInset={false}>
              {t('Visits and clients')}
            </SectionCaption>
            <div className={styles.stats}>
              <Stat
                label={t('Visits')}
                value={numberFormatter.format(totals.visits)}
                delta={totals.visitsChange}
                trend={{
                  values: report.daily.map((day) => day.visits),
                  days: report.daily.map((day) => formatDay(day.date)),
                  format: (count) => numberFormatter.format(count),
                }}
              />
              <Stat
                label={t('Average bill')}
                value={formatMoney(totals.averageCheck)}
                delta={totals.averageCheckChange}
                trend={{
                  values: report.daily.map((day) =>
                    day.visits === 0 ? 0 : Math.round(day.revenue / day.visits),
                  ),
                  days: report.daily.map((day) => formatDay(day.date)),
                  format: formatMoney,
                }}
              />
              <Stat label={t('Clients')} value={numberFormatter.format(totals.clients)}>
                <ClientsSplit newClients={totals.newClients} returning={totals.returningClients} />
                {report.retention.rate !== null && (
                  <span className={styles.deltaNone}>
                    <Filled
                      text={t('{rate} return within 6 weeks')}
                      parts={{
                        rate: <b className={styles.strong}>{report.retention.rate}%</b>,
                      }}
                    />
                  </span>
                )}
              </Stat>
              <Stat label={t('Cancellations')} value={`${totals.cancellationRate}%`}>
                <span className={styles.deltaNone}>
                  {totals.noShows > 0
                    ? t('and no-shows {rate}% · {count}', {
                        rate: totals.noShowRate,
                        count: totals.noShows,
                      })
                    : t('of all bookings')}
                </span>
              </Stat>
            </div>
          </section>

          <div
            className={styles.pairs}
            data-uneven={isUneven(report.masters.length, report.services.length) || undefined}
          >
            <MastersGroup masters={report.masters} onOpen={setOpenMasterId} />
            <section className={styles.group} aria-labelledby='analytics-services'>
              <SectionCaption id='analytics-services' isInset={false}>
                {t('Services')} <span className={forms.groupCount}>{report.services.length}</span>
              </SectionCaption>
              {report.services.length === 0 ? (
                <EmptyState
                  variant='inline'
                  text={t('The services that bring in the most will show here.')}
                />
              ) : (
                <ScrollArea
                  label={t('Services for the period')}
                  moreLabel={(count) =>
                    t('{count} more', { count: t.count(count, ['service', 'services']) })
                  }
                >
                  <ol className={styles.rows}>
                    {report.services.map((service) => (
                      <li key={service.id} className={styles.row}>
                        <span className={styles.rowText}>
                          <span className={styles.rowTitle}>{service.name}</span>
                          <span className={styles.rowMeta}>
                            {visits(t, service.visits)}
                            {service.materialsCost > 0 &&
                              ` · ${t('materials {amount}', { amount: formatMoney(service.materialsCost) })}`}
                          </span>
                        </span>
                        <span className={styles.rowValue}>{formatMoney(service.revenue)}</span>
                        {service.revenue > 0 && (
                          <span className={styles.meter} aria-hidden='true'>
                            <span
                              style={{ width: `${(service.revenue / servicesRevenue) * 100}%` }}
                            />
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </ScrollArea>
              )}
            </section>
          </div>

          <div
            className={styles.pairs}
            data-uneven={isUneven(report.clients.length, HEATMAP_ROWS) || undefined}
          >
            <section className={styles.group} aria-labelledby='analytics-clients'>
              <SectionCaption id='analytics-clients' isInset={false}>
                {t('Clients')} <span className={forms.groupCount}>{report.clients.length}</span>
              </SectionCaption>
              {report.clients.length === 0 ? (
                <EmptyState
                  variant='inline'
                  text={t('Clients who came during the period will show here.')}
                />
              ) : (
                <ScrollArea
                  label={t('Clients for the period')}
                  moreLabel={(count) =>
                    t('{count} more', { count: t.count(count, ['client', 'clients']) })
                  }
                >
                  <ul className={styles.rows}>
                    {report.clients.map((client) => (
                      <li key={client.phone}>
                        <button
                          type='button'
                          className={`${styles.row} ${styles.clientRow}`}
                          onClick={() => setOpenPhone(client.phone)}
                        >
                          <span className={styles.rowText}>
                            <span className={styles.rowTitle}>
                              {client.name || formatPhone(client.phone)}
                              {client.isNew && <span className={styles.badge}>{t('New')}</span>}
                            </span>
                            <span className={styles.rowMeta}>
                              {t('{visits} · last {day}', {
                                visits: visits(t, client.visits),
                                day: formatDay(client.lastVisit),
                              })}{' '}
                              · {formatPhone(client.phone)}
                            </span>
                          </span>
                          <span className={styles.rowValue}>{formatMoney(client.revenue)}</span>
                          <CaretRight aria-hidden className={styles.rowChevron} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </section>

            <section className={styles.group} aria-labelledby='analytics-heatmap'>
              <SectionCaption id='analytics-heatmap' isInset={false}>
                {t('Load by hour')}
              </SectionCaption>
              <LoadHeatmap
                cells={report.heatmap}
                hours={business.hours}
                onMakePromotion={makePromotion}
              />
            </section>
          </div>

          <div
            className={styles.pairs}
            data-uneven={
              isUneven(
                report.losses.repeatNoShows.length +
                  (report.losses.noShows.count > 0 ? 1 : 0) +
                  (report.losses.lateCancellations.count > 0 ? 1 : 0),
                2 + (report.sources.branches.length > 1 ? report.sources.branches.length : 0),
              ) || undefined
            }
          >
            <LossesGroup losses={report.losses} onOpenClient={setOpenPhone} />
            <SourcesGroup sources={report.sources} />
          </div>

          <PromotionsGroup promotions={report.promotions} loyalty={report.loyalty} />
        </div>
      )}
      {openMaster && report && (
        <MasterStatsSheet
          master={openMaster}
          comparedLabel={t(COMPARED[report.period.days])}
          sameLabel={t(SAME[report.period.days])}
          slug={slug}
          period={report.period}
          onPayoutsChange={reload}
          onClose={() => setOpenMasterId(null)}
        />
      )}
      {isMailingOpen && (
        <MailingSheet
          slug={slug}
          businessName={business.name}
          onClose={() => setIsMailingOpen(false)}
        />
      )}
      {isGoalOpen && report && (
        <GoalSheet
          goal={report.month.goal}
          monthLabel={report.month.label}
          onSave={saveGoal}
          onClose={() => setIsGoalOpen(false)}
        />
      )}
      {promotionDraft && (
        <PromotionSheet
          promotion={null}
          draft={promotionDraft}
          services={catalog.services}
          onSave={savePromotion}
          onClose={() => setPromotionDraft(null)}
        />
      )}
      {openPhone && (
        <ClientSheet slug={slug} phone={openPhone} onClose={() => setOpenPhone(null)} />
      )}
    </section>
  )
}

// A list scrolls after about six rows; two groups share a row only when what each shows is about
// as tall (a one-row list beside a long one left a hole under it). An empty one counts as one row.
const VISIBLE_ROWS = 6
const HEATMAP_ROWS = 5
const isUneven = (first: number, second: number) => {
  const shown = (count: number) => Math.min(Math.max(count, 1), VISIBLE_ROWS)
  return Math.abs(shown(first) - shown(second)) > 2
}

interface MastersGroupProps {
  masters: AnalyticsReport['masters']
  /** A row opens that master's period. */
  onOpen: (id: string) => void
}

// The team in one list: visits, money, rating, how full their hours were and what they are owed
// by their pay scheme, less what was paid out. Pay used to be a second list of the same people.
const MastersGroup = ({ masters, onOpen }: MastersGroupProps) => {
  const t = useT()
  const { formatMoney } = analyticsFormat(t)
  const paid = masters.filter((master) => master.pay !== null && master.pay.total > 0)
  const due = paid.reduce((sum, master) => sum + (master.pay?.due ?? 0), 0)
  const paidOut = paid.reduce((sum, master) => sum + (master.pay?.paid ?? 0), 0)
  const isPayMissing = masters.some((master) => master.pay === null)

  return (
    <section className={styles.group} aria-labelledby='analytics-masters'>
      <SectionCaption id='analytics-masters' isInset={false}>
        {t('Specialists')} <span className={forms.groupCount}>{masters.length}</span>
      </SectionCaption>
      <ScrollArea
        label={t('Specialists for the period')}
        moreLabel={(count) =>
          t('{count} more', { count: t.count(count, ['specialist', 'specialists']) })
        }
      >
        <ul className={styles.rows}>
          {masters.map((master) => (
            <li key={master.id}>
              <button
                type='button'
                className={`${styles.row} ${styles.clientRow}`}
                onClick={() => onOpen(master.id)}
              >
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{master.name}</span>
                  <span className={styles.rowMeta}>
                    {visits(t, master.visits)} · {formatMoney(master.revenue)}
                    {master.rating !== null &&
                      ` · ★ ${master.rating.toFixed(1).replace('.', ',')} (${master.reviews})`}
                  </span>
                  {master.pay !== null && master.pay.total > 0 && (
                    <PayLine pay={master.pay} percent={master.percent} />
                  )}
                </span>
                <span className={styles.rowValue}>
                  {master.load}%<span className={styles.srOnly}> {t('load')}</span>
                </span>
                <CaretRight aria-hidden className={styles.rowChevron} />
                {master.load > 0 && (
                  <span className={styles.meter} data-tone='load' aria-hidden='true'>
                    <span style={{ width: `${master.load}%` }} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
      <p className={styles.footnote}>
        {paid.length > 0 ? (
          <>
            <Filled
              text={paidOut > 0 ? t('Total due {due}, paid out {paid}.') : t('Total due {due}.')}
              parts={{ due: <b>{formatMoney(due)}</b>, paid: <b>{formatMoney(paidOut)}</b> }}
            />{' '}
            {isPayMissing && `${t('Some specialists have no pay set.')} `}
          </>
        ) : (
          `${t('Set pay on the specialist’s card in “Page”, and what each is owed will show here.')} `
        )}
        {t('Load: the share of working hours taken by visits.')}
      </p>
    </section>
  )
}

interface PayLineProps {
  pay: NonNullable<AnalyticsReport['masters'][number]['pay']>
  percent: number | null
}

// "1,000 som due · 40%" while one percent decides it, "paid out" once it is settled.
const PayLine = ({ pay, percent }: PayLineProps) => {
  const t = useT()
  const { formatMoney } = analyticsFormat(t)
  const plain = plainPercent(pay, percent)
  if (pay.due === 0) {
    return (
      <span className={styles.rowMeta}>
        <Filled text={t('paid out {amount}')} parts={{ amount: <b>{formatMoney(pay.paid)}</b> }} />
      </span>
    )
  }
  return (
    <span className={styles.rowMeta}>
      <Filled text={t('due {amount}')} parts={{ amount: <b>{formatMoney(pay.due)}</b> }} />
      {pay.paid > 0 && ` · ${t('paid out {amount}', { amount: formatMoney(pay.paid) })}`}
      {plain !== null && pay.paid === 0 && ` · ${plain}%`}
    </span>
  )
}

interface PaymentsSplitProps {
  payments: AnalyticsReport['totals']['payments']
}

const PAYMENT_PARTS = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'transfer', label: 'Transfer' },
  { key: 'unmarked', label: 'Not marked' },
] as const

// Where the money came in, as staff marked it: one thin bar of shares and a legend that names
// each with its percent and sum (the rest is counted at the price list).
const PaymentsSplit = ({ payments }: PaymentsSplitProps) => {
  const t = useT()
  const { formatMoney } = analyticsFormat(t)
  const parts = PAYMENT_PARTS.map((part) => ({ ...part, value: payments[part.key] })).filter(
    (part) => part.value > 0,
  )
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  if (total === 0) return null

  return (
    <div className={styles.payments}>
      <span className={styles.label}>{t('How they paid')}</span>
      <span className={styles.paymentsBar} aria-hidden='true'>
        {parts.map((part) => (
          <span key={part.key} data-part={part.key} style={{ flexGrow: part.value }} />
        ))}
      </span>
      <ul className={styles.paymentsLegend}>
        {parts.map((part) => (
          <li key={part.key}>
            <i data-part={part.key} aria-hidden='true' />
            {t(part.label)} <b>{Math.round((part.value / total) * 100)}%</b>
            <span className={styles.muted}>{formatMoney(part.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface ClientsSplitProps {
  newClients: number
  returning: number
}

// Two parts of one whole: a thin segmented bar plus a legend that names and counts both.
const ClientsSplit = ({ newClients, returning }: ClientsSplitProps) => {
  const t = useT()
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
          {t.count(newClients, ['new', 'new'])}
        </span>
        <span>
          <i data-part='returning' aria-hidden='true' />
          {t.count(returning, ['returning', 'returning'])}
        </span>
      </span>
    </span>
  )
}
