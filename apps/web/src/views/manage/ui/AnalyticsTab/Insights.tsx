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
import { formatPhone } from '@/shared/lib/formatPhone'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { pluralize } from '@/shared/lib/plural'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import forms from '@/views/manage/ui/manageForms.module.css'
import styles from './AnalyticsTab.module.css'
import { formatDay, formatMoney } from './analyticsFormat'

const visits = (count: number) => pluralize(count, ['визит', 'визита', 'визитов'])
const hours = (minutes: number) => `${Math.round(minutes / 60)} ч`

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
        <CaretRight weight='bold' aria-hidden />
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
  const { unmarked, lapsed, freeTomorrow, lowStock } = attention
  const isFreeTomorrow = freeTomorrow !== null && freeTomorrow.minutes >= 60
  if (unmarked.count === 0 && lapsed.count === 0 && !isFreeTomorrow && lowStock.count === 0) {
    return null
  }
  const restStock = lowStock.count - lowStock.names.length

  return (
    <section className={styles.group} aria-labelledby='analytics-attention'>
      <SectionCaption id='analytics-attention' isInset={false}>
        Требует внимания
      </SectionCaption>
      <ul className={styles.rows}>
        {unmarked.count > 0 && (
          <AttentionRow
            icon={<CircleDashed weight='bold' />}
            tone='orange'
            title={`${visits(unmarked.count)} без отметки`}
            detail={unmarked.firstDate ? `с ${formatDay(unmarked.firstDate)}` : undefined}
            actionLabel='Отметить'
            href={`?tab=schedule${unmarked.firstDate ? `&date=${unmarked.firstDate}` : ''}`}
          />
        )}
        {lapsed.count > 0 && (
          <AttentionRow
            icon={<UserMinus />}
            tone='red'
            title={`${pluralize(lapsed.count, ['клиент', 'клиента', 'клиентов'])} давно не были`}
            detail={`больше ${lapsed.days} дней`}
            actionLabel='Позвать'
            onClick={onCallBack}
          />
        )}
        {freeTomorrow && isFreeTomorrow && (
          <AttentionRow
            icon={<CalendarBlank />}
            tone='blue'
            title={`Завтра свободно ≈ ${hours(freeTomorrow.minutes)}`}
            detail='поделитесь окнами'
            actionLabel='Открыть день'
            href={`?tab=schedule&date=${freeTomorrow.date}`}
          />
        )}
        {lowStock.count > 0 && (
          <AttentionRow
            icon={<Package />}
            tone='gray'
            title={`Заканчивается: ${lowStock.names.join(', ')}${restStock > 0 ? ` и ещё ${restStock}` : ''}`}
            actionLabel='Склад'
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
  if (totals.revenueChange === null || totals.revenueChange === 0) return null
  const parts: string[] = []
  if (totals.visitsChange !== null) parts.push(`визитов ${signed(totals.visitsChange)}`)
  if (totals.averageCheckChange !== null)
    parts.push(`средний чек ${signed(totals.averageCheckChange)}`)
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
  if (mover && mover.change !== 0) parts.push(`сильнее всех ${mover.name} ${signed(mover.change)}`)
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
  if (month.goal === null) {
    return (
      <button type='button' className={styles.goalSet} onClick={onEdit}>
        Задать цель на {month.label}
        <CaretRight weight='bold' aria-hidden />
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
          Цель на {month.label}: <b>{share}%</b> · {formatMoney(month.revenue)} из{' '}
          {formatMoney(month.goal)}
          <span className={styles.muted}>
            {isReached
              ? ' · цель достигнута'
              : ` · в этом темпе ${formatMoney(month.projected)}${isOnPace ? '' : `, не хватит ${formatMoney(month.goal - month.projected)}`}`}
          </span>
        </p>
        <button type='button' className={styles.goalEdit} onClick={onEdit}>
          Изменить
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
      title='Цель на месяц'
      onClose={onClose}
      action={{ label: 'Готово', form: GOAL_FORM, disabled: !canSave }}
    >
      <form id={GOAL_FORM} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label='Цель'>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Выручка за {monthLabel}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label='Цель по выручке, сом'
                  inputMode='numeric'
                  placeholder='400 000'
                  value={value}
                  onValueChange={(next) => setValue(maskAmountInput(next.replace(/\D/g, '')))}
                  autoFocus
                />
                <span className={sheet.suffix}>сом</span>
              </span>
            </label>
          </div>
          <p className={sheet.groupFooter}>
            Аналитика покажет, сколько уже есть и хватит ли текущего темпа до конца месяца.
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
              Убрать цель
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
  const total = losses.noShows.amount + losses.lateCancellations.amount
  if (total === 0 && losses.repeatNoShows.length === 0) return null

  return (
    <section className={styles.group} aria-labelledby='analytics-losses'>
      <SectionCaption id='analytics-losses' isInset={false}>
        Потери <span className={forms.groupCount}>{formatMoney(total)}</span>
      </SectionCaption>
      <ul className={styles.rows}>
        {losses.noShows.count > 0 && (
          <li className={styles.row}>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Неявки</span>
              <span className={styles.rowMeta}>{visits(losses.noShows.count)}</span>
            </span>
            <span className={styles.rowValue}>{formatMoney(losses.noShows.amount)}</span>
          </li>
        )}
        {losses.lateCancellations.count > 0 && (
          <li className={styles.row}>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Поздние отмены</span>
              <span className={styles.rowMeta}>
                {visits(losses.lateCancellations.count)} отменили меньше чем за сутки
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
                  не пришёл {pluralize(client.count, ['раз', 'раза', 'раз'])} за полгода ·{' '}
                  {formatPhone(client.phone)}
                </span>
              </span>
              <CaretRight weight='bold' aria-hidden className={styles.rowChevron} />
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.footnote}>
        Предоплата при записи онлайн защищает от неявок:{' '}
        <NextLink className={styles.footnoteLink} href='?tab=services'>
          включите её в услугах
        </NextLink>
        .
      </p>
    </section>
  )
}

interface SourcesGroupProps {
  sources: AnalyticsReport['sources']
}

const SOURCE_PARTS = [
  { key: 'online', label: 'Онлайн' },
  { key: 'staff', label: 'Администратор' },
  { key: 'import', label: 'Импорт' },
] as const

// Where the period's visits were booked: online by the clients themselves, by the staff, imported;
// and per branch when there are several.
const SourcesGroup = ({ sources }: SourcesGroupProps) => {
  const parts = SOURCE_PARTS.map((part) => ({ ...part, value: sources[part.key] })).filter(
    (part) => part.value > 0,
  )
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  if (total === 0) return null

  return (
    <section className={styles.group} aria-labelledby='analytics-sources'>
      <SectionCaption id='analytics-sources' isInset={false}>
        Откуда записи
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
              {part.label} <b>{Math.round((part.value / total) * 100)}%</b>
              <span className={styles.muted}>{visits(part.value)}</span>
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
                <span className={styles.rowMeta}>{visits(branch.visits)}</span>
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
  const loyaltyParts = [
    loyalty.bonusSpent > 0 && `бонусами оплачено ${formatMoney(loyalty.bonusSpent)}`,
    loyalty.certificateSpent > 0 && `сертификатами ${formatMoney(loyalty.certificateSpent)}`,
    loyalty.subscriptionVisits > 0 && `по абонементам ${visits(loyalty.subscriptionVisits)}`,
  ].filter(Boolean)
  if (promotions.length === 0 && loyaltyParts.length === 0) return null

  return (
    <section className={styles.group} aria-labelledby='analytics-promotions'>
      <SectionCaption id='analytics-promotions' isInset={false}>
        Акции и лояльность
      </SectionCaption>
      {promotions.length > 0 && (
        <ul className={styles.rows}>
          {promotions.map((promotion) => (
            <li key={promotion.id} className={styles.row}>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{promotion.title}</span>
                <span className={styles.rowMeta}>
                  {visits(promotion.visits)} · скидки {formatMoney(promotion.discount)}
                </span>
              </span>
              <span className={styles.rowValue}>{formatMoney(promotion.revenue)}</span>
            </li>
          ))}
        </ul>
      )}
      {loyaltyParts.length > 0 && (
        <p className={styles.footnote}>Лояльность: {loyaltyParts.join(', ')}.</p>
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
