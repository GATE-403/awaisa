import type { MasterPayLine, MasterPayScheme } from '@awaisa/contracts'
import { weekdayOf } from '../common/business-time.js'

type PayVisit = { serviceId: string; serviceName: string; earned: number }

type PayInput = {
  scheme: MasterPayScheme
  visits: PayVisit[]
  /** Every day of the period, YYYY-MM-DD. */
  days: string[]
  /** Days of the period the master works by the schedule. */
  workDays: number
}

type PayResult = {
  services: number
  lines: MasterPayLine[]
  salary: number
  workDays: number
  minimum: number | null
  earned: number
  total: number
}

type ScheduleInput = {
  /** Weekdays the business is open (0 = Monday). */
  businessWeekdays: ReadonlySet<number>
  /** The master's own weekdays, or null when they work the business hours. */
  ownWeekdays: ReadonlySet<number> | null
  leaves: { startsOn: string; endsOn: string }[]
}

const daysInMonth = (dateKey: string) => {
  const [year = 2000, month = 1] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// A monthly sum spread over the month's calendar days, so a whole month gives exactly the sum and
// a rolling 30 days that spans two months gives each its own share.
const monthlyShare = (amount: number, days: string[]) =>
  days.reduce((sum, day) => sum + amount / daysInMonth(day), 0)

const hasScheme = (scheme: MasterPayScheme) =>
  scheme.percent !== null ||
  scheme.rates.length > 0 ||
  scheme.salary !== null ||
  scheme.minimum !== null

/** The days of `days` the master works: open by their week (or the business's), not on leave. */
const countWorkDays = (days: string[], schedule: ScheduleInput) =>
  days.filter((day) => {
    const weekdays = schedule.ownWeekdays ?? schedule.businessWeekdays
    if (!weekdays.has(weekdayOf(day))) return false
    return !schedule.leaves.some((leave) => leave.startsOn <= day && leave.endsOn >= day)
  }).length

/**
 * A master's pay for a period: each service's visits at its own rate (a fixed sum per visit or a
 * percent of what they earned, else the master's percent), plus the salary; never less than the
 * minimum. Sums are kept exact and rounded once, so one percent gives what it always gave.
 */
const calculatePay = ({ scheme, visits, days, workDays }: PayInput): PayResult => {
  const rates = new Map(scheme.rates.map((rate) => [rate.serviceId, rate]))
  const byService = new Map<string, { name: string; visits: number; base: number }>()
  for (const visit of visits) {
    const line = byService.get(visit.serviceId) ?? { name: visit.serviceName, visits: 0, base: 0 }
    line.visits += 1
    line.base += visit.earned
    byService.set(visit.serviceId, line)
  }

  let exact = 0
  const lines = [...byService.entries()].map(([serviceId, line]): MasterPayLine => {
    const own = rates.get(serviceId)
    const kind = own?.kind ?? (scheme.percent === null ? null : 'percent')
    const rate = own?.value ?? scheme.percent
    const value =
      kind === 'fixed'
        ? (rate ?? 0) * line.visits
        : kind === 'percent'
          ? (line.base * (rate ?? 0)) / 100
          : 0
    exact += value
    return { serviceId, ...line, kind, rate, amount: Math.round(value) }
  })
  lines.sort((first, second) => second.amount - first.amount || second.base - first.base)

  const services = Math.round(exact)
  const salary = !scheme.salary
    ? 0
    : scheme.salary.kind === 'day'
      ? scheme.salary.amount * workDays
      : Math.round(monthlyShare(scheme.salary.amount, days))
  const minimum = scheme.minimum === null ? null : Math.round(monthlyShare(scheme.minimum, days))
  const earned = services + salary

  return {
    services,
    lines,
    salary,
    workDays,
    minimum,
    earned,
    total: Math.max(earned, minimum ?? 0),
  }
}

/** Every day from `from` to `to`, both included. */
const daysBetween = (from: string, to: string) => {
  const days: string[] = []
  const [year = 2000, month = 1, day = 1] = from.split('-').map(Number)
  const cursor = new Date(Date.UTC(year, month - 1, day))
  for (;;) {
    const key = cursor.toISOString().slice(0, 10)
    if (key > to) return days
    days.push(key)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
}

export type { PayInput, PayResult, PayVisit, ScheduleInput }
export { calculatePay, countWorkDays, daysBetween, hasScheme }
