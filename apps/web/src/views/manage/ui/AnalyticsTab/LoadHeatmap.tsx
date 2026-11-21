'use client'

import { CaretRight } from '@phosphor-icons/react/ssr'
import { type KeyboardEvent, useRef, useState } from 'react'
import type { AnalyticsReport, WorkingDay } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import styles from './AnalyticsTab.module.css'

interface LoadHeatmapProps {
  cells: AnalyticsReport['heatmap']
  hours: WorkingDay[]
  /** The picked hour turned into a happy-hours promotion (shown for quiet hours). */
  onMakePromotion?: (cell: Cell) => void
}

type Cell = { weekday: number; hour: number }

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const STEPS = 4

const visitsLabel = (count: number) => pluralize(count, ['визит', 'визита', 'визитов'])
const span = (hour: number) => `${hour}:00–${hour + 1}:00`

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

// Weekday × hour: one hue, light → dark (sequential), and something to explore rather than a
// picture («больше интерактивности, а не как декор»): pointing at an hour, tapping it or moving
// with the arrows reads it out in the line above (the busiest hour stays beside it to compare),
// rings the cell and lights its day and hour. With nothing picked the line names the peak, so the
// headline never depends on reading a colour.
export const LoadHeatmap = ({ cells, hours, onMakePromotion }: LoadHeatmapProps) => {
  const [hovered, setHovered] = useState<Cell | null>(null)
  const [picked, setPicked] = useState<Cell | null>(null)
  const gridRef = useRef<HTMLTableElement>(null)
  const opens = Math.floor(Math.min(...hours.map((day) => day.opensMinutes), 10 * 60) / 60)
  const closes = Math.ceil(Math.max(...hours.map((day) => day.closesMinutes), 20 * 60) / 60)
  const columns = Array.from({ length: Math.max(closes - opens, 1) }, (_, index) => opens + index)
  const byCell = new Map(cells.map((cell) => [`${cell.weekday}:${cell.hour}`, cell.visits]))
  const visitsAt = (cell: Cell) => byCell.get(`${cell.weekday}:${cell.hour}`) ?? 0
  const max = Math.max(1, ...cells.map((cell) => cell.visits))
  const peak = cells.reduce<AnalyticsReport['heatmap'][number] | null>(
    (best, cell) => (!best || cell.visits > best.visits ? cell : best),
    null,
  )
  const active = hovered ?? picked
  // One Tab stop for the whole grid: the picked cell, else the peak, else the first.
  const anchor = picked ??
    (peak ? { weekday: peak.weekday, hour: peak.hour } : null) ?? {
      weekday: 0,
      hour: columns[0] ?? opens,
    }
  const isPeak = (cell: Cell) => peak?.weekday === cell.weekday && peak.hour === cell.hour

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, cell: Cell) => {
    const step = ARROWS[event.key]
    if (!step) return
    event.preventDefault()
    const weekday = Math.min(6, Math.max(0, cell.weekday + step[0]))
    const column = Math.min(columns.length - 1, Math.max(0, columns.indexOf(cell.hour) + step[1]))
    const next = { weekday, hour: columns[column] ?? cell.hour }
    setPicked(next)
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-cell="${next.weekday}:${next.hour}"]`)
      ?.focus()
  }

  if (!peak) {
    return <p className={styles.cardHint}>Визитов пока нет, карта заполнится по мере записей</p>
  }

  return (
    <div className={styles.heatmapWrap}>
      <p className={styles.cardHint} aria-live='polite'>
        {active ? (
          <>
            {WEEKDAYS[active.weekday]}, {span(active.hour)} · {visitsLabel(visitsAt(active))}
            {!isPeak(active) && (
              <span className={styles.hintMuted}>
                {' '}
                · пик {WEEKDAYS[peak.weekday]} {peak.hour}:00, {visitsLabel(peak.visits)}
              </span>
            )}
          </>
        ) : (
          <>
            Пик: {WEEKDAYS[peak.weekday]}, {span(peak.hour)} · {visitsLabel(peak.visits)}
            <span className={styles.hintMuted}> · наведите на час</span>
          </>
        )}
      </p>
      {/* A picked hour that is quiet (under half the peak) can be filled with a promotion. */}
      {onMakePromotion && picked && visitsAt(picked) < peak.visits / 2 && (
        <button
          type='button'
          className={styles.heatmapAction}
          onClick={() => onMakePromotion(picked)}
        >
          Скидка на {WEEKDAYS[picked.weekday]} {span(picked.hour)}, чтобы заполнить час
          <CaretRight weight='bold' aria-hidden />
        </button>
      )}
      <div className={styles.heatmapScroll}>
        <table
          ref={gridRef}
          className={styles.heatmap}
          style={{ '--heatmap-columns': columns.length } as React.CSSProperties}
          onMouseLeave={() => setHovered(null)}
        >
          <caption className={styles.srOnly}>Визиты по дням недели и часам</caption>
          <thead>
            <tr>
              <td />
              {columns.map((hour) => {
                const isActive = active?.hour === hour
                return (
                  <th
                    key={hour}
                    scope='col'
                    className={styles.heatmapHour}
                    data-active={isActive || undefined}
                  >
                    {/* Every other hour is written, and the picked one always. */}
                    {hour % 2 === 0 || isActive ? (
                      hour
                    ) : (
                      <span className={styles.srOnly}>{hour}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((weekday, weekdayIndex) => (
              <tr key={weekday}>
                <th
                  scope='row'
                  className={styles.heatmapDay}
                  data-active={active?.weekday === weekdayIndex || undefined}
                >
                  {weekday}
                </th>
                {columns.map((hour) => {
                  const cell = { weekday: weekdayIndex, hour }
                  const visits = visitsAt(cell)
                  const level = visits === 0 ? 0 : Math.ceil((visits / max) * STEPS)
                  const isAnchor = anchor.weekday === weekdayIndex && anchor.hour === hour
                  return (
                    <td key={hour} className={styles.heatmapSlot}>
                      <button
                        type='button'
                        className={styles.heatmapCell}
                        data-level={level}
                        data-cell={`${weekdayIndex}:${hour}`}
                        aria-pressed={picked?.weekday === weekdayIndex && picked.hour === hour}
                        aria-label={`${weekday}, ${span(hour)}: ${visitsLabel(visits)}`}
                        tabIndex={isAnchor ? 0 : -1}
                        onMouseEnter={() => setHovered(cell)}
                        onFocus={() => setPicked(cell)}
                        onClick={() => setPicked(cell)}
                        onKeyDown={(event) => handleKeyDown(event, cell)}
                      />
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

export type { Cell as HeatmapCell }
