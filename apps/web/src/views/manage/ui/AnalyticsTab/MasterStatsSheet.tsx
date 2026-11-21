'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import NextLink from 'next/link'
import { PersonAvatar } from '@/entities/business'
import type { AnalyticsReport } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './AnalyticsTab.module.css'
import { formatMoney } from './analyticsFormat'

interface MasterStatsSheetProps {
  master: AnalyticsReport['masters'][number]
  periodLabel: string
  onClose: () => void
}

const visits = (count: number) => pluralize(count, ['визит', 'визита', 'визитов'])

// One master's period in the quiet profile style: the face, the name, one line of bold facts, how
// it moved against the period before, who comes back to them, what they do most, what they are
// owed; and their day in the schedule one tap away.
export const MasterStatsSheet = ({ master, periodLabel, onClose }: MasterStatsSheetProps) => {
  const change =
    master.previousRevenue > 0
      ? Math.round(((master.revenue - master.previousRevenue) / master.previousRevenue) * 100)
      : null

  return (
    <Sheet title={master.name} onClose={onClose} cancelLabel='Закрыть'>
      <div className={sheet.form}>
        <div className={styles.masterHead}>
          <PersonAvatar name={master.name} size='lg' />
          <p className={styles.masterFacts}>
            <b>{visits(master.visits)}</b> · <b>{formatMoney(master.revenue)}</b> · загрузка{' '}
            <b>{master.load}%</b>
            {master.rating !== null && (
              <>
                {' '}
                · ★ <b>{master.rating.toFixed(1).replace('.', ',')}</b>
              </>
            )}
          </p>
          {change !== null && (
            <p className={styles.masterChange}>
              {change === 0
                ? `Как ${periodLabel}`
                : `${change > 0 ? '+' : '−'}${Math.abs(change)}% к ${periodLabel}`}
            </p>
          )}
        </div>

        <section className={sheet.group} aria-label='Показатели'>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Возвращаются к мастеру</span>
              <span className={styles.sheetValue}>
                {master.retention === null ? 'мало данных' : `${master.retention}%`}
              </span>
            </div>
            {master.payout !== null && master.revenue > 0 && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>К выплате · {master.percent}%</span>
                <span className={styles.sheetValue}>{formatMoney(master.payout)}</span>
              </div>
            )}
            {master.reviews > 0 && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>Отзывы за период</span>
                <span className={styles.sheetValue}>{master.reviews}</span>
              </div>
            )}
          </div>
          <p className={sheet.groupFooter}>
            Возвращаются: клиенты, которые снова записались к этому мастеру в течение 6 недель.
          </p>
        </section>

        {master.topServices.length > 0 && (
          <section className={sheet.group} aria-labelledby='master-top-services'>
            <SectionCaption id='master-top-services'>Чаще всего</SectionCaption>
            <div className={sheet.list}>
              {master.topServices.map((service) => (
                <div key={service.name} className={sheet.row}>
                  <span className={sheet.rowLabel}>{service.name}</span>
                  <span className={styles.sheetValue}>{visits(service.visits)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <ButtonLink
          variant='secondary'
          render={<NextLink href='?tab=schedule' />}
          className={styles.masterSchedule}
        >
          Открыть расписание
        </ButtonLink>
      </div>
    </Sheet>
  )
}
