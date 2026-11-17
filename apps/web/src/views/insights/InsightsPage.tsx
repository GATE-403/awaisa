'use client'

import { Select } from '@awaisa/ui/Select'
import type { CSSProperties } from 'react'
import { pluralize } from '@/shared/lib/plural'
import { Container } from '@/shared/ui/Container/Container'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { CabinetBar } from '@/widgets/CabinetBar'
import {
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
  { value: '7', label: 'Неделя' },
  { value: '30', label: 'Месяц' },
  { value: '90', label: '3 месяца' },
]

const ANY = 'any'

const devicesText = (count: number) => pluralize(count, ['устройство', 'устройства', 'устройств'])

const formatShare = (value: number | null) =>
  value === null ? '—' : `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`

// Platform admins read the funnels here: where people drop out of each scenario, on which
// devices, and what trips them up — the same codes the telemetry stores, put into words.
export const InsightsPage = ({ initial }: InsightsPageProps) => {
  const insights = useInsights(initial)
  const steps = insights.funnel?.steps ?? []
  const started = steps[0]?.sessions ?? 0
  const devices = insights.segments?.sessions ?? 0
  const dimensions = (Object.keys(SEGMENT_LABELS) as SegmentKey[]).map((key) => ({
    key,
    items: insights.segments?.items.filter((item) => item.dimension === key) ?? [],
  }))

  return (
    <>
      <CabinetBar title='Воронки' />
      <main className={styles.page}>
        <Container size='md' className={styles.content}>
          <PageTitle title='Воронки.' subtitle=' Где люди бросают и на каких устройствах.' />

          <div className={styles.controls}>
            <TextTabs
              label='Сценарий'
              items={(Object.keys(FLOW_LABELS) as (keyof typeof FLOW_LABELS)[]).map((flow) => ({
                label: FLOW_LABELS[flow],
                isActive: insights.flow === flow,
                onSelect: () => insights.setFlow(flow),
              }))}
            />
            <SegmentedControl
              label='Период'
              value={`${insights.days}`}
              items={PERIODS}
              onChange={(value) => insights.setDays(Number(value) as InsightsDays)}
            />
            <div className={styles.group}>
              {FILTER_KEYS.map((key) => (
                <div key={key} className={styles.filterRow}>
                  <span className={styles.filterLabel}>{SEGMENT_LABELS[key].title}</span>
                  <Select
                    variant='plain'
                    aria-label={SEGMENT_LABELS[key].title}
                    value={insights.segment[key] ?? ANY}
                    items={[
                      { value: ANY, label: 'Все' },
                      ...Object.entries(SEGMENT_LABELS[key].values).map(([value, label]) => ({
                        value,
                        label,
                      })),
                    ]}
                    onValueChange={(value) =>
                      insights.setFilter(key, value && value !== ANY ? String(value) : null)
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <section aria-labelledby='insights-steps' aria-busy={insights.isLoading}>
            <SectionCaption id='insights-steps'>
              Шаги
              <span className={styles.count}>{started ? devicesText(started) : null}</span>
            </SectionCaption>
            {insights.error ? (
              <EmptyState variant='inline' text={insights.error} />
            ) : started === 0 ? (
              <EmptyState
                variant='inline'
                text='За этот период таких устройств здесь не было — выберите другой период или уберите отбор.'
              />
            ) : (
              <ol className={styles.list} data-loading={insights.isLoading || undefined}>
                {steps.map((row, index) => (
                  <li key={row.step} className={styles.row}>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{STEP_LABELS[row.step]}</span>
                      <span className={styles.rowMeta}>
                        {index === 0
                          ? 'Начало'
                          : row.fromPrevious === null
                            ? 'До прошлого шага не дошли'
                            : `${formatShare(row.fromPrevious)} от прошлого шага`}
                      </span>
                    </span>
                    <span className={styles.rowValue}>
                      {row.sessions.toLocaleString('ru-RU')}
                      <span className={styles.rowShare}>{formatShare(row.fromStart)}</span>
                    </span>
                    <span
                      className={styles.meter}
                      style={{ '--share': `${row.fromStart ?? 0}%` } as CSSProperties}
                      aria-hidden
                    />
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby='insights-signals'>
            <SectionCaption id='insights-signals'>Где спотыкаются</SectionCaption>
            {insights.signals?.items.length ? (
              <ul className={styles.list}>
                {insights.signals.items.map((item) => (
                  <li key={`${item.step}-${item.value}`} className={styles.row}>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{STEP_LABELS[item.step]}</span>
                      {item.value && (
                        <span className={styles.rowMeta}>
                          {VALUE_LABELS[item.value] ?? item.value}
                        </span>
                      )}
                    </span>
                    <span className={styles.rowValue}>
                      {item.sessions.toLocaleString('ru-RU')}
                      <span className={styles.rowShare}>
                        {pluralize(item.count, ['раз', 'раза', 'раз'])}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState variant='inline' text='Ошибок в полях и сбоев за этот период нет.' />
            )}
          </section>

          <section aria-labelledby='insights-devices'>
            <SectionCaption id='insights-devices'>
              Кто приходит
              <span className={styles.count}>{devices ? devicesText(devices) : null}</span>
            </SectionCaption>
            {devices === 0 ? (
              <EmptyState variant='inline' text='Пока нет данных об устройствах.' />
            ) : (
              <div className={styles.dimensions}>
                {dimensions.map(({ key, items }) => (
                  <div key={key} className={styles.dimension}>
                    <h4 className={styles.dimensionTitle}>{SEGMENT_LABELS[key].title}</h4>
                    <ul className={styles.list}>
                      {items.map((item) => {
                        const share = Math.round((item.sessions / devices) * 1000) / 10
                        return (
                          <li key={item.value} className={styles.row}>
                            <span className={styles.rowTitle}>
                              {SEGMENT_LABELS[key].values[item.value] ?? item.value}
                            </span>
                            <span className={styles.rowValue}>
                              {item.sessions.toLocaleString('ru-RU')}
                              <span className={styles.rowShare}>{formatShare(share)}</span>
                            </span>
                            <span
                              className={styles.meter}
                              style={{ '--share': `${share}%` } as CSSProperties}
                              aria-hidden
                            />
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Container>
      </main>
    </>
  )
}
