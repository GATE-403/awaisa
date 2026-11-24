import type { MessageDescriptor } from '@lingui/core'
import { msg, ph } from '@lingui/core/macro'
import type { WorkingDay } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'

type OpeningStatus = {
  isOpen: boolean
  label: string
}

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAYS_IN_WEEK = 7

/** The same days as words people read: `t(WEEKDAY_SHORT_NAMES[0])`. */
const WEEKDAY_SHORT_NAMES: MessageDescriptor[] = [
  msg`Mon`,
  msg`Tue`,
  msg`Wed`,
  msg`Thu`,
  msg`Fri`,
  msg`Sat`,
  msg`Sun`,
]
const WEEKDAY_NAMES: MessageDescriptor[] = [
  msg`Monday`,
  msg`Tuesday`,
  msg`Wednesday`,
  msg`Thursday`,
  msg`Friday`,
  msg`Saturday`,
  msg`Sunday`,
]

/** `t(WEEKDAY_SHORT_NAMES[weekday])`, empty for a weekday out of range. */
const weekdayShortName = (t: Translate, weekday: number) => {
  const name = WEEKDAY_SHORT_NAMES[weekday]
  return name ? t(name) : ''
}

const weekdayName = (t: Translate, weekday: number) => {
  const name = WEEKDAY_NAMES[weekday]
  return name ? t(name) : ''
}

const formatClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

const parseClock = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// 0 = Monday … 6 = Sunday, the same numbering the API uses.
const weekdayOf = (dayKey: string) => {
  const [year = 0, month = 1, day = 1] = dayKey.split('-').map(Number)
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % DAYS_IN_WEEK
}

const findDay = (hours: WorkingDay[], weekday: number) =>
  hours.find((day) => day.weekday === weekday)

const getOpeningStatus = (
  hours: WorkingDay[],
  dayKey: string,
  minutes: number,
  t: Translate,
): OpeningStatus => {
  const weekday = weekdayOf(dayKey)
  const today = findDay(hours, weekday)
  if (today && minutes >= today.opensMinutes && minutes < today.closesMinutes) {
    return {
      isOpen: true,
      label: t(msg`Open until ${ph({ time: formatClock(today.closesMinutes) })}`),
    }
  }
  if (today && minutes < today.opensMinutes) {
    return {
      isOpen: false,
      label: t(msg`Opens at ${ph({ time: formatClock(today.opensMinutes) })}`),
    }
  }

  for (let offset = 1; offset <= DAYS_IN_WEEK; offset += 1) {
    const next = findDay(hours, (weekday + offset) % DAYS_IN_WEEK)
    if (!next) continue
    const time = formatClock(next.opensMinutes)
    if (offset === 1) return { isOpen: false, label: t(msg`Opens tomorrow at ${time}`) }
    const day = weekdayShortName(t, next.weekday)

    return { isOpen: false, label: t(msg`Opens ${day} at ${time}`) }
  }

  return { isOpen: false, label: t(msg`Not taking bookings now`) }
}

// "Daily 10:00-20:00" or "Mon-Fri 10:00-19:00, Sat 11:00-16:00".
const formatWeekSchedule = (hours: WorkingDay[], t: Translate) => {
  const groups: { from: number; to: number; range: string }[] = []

  for (let weekday = 0; weekday < DAYS_IN_WEEK; weekday += 1) {
    const day = findDay(hours, weekday)
    if (!day) continue
    const range = `${formatClock(day.opensMinutes)}–${formatClock(day.closesMinutes)}`
    const last = groups.at(-1)
    if (last && last.range === range && last.to === weekday - 1) last.to = weekday
    else groups.push({ from: weekday, to: weekday, range })
  }

  if (groups.length === 0) return t(msg`Booking is closed for now`)
  const [only] = groups
  if (groups.length === 1 && only && only.from === 0 && only.to === DAYS_IN_WEEK - 1) {
    return t(msg`Daily ${ph({ range: only.range })}`)
  }

  return groups
    .map(({ from, to, range }) => {
      const first = weekdayShortName(t, from)
      const days = from === to ? first : `${first}–${weekdayShortName(t, to)}`
      return `${days} ${range}`
    })
    .join(', ')
}

type WeekGroup = {
  /** 0 = Monday. */
  from: number
  to: number
  /** «10:00–20:00», or null for days off. */
  range: string | null
}

/** The week as runs of neighbouring days with the same hours, days off included: Mon-Fri, Sat, Sun. */
const groupWeek = (hours: WorkingDay[]): WeekGroup[] => {
  const groups: WeekGroup[] = []
  for (let weekday = 0; weekday < DAYS_IN_WEEK; weekday += 1) {
    const day = findDay(hours, weekday)
    const range = day ? `${formatClock(day.opensMinutes)}–${formatClock(day.closesMinutes)}` : null
    const last = groups.at(-1)
    if (last && last.range === range) last.to = weekday
    else groups.push({ from: weekday, to: weekday, range })
  }
  return groups
}

export type { WeekGroup }
export {
  findDay,
  groupWeek,
  formatClock,
  formatWeekSchedule,
  getOpeningStatus,
  parseClock,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT_NAMES,
  WEEKDAYS_FULL,
  WEEKDAYS_SHORT,
  weekdayName,
  weekdayOf,
  weekdayShortName,
}
