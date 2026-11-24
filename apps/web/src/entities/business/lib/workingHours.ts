import type { WorkingDay } from '@/shared/api/types'

type OpeningStatus = {
  isOpen: boolean
  label: string
}

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAYS_IN_WEEK = 7

/** `useT()`'s `t`, so callers get the words in the chosen language; Russian when left out. */
type Say = (text: string, vars?: Record<string, string | number>) => string

const russian: Say = (text, vars) =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => String(vars?.[key] ?? match))

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
  t: Say = russian,
): OpeningStatus => {
  const weekday = weekdayOf(dayKey)
  const today = findDay(hours, weekday)
  if (today && minutes >= today.opensMinutes && minutes < today.closesMinutes) {
    return {
      isOpen: true,
      label: t('Open until {time}', { time: formatClock(today.closesMinutes) }),
    }
  }
  if (today && minutes < today.opensMinutes) {
    return {
      isOpen: false,
      label: t('Opens at {time}', { time: formatClock(today.opensMinutes) }),
    }
  }

  for (let offset = 1; offset <= DAYS_IN_WEEK; offset += 1) {
    const next = findDay(hours, (weekday + offset) % DAYS_IN_WEEK)
    if (!next) continue
    const time = formatClock(next.opensMinutes)
    if (offset === 1) return { isOpen: false, label: t('Opens tomorrow at {time}', { time }) }
    const short = WEEKDAYS_SHORT[next.weekday] ?? ''
    // Russian reads «откроемся пт в 10:00»; other languages keep their own capitals («Opens Fri»).
    const translated = t(short)
    const day = translated === short ? short.toLowerCase() : translated

    return { isOpen: false, label: t('Opens {day} at {time}', { day, time }) }
  }

  return { isOpen: false, label: t('Not taking bookings now') }
}

// "Ежедневно 10:00–20:00" or "Пн–Пт 10:00–19:00, Сб 11:00–16:00".
const formatWeekSchedule = (hours: WorkingDay[], t: Say = russian) => {
  const groups: { from: number; to: number; range: string }[] = []

  for (let weekday = 0; weekday < DAYS_IN_WEEK; weekday += 1) {
    const day = findDay(hours, weekday)
    if (!day) continue
    const range = `${formatClock(day.opensMinutes)}–${formatClock(day.closesMinutes)}`
    const last = groups.at(-1)
    if (last && last.range === range && last.to === weekday - 1) last.to = weekday
    else groups.push({ from: weekday, to: weekday, range })
  }

  if (groups.length === 0) return t('Booking is closed for now')
  const [only] = groups
  if (groups.length === 1 && only && only.from === 0 && only.to === DAYS_IN_WEEK - 1) {
    return t('Daily {range}', { range: only.range })
  }

  return groups
    .map(({ from, to, range }) => {
      const first = t(WEEKDAYS_SHORT[from] ?? '')
      const days = from === to ? first : `${first}–${t(WEEKDAYS_SHORT[to] ?? '')}`
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

/** The week as runs of neighbouring days with the same hours, days off included: Пн–Пт, Сб, Вс. */
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
  WEEKDAYS_FULL,
  WEEKDAYS_SHORT,
  weekdayOf,
}
