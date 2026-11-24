'use client'

import { Select } from '@awaisa/ui/Select'
import { useT } from '@/shared/i18n'
import { Container } from '@/shared/ui/Container/Container'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { FloatingToolbar } from '@/shared/ui/FloatingToolbar/FloatingToolbar'
import { ScrollArea } from '@/shared/ui/ScrollArea/ScrollArea'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { CabinetBar } from '@/widgets/CabinetBar'
import {
  CHANNEL_LABELS,
  FILTER_KEYS,
  FLOW_LABELS,
  SEGMENT_LABELS,
  type SegmentKey,
  STEP_LABELS,
  VALUE_LABELS,
} from './config/labels'
import styles from './InsightsPage.module.css'
import { type InitialInsights, type InsightsDays, useInsights } from './model/useInsights'

interface InsightsPageProps {
  initial: InitialInsights
}

const PERIODS: { value: `${InsightsDays}`; label: string }[] = [
  { value: '7', label: 'Week' },
  { value: '30', label: 'Month' },
  { value: '90', label: '3 months' },
]

const ANY = 'any'

const DEVICES: [string, string] = ['device', 'devices']

const BOOKINGS: [string, string] = ['booking', 'bookings']

const formatWeek = (week: string) =>
  new Date(`${week}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

const formatShare = (value: number | null) =>
  `${(value ?? 0).toLocaleString('en-GB', { maximumFractionDigits: 1 })}%`

// A share as a meter on the row's own hairline, as in the cabinet's "Analytics".
const Meter = ({ share }: { share: number | null }) =>
  share ? (
    <span className={styles.meter} aria-hidden>
      <span style={{ width: `${Math.min(share, 100)}%` }} />
    </span>
  ) : null

// Platform admins read the funnels here: where people drop out of each scenario, on which
// devices, and what trips them up - the same codes the telemetry stores, put into words.
export const InsightsPage = ({ initial }: InsightsPageProps) => {
  const t = useT()
  const insights = useInsights(initial)
  const steps = insights.funnel?.steps ?? []
  const started = steps[0]?.sessions ?? 0
  const devices = insights.segments?.sessions ?? 0
  const strategy = insights.strategy
  const online = strategy?.channels.reduce((sum, item) => sum + item.bookings, 0) ?? 0
  const channels = strategy?.channels.filter((item) => item.bookings > 0) ?? []
  const fromFeed = strategy?.channels.find((item) => item.channel === 'feed')?.bookings ?? 0
  const weeks = strategy?.activeBusinesses ?? []
  const thisWeek = weeks.at(-1)?.count ?? 0
  const shareOf = (count: number) =>
    online === 0 ? null : Math.round((count / online) * 1000) / 10
  const dimensions = (Object.keys(SEGMENT_LABELS) as SegmentKey[]).map((key) => ({
    key,
    items: insights.segments?.items.filter((item) => item.dimension === key) ?? [],
  }))

  const finished = steps.at(-1)
  const finishedShare = finished?.fromStart ?? null
  const flowLabel = t(FLOW_LABELS[insights.flow])

  return (
    <>
      <CabinetBar title={t('Funnels')} />
      <main className={styles.page}>
        <Container className={styles.content}>
          {/* Laid out like the cabinet's "Analytics": the hint and the period on one line (the
              period floats at the foot on phones), then everything right on the page, no cards
              (the owner: "like the business's analytics tab"). */}
          <header className={styles.head}>
            <h1 className={styles.srOnly}>{t('Funnels')}</h1>
            <p className={styles.hint}>{t('Where people drop out and on which devices')}</p>
            <FloatingToolbar className={styles.tools}>
              <SegmentedControl
                size='sm'
                label={t('Period')}
                value={`${insights.days}`}
                items={PERIODS.map((period) => ({ ...period, label: t(period.label) }))}
                onChange={(value) => insights.setDays(Number(value) as InsightsDays)}
              />
            </FloatingToolbar>
          </header>

          <div
            className={styles.report}
            data-loading={insights.isLoading || undefined}
            aria-busy={insights.isLoading}
          >
            {strategy && (
              <section className={styles.group} aria-labelledby='insights-strategy'>
                <SectionCaption as='h2' id='insights-strategy' isInset={false}>
                  {t('Strategy')}
                </SectionCaption>
                <dl className={styles.stats}>
                  <div className={styles.stat}>
                    <dt className={styles.statLabel}>{t('Run their day in the cabinet')}</dt>
                    <dd className={styles.statValue}>{thisWeek.toLocaleString('en-GB')}</dd>
                    <dd className={styles.statMeta}>
                      {weeks.length > 1
                        ? t('By week: {counts}, since {date}', {
                            counts: weeks.map((week) => week.count).join(' · '),
                            date: formatWeek(weeks[0].week),
                          })
                        : t('Places that marked a visit’s outcome this week')}
                    </dd>
                  </div>
                  <div className={styles.stat}>
                    <dt className={styles.statLabel}>{t('Started in "Looks"')}</dt>
                    <dd className={styles.statValue}>{fromFeed.toLocaleString('en-GB')}</dd>
                    <dd className={styles.statMeta}>
                      {online
                        ? `${formatShare(shareOf(fromFeed))} · ${t('Of {bookings} online', {
                            bookings: t.count(online, BOOKINGS),
                          })}`
                        : t('No online bookings yet')}
                    </dd>
                  </div>
                  <div className={styles.stat}>
                    <dt className={styles.statLabel}>{t('Booked again')}</dt>
                    <dd className={styles.statValue}>{formatShare(strategy.repeat.share)}</dd>
                    <dd className={styles.statMeta}>
                      {strategy.repeat.clients
                        ? t('{returned} of {clients} new clients, within 60 days', {
                            returned: strategy.repeat.returned,
                            clients: strategy.repeat.clients,
                          })
                        : t('60 days have not passed for new clients yet')}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {/* The funnel: which scenario, the one number it leads with (how many got to the
                end), the device cuts, then its steps with their share on the row's hairline. */}
            <section className={styles.funnel} aria-labelledby='insights-steps'>
              <TextTabs
                label={t('Scenario')}
                items={(Object.keys(FLOW_LABELS) as (keyof typeof FLOW_LABELS)[]).map((flow) => ({
                  label: t(FLOW_LABELS[flow]),
                  isActive: insights.flow === flow,
                  onSelect: () => insights.setFlow(flow),
                }))}
              />

              <div className={styles.hero}>
                <div className={styles.heroHead}>
                  <span className={styles.label} id='insights-steps'>
                    {t('Reached the end')}
                  </span>
                  <span className={styles.heroValue}>
                    {formatShare(started ? finishedShare : 0)}
                  </span>
                  <span className={styles.heroMeta}>
                    {started
                      ? t('{finished} of {started} · {flow}', {
                          finished: (finished?.sessions ?? 0).toLocaleString('en-GB'),
                          started: t.count(started, DEVICES),
                          flow: flowLabel.toLowerCase(),
                        })
                      : flowLabel}
                  </span>
                </div>
                <dl className={styles.filters}>
                  {FILTER_KEYS.map((key) => (
                    <div key={key} className={styles.filter}>
                      <dt className={styles.filterLabel}>{t(SEGMENT_LABELS[key].title)}</dt>
                      <dd className={styles.filterValue}>
                        <Select
                          variant='plain'
                          aria-label={t(SEGMENT_LABELS[key].title)}
                          value={insights.segment[key] ?? ANY}
                          items={[
                            { value: ANY, label: t('All') },
                            ...Object.entries(SEGMENT_LABELS[key].values).map(([value, label]) => ({
                              value,
                              label: t(label),
                            })),
                          ]}
                          onValueChange={(value) =>
                            insights.setFilter(key, value && value !== ANY ? String(value) : null)
                          }
                        />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {insights.error ? (
                <EmptyState variant='inline' text={insights.error} />
              ) : started === 0 ? (
                <EmptyState
                  variant='inline'
                  text={t(
                    'No such devices in this period: pick another period or clear the filter.',
                  )}
                />
              ) : (
                <ol className={styles.rows}>
                  {steps.map((row, index) => (
                    <li key={row.step} className={styles.row}>
                      <span className={styles.rowText}>
                        <span className={styles.rowTitle}>{t(STEP_LABELS[row.step])}</span>
                        <span className={styles.rowMeta}>
                          {index === 0
                            ? t('Start')
                            : row.fromPrevious === null
                              ? t('Didn’t reach the previous step')
                              : t('{share} of the previous step', {
                                  share: formatShare(row.fromPrevious),
                                })}
                        </span>
                      </span>
                      <span className={styles.rowValue}>
                        {row.sessions.toLocaleString('en-GB')}
                        <span className={styles.rowShare}>{formatShare(row.fromStart)}</span>
                      </span>
                      <Meter share={row.fromStart} />
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <div className={styles.pairs}>
              <section className={styles.group} aria-labelledby='insights-signals'>
                <SectionCaption as='h2' id='insights-signals' isInset={false}>
                  {t('Where people stumble')}
                </SectionCaption>
                {insights.signals?.items.length ? (
                  <ScrollArea
                    label={t('Where people stumble')}
                    moreLabel={(count) => t('{count} more', { count })}
                  >
                    <ul className={styles.rows}>
                      {insights.signals.items.map((item) => (
                        <li key={`${item.step}-${item.value}`} className={styles.row}>
                          <span className={styles.rowText}>
                            <span className={styles.rowTitle}>{t(STEP_LABELS[item.step])}</span>
                            {item.value && (
                              <span className={styles.rowMeta}>
                                {t(VALUE_LABELS[item.value] ?? item.value)}
                              </span>
                            )}
                          </span>
                          <span className={styles.rowValue}>
                            {item.sessions.toLocaleString('en-GB')}
                            <span className={styles.rowShare}>
                              {t.count(item.count, ['time', 'times'])}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                ) : (
                  <EmptyState
                    variant='inline'
                    text={t('No field errors or failures in this period.')}
                  />
                )}
              </section>

              {channels.length > 0 && (
                <section className={styles.group} aria-labelledby='insights-channels'>
                  <SectionCaption as='h2' id='insights-channels' isInset={false}>
                    {t('Where bookings come from')}
                    <span className={styles.count}>{t.count(online, BOOKINGS)}</span>
                  </SectionCaption>
                  <ul className={styles.rows}>
                    {channels.map((item) => {
                      const share = shareOf(item.bookings)
                      return (
                        <li key={item.channel} className={styles.row}>
                          <span className={styles.rowTitle}>{t(CHANNEL_LABELS[item.channel])}</span>
                          <span className={styles.rowValue}>
                            {item.bookings.toLocaleString('en-GB')}
                            <span className={styles.rowShare}>{formatShare(share)}</span>
                          </span>
                          <Meter share={share} />
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
            </div>

            <section className={styles.group} aria-labelledby='insights-devices'>
              <SectionCaption as='h2' id='insights-devices' isInset={false}>
                {t('Who comes')}
                <span className={styles.count}>{devices ? t.count(devices, DEVICES) : null}</span>
              </SectionCaption>
              {devices === 0 ? (
                <EmptyState variant='inline' text={t('No device data yet.')} />
              ) : (
                <div className={styles.dimensions}>
                  {dimensions.map(({ key, items }) => (
                    <div key={key} className={styles.dimension}>
                      <h3 className={styles.dimensionTitle}>{t(SEGMENT_LABELS[key].title)}</h3>
                      <ul className={styles.rows}>
                        {items.map((item) => {
                          const share = Math.round((item.sessions / devices) * 1000) / 10
                          return (
                            <li key={item.value} className={styles.row}>
                              <span className={styles.rowTitle}>
                                {t(SEGMENT_LABELS[key].values[item.value] ?? item.value)}
                              </span>
                              <span className={styles.rowValue}>
                                {item.sessions.toLocaleString('en-GB')}
                                <span className={styles.rowShare}>{formatShare(share)}</span>
                              </span>
                              <Meter share={share} />
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </Container>
      </main>
    </>
  )
}
