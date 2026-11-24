'use client'

import { Input } from '@awaisa/ui/Input'
import {
  CalendarBlank,
  CaretRight,
  CircleDashed,
  Package,
  UserMinus,
} from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type FormEvent, type ReactNode, useState } from 'react'
import type { AnalyticsReport } from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
import { formatPhone } from '@/shared/lib/formatPhone'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import forms from '@/views/manage/ui/manageForms.module.css'
import styles from './AnalyticsTab.module.css'
import { analyticsFormat } from './analyticsFormat'
import { Filled } from './Filled'

const visits = (t: Translate, count: number) => t.count(count, ['visit', 'visits'])

interface AttentionRowProps {
  icon: ReactNode
  tone: 'orange' | 'blue' | 'red' | 'gray'
  title: ReactNode
  detail?: string
  /** What the row does, said at its end: «Отметить», «Позвать». */
  actionLabel: string
  href?: string
  onClick?: () => void
}

// One thing to do, the whole row one tap target: a thin glyph in its colour (no tinted disc: «плохой
// вариант»), what it is, and the action named at the end with a chevron.
const AttentionRow = ({
  icon,
  tone,
  title,
  detail,
  actionLabel,
  href,
  onClick,
}: AttentionRowProps) => {
  const content = (
    <>
      <span className={styles.attentionIcon} data-tone={tone} aria-hidden='true'>
        {icon}
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        {detail && <span className={styles.rowMeta}>{detail}</span>}
      </span>
      <span className={styles.attentionAction}>
        {actionLabel}
        <CaretRight aria-hidden />
      </span>
    </>
  )

  return (
    <li>
      {href ? (
        <NextLink className={styles.attentionRow} href={href}>
          {content}
        </NextLink>
      ) : (
        <button type='button' className={styles.attentionRow} onClick={onClick}>
          {content}
        </button>
      )}
    </li>
  )
}

interface AttentionListProps {
  attention: AnalyticsReport['attention']
  onCallBack: () => void
}

// What needs the owner today, each with the one action it asks for: unmarked visits to the day
// they are on, clients who stopped coming to the mailing that calls them back, tomorrow's free time
// to the day itself, stock running out to the stock. Nothing to do, nothing drawn.
const AttentionList = ({ attention, onCallBack }: AttentionListProps) => {
  const t = useT()
  const { formatDay } = analyticsFormat(t)
  const { unmarked, lapsed, freeTomorrow, lowStock } = attention
  const isFreeTomorrow = freeTomorrow !== null && freeTomorrow.minutes >= 60
  if (unmarked.count === 0 && lapsed.count === 0 && !isFreeTomorrow && lowStock.count === 0) {
    return null
  }
  const restStock = lowStock.count - lowStock.names.length

  return (
    <section className={styles.group} aria-labelledby='analytics-attention'>
      <SectionCaption id='analytics-attention' isInset={false}>
        {t('Needs attention')}
      </SectionCaption>
      <ul className={styles.rows}>
        {unmarked.count > 0 && (
          <AttentionRow
            icon={<CircleDashed />}
            tone='orange'
            title={t('{visits} unmarked', { visits: visits(t, unmarked.count) })}
            detail={
              unmarked.firstDate
                ? t('since {day}', { day: formatDay(unmarked.firstDate) })
                : undefined
            }
            actionLabel={t('Mark')}
            href={`?tab=schedule${unmarked.firstDate ? `&date=${unmarked.firstDate}` : ''}`}
          />
        )}
        {lapsed.count > 0 && (
          <AttentionRow
            icon={<UserMinus />}
            tone='red'
            title={t('{clients} not seen for a while', {
              clients: t.count(lapsed.count, ['client', 'clients']),
            })}
            detail={t('over {days} days', { days: lapsed.days })}
            actionLabel={t('Invite back')}
            onClick={onCallBack}
          />
        )}
        {freeTomorrow && isFreeTomorrow && (
          <AttentionRow
            icon={<CalendarBlank />}
            tone='blue'
            title={t('Free tomorrow ≈ {hours}', {
              hours: t.duration(Math.round(freeTomorrow.minutes / 60) * 60),
            })}
            detail={t('share your free times')}
            actionLabel={t('Open the day')}
            href={`?tab=schedule&date=${freeTomorrow.date}`}
          />
        )}
        {lowStock.count > 0 && (
          <AttentionRow
            icon={<Package />}
            tone='gray'
            title={
              restStock > 0
                ? t('Running low: {names} and {count} more', {
                    names: lowStock.names.join(', '),
                    count: restStock,
                  })
                : t('Running low: {names}', { names: lowStock.names.join(', ') })
            }
            actionLabel={t('Stock')}
            href='?tab=stock'
          />
        )}
      </ul>
    </section>
  )
}

