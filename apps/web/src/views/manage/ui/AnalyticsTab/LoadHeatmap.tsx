import type { AnalyticsReport, WorkingDay } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import styles from './AnalyticsTab.module.css'

interface LoadHeatmapProps {
  cells: AnalyticsReport['heatmap']
  hours: WorkingDay[]
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const STEPS = 4

const visitsLabel = (count: number) => pluralize(count, ['визит', 'визита', 'визитов'])

// Weekday × hour: one hue, light → dark (sequential). The busiest hour is spelled out
// above the grid, so the headline never depends on reading a colour.
export const LoadHeatmap = ({ cells, hours }: LoadHeatmapProps) => {
  const opens = Math.floor(Math.min(...hours.map((day) => day.opensMinutes), 10 * 60) / 60)
  const closes = Math.ceil(Math.max(...hours.map((day) => day.closesMinutes), 20 * 60) / 60)
  const columns = Array.from({ length: Math.max(closes - opens, 1) }, (_, index) => opens + index)
  const byCell = new Map(cells.map((cell) => [`${cell.weekday}:${cell.hour}`, cell.visits]))
  const max = Math.max(1, ...cells.map((cell) => cell.visits))
  const peak = cells.reduce<AnalyticsReport['heatmap'][number] | null>(
    (best, cell) => (!best || cell.visits > best.visits ? cell : best),
    null,
  )

  return (
    <div className={styles.heatmapWrap}>
      <p className={styles.cardHint}>
        {peak
          ? `Пик — ${WEEKDAYS[peak.weekday]}, ${peak.hour}:00–${peak.hour + 1}:00 · ${visitsLabel(peak.visits)}`
          : 'Визитов пока нет — карта заполнится по мере записей'}
      </p>
      <div className={styles.heatmapScroll}>
        <table
          className={styles.heatmap}
          style={{ '--heatmap-columns': columns.length } as React.CSSProperties}
        >
          <caption className={styles.srOnly}>Визиты по дням недели и часам</caption>
          <thead>
            <tr>
              <td />
              {columns.map((hour) => (
                <th key={hour} scope='col' className={styles.heatmapHour}>
                  {hour % 2 === 0 ? hour : <span className={styles.srOnly}>{hour}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((weekday, weekdayIndex) => (
              <tr key={weekday}>
                <th scope='row' className={styles.heatmapDay}>
                  {weekday}
                </th>
                {columns.map((hour) => {
                  const visits = byCell.get(`${weekdayIndex}:${hour}`) ?? 0
                  const level = visits === 0 ? 0 : Math.ceil((visits / max) * STEPS)
                  return (
                    <td
                      key={hour}
                      className={styles.heatmapCell}
                      data-level={level}
                      title={`${weekday}, ${hour}:00 — ${visitsLabel(visits)}`}
                    >
                      <span className={styles.srOnly}>{visitsLabel(visits)}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.scale} aria-hidden='true'>
        <span>Меньше</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className={styles.heatmapCell} data-level={level} />
        ))}
        <span>Больше</span>
      </div>
    </div>
  )
}