interface ChangeReasonsProps {
  totals: AnalyticsReport['totals']
  masters: AnalyticsReport['masters']
}

const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}%`

// Why the money moved, in one line under the change: visits and the average check (revenue is
// their product), and the master whose money moved the most.
const ChangeReasons = ({ totals, masters }: ChangeReasonsProps) => {
  const t = useT()
  if (totals.revenueChange === null || totals.revenueChange === 0) return null
  const parts: string[] = []
  if (totals.visitsChange !== null) {
    parts.push(t('visits {change}', { change: signed(totals.visitsChange) }))
  }
  if (totals.averageCheckChange !== null) {
    parts.push(t('average bill {change}', { change: signed(totals.averageCheckChange) }))
  }
  const mover = masters
    .filter((master) => master.previousRevenue > 0)
    .map((master) => ({
      name: master.name.split(' ')[0] ?? master.name,
      delta: master.revenue - master.previousRevenue,
      change: Math.round(
        ((master.revenue - master.previousRevenue) / master.previousRevenue) * 100,
      ),
    }))
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))[0]
  if (mover && mover.change !== 0) {
    parts.push(t('most of all {name} {change}', { name: mover.name, change: signed(mover.change) }))
  }
  if (parts.length === 0) return null

  return <p className={styles.reasons}>{parts.join(' · ')}</p>
}

interface GoalLineProps {
  month: AnalyticsReport['month']
  onEdit: () => void
}

// The month against the owner's goal: how far, and where this pace ends; one quiet line and a
// thin bar, no widget. Without a goal, one link sets it.
const GoalLine = ({ month, onEdit }: GoalLineProps) => {
  const t = useT()
  const { formatMoney } = analyticsFormat(t)
  if (month.goal === null) {
    return (
      <button type='button' className={styles.goalSet} onClick={onEdit}>
        {t('Set a goal for {month}', { month: month.label })}
        <CaretRight aria-hidden />
      </button>
    )
  }
  const share = Math.round((month.revenue / month.goal) * 100)
  const isReached = month.revenue >= month.goal
  const isOnPace = month.projected >= month.goal

  return (
    <div className={styles.goal}>
      <div className={styles.goalHead}>
        <p className={styles.goalText}>
          <Filled
            text={t('Goal for {month}: {share} · {revenue} of {goal}', {
              month: month.label,
              revenue: formatMoney(month.revenue),
              goal: formatMoney(month.goal),
            })}
            parts={{ share: <b>{share}%</b> }}
          />
          <span className={styles.muted}>
            {' · '}
            {isReached
              ? t('goal reached')
              : isOnPace
                ? t('at this pace {amount}', { amount: formatMoney(month.projected) })
                : t('at this pace {amount}, {missing} short', {
                    amount: formatMoney(month.projected),
                    missing: formatMoney(month.goal - month.projected),
                  })}
          </span>
        </p>
        <button type='button' className={styles.goalEdit} onClick={onEdit}>
          {t('Change')}
        </button>
      </div>
      <span className={styles.goalBar} data-on-pace={isOnPace || undefined} aria-hidden='true'>
        <span style={{ width: `${Math.min(100, share)}%` }} />
      </span>
    </div>
  )
}

interface GoalSheetProps {
  goal: number | null
  monthLabel: string
  onSave: (goal: number | null) => Promise<void>
  onClose: () => void
}

const GOAL_FORM = 'analytics-goal'

// The month's revenue goal: one amount, and «Убрать цель» when there is one.
const GoalSheet = ({ goal, monthLabel, onSave, onClose }: GoalSheetProps) => {
  const t = useT()
  const [value, setValue] = useState(goal ? maskAmountInput(String(goal)) : '')
  const [isSaving, setIsSaving] = useState(false)
  const amount = Number(value.replace(/\D/g, ''))
  const canSave = amount >= 1000 && !isSaving

  const save = async (next: number | null) => {
    setIsSaving(true)
    try {
      await onSave(next)
      onClose()
    } catch {
      // The toast has said what went wrong.
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (canSave) void save(amount)
  }

  return (
    <Sheet
      title={t('Monthly goal')}
      onClose={onClose}
      action={{ label: t('Done'), form: GOAL_FORM, disabled: !canSave }}
    >
      <form id={GOAL_FORM} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label={t('Goal')}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>
                {t('Revenue for {month}', { month: monthLabel })}
              </span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('Revenue goal, som')}
                  inputMode='numeric'
                  placeholder='400 000'
                  value={value}
                  onValueChange={(next) => setValue(maskAmountInput(next.replace(/\D/g, '')))}
                  autoFocus
                />
                <span className={sheet.suffix}>{t('som')}</span>
              </span>
            </label>
          </div>
          <p className={sheet.groupFooter}>
            {t(
              'Analytics will show how much you have and whether the current pace will get you there by the end of the month.',
            )}
          </p>
        </section>
        {goal !== null && (
          <div className={sheet.list}>
            <button
              type='button'
              className={`${sheet.row} ${sheet.danger}`}
              onClick={() => void save(null)}
              disabled={isSaving}
            >
              {t('Remove goal')}
            </button>
          </div>
        )}
      </form>
    </Sheet>
  )
}

interface LossesGroupProps {
  losses: AnalyticsReport['losses']
  onOpenClient: (phone: string) => void
}

// Money that did not come: no-shows and late cancellations in som, and who keeps not coming, each
// opening their card; the footnote names what prevents it (a deposit on booking online).
const LossesGroup = ({ losses, onOpenClient }: LossesGroupProps) => {
  const t = useT()
  const { formatMoney } = analyticsFormat(t)
  const total = losses.noShows.amount + losses.lateCancellations.amount
  if (total === 0 && losses.repeatNoShows.length === 0) return null

  return (
    <section className={styles.group} aria-labelledby='analytics-losses'>
      <SectionCaption id='analytics-losses' isInset={false}>
        {t('Losses')} <span className={forms.groupCount}>{formatMoney(total)}</span>
      </SectionCaption>
      <ul className={styles.rows}>
        {losses.noShows.count > 0 && (
          <li className={styles.row}>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>{t('No-shows')}</span>
              <span className={styles.rowMeta}>{visits(t, losses.noShows.count)}</span>
            </span>
            <span className={styles.rowValue}>{formatMoney(losses.noShows.amount)}</span>
          </li>
        )}
        {losses.lateCancellations.count > 0 && (
          <li className={styles.row}>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>{t('Late cancellations')}</span>
              <span className={styles.rowMeta}>
                {t('{visits} cancelled less than a day ahead', {
                  visits: visits(t, losses.lateCancellations.count),
                })}
              </span>
            </span>
            <span className={styles.rowValue}>{formatMoney(losses.lateCancellations.amount)}</span>
          </li>
        )}
        {losses.repeatNoShows.map((client) => (
          <li key={client.phone}>
            <button
              type='button'
              className={`${styles.row} ${styles.clientRow}`}
              onClick={() => onOpenClient(client.phone)}
            >
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{client.name || formatPhone(client.phone)}</span>
                <span className={styles.rowMeta}>
                  {t('no-show {times} in six months', {
                    times: t.count(client.count, ['time', 'times']),
                  })}{' '}
                  · {formatPhone(client.phone)}
                </span>
              </span>
              <CaretRight aria-hidden className={styles.rowChevron} />
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.footnote}>
        <Filled
          text={t('A deposit on online bookings protects against no-shows: {link}.')}
          parts={{
            link: (
              <NextLink className={styles.footnoteLink} href='?tab=services'>
                {t('turn it on in services')}
              </NextLink>
            ),
          }}
        />
      </p>
    </section>
  )
}

interface SourcesGroupProps {
  sources: AnalyticsReport['sources']
}

const SOURCE_PARTS = [
  { key: 'online', label: 'Online' },
  { key: 'staff', label: 'Administrator' },
  { key: 'import', label: 'Import' },
] as const

// Where the period's visits were booked: online by the clients themselves, by the staff, imported;
// and per branch when there are several.
const SourcesGroup = ({ sources }: SourcesGroupProps) => {
  const t = useT()
  const { formatMoney } = analyticsFormat(t)
  const parts = SOURCE_PARTS.map((part) => ({ ...part, value: sources[part.key] })).filter(
    (part) => part.value > 0,
  )
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  if (total === 0) return null

  return (
    <section className={styles.group} aria-labelledby='analytics-sources'>
      <SectionCaption id='analytics-sources' isInset={false}>
        {t('Where bookings come from')}
      </SectionCaption>
      <div className={styles.payments}>
        <span className={styles.paymentsBar} aria-hidden='true'>
          {parts.map((part) => (
            <span key={part.key} data-source={part.key} style={{ flexGrow: part.value }} />
          ))}
        </span>
        <ul className={styles.paymentsLegend}>
          {parts.map((part) => (
            <li key={part.key}>
              <i data-source={part.key} aria-hidden='true' />
              {t(part.label)} <b>{Math.round((part.value / total) * 100)}%</b>
              <span className={styles.muted}>{visits(t, part.value)}</span>
            </li>
          ))}
        </ul>
      </div>
      {sources.branches.length > 1 && (
        <ul className={styles.rows}>
          {sources.branches.map((branch) => (
            <li key={branch.id} className={styles.row}>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{branch.name}</span>
                <span className={styles.rowMeta}>{visits(t, branch.visits)}</span>
              </span>
              <span className={styles.rowValue}>{formatMoney(branch.revenue)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface PromotionsGroupProps {
  promotions: AnalyticsReport['promotions']
  loyalty: AnalyticsReport['loyalty']
}

// What each promotion brought against what it gave away, and what loyalty paid for; nothing when
// none of it was used in the period.
const PromotionsGroup = ({ promotions, loyalty }: PromotionsGroupProps) => {
  const t = useT()
  const { formatMoney } = analyticsFormat(t)
  const loyaltyParts = [
    loyalty.bonusSpent > 0 &&
      t('paid with bonuses {amount}', { amount: formatMoney(loyalty.bonusSpent) }),
    loyalty.certificateSpent > 0 &&
      t('with certificates {amount}', { amount: formatMoney(loyalty.certificateSpent) }),
    loyalty.subscriptionVisits > 0 &&
      t('on passes {visits}', { visits: visits(t, loyalty.subscriptionVisits) }),
    loyalty.subscriptionsSold > 0 &&
      t('passes sold: {count} for {amount}', {
        count: loyalty.subscriptionsSold,
        amount: formatMoney(loyalty.subscriptionsRevenue),
      }),
  ].filter(Boolean)
  if (promotions.length === 0 && loyaltyParts.length === 0) return null

  return (
    <section className={styles.group} aria-labelledby='analytics-promotions'>
      <SectionCaption id='analytics-promotions' isInset={false}>
        {t('Promotions and loyalty')}
      </SectionCaption>
      {promotions.length > 0 && (
        <ul className={styles.rows}>
          {promotions.map((promotion) => (
            <li key={promotion.id} className={styles.row}>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{promotion.title}</span>
                <span className={styles.rowMeta}>
                  {visits(t, promotion.visits)} ·{' '}
                  {t('discounts {amount}', { amount: formatMoney(promotion.discount) })}
                </span>
              </span>
              <span className={styles.rowValue}>{formatMoney(promotion.revenue)}</span>
            </li>
          ))}
        </ul>
      )}
      {loyaltyParts.length > 0 && (
        <p className={styles.footnote}>
          {t('Loyalty: {parts}.', { parts: loyaltyParts.join(', ') })}
        </p>
      )}
    </section>
  )
}

export {
  AttentionList,
  ChangeReasons,
  GoalLine,
  GoalSheet,
  LossesGroup,
  PromotionsGroup,
  SourcesGroup,
}
