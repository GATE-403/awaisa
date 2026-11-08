import type { WorkingDay } from '@/common/api/types'

type OpeningStatus = {
  isOpen: boolean
  label: string
}

const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const WEEKDAYS_FULL = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]
const DAYS_IN_WEEK = 7

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

const getOpeningStatus = (hours: WorkingDay[], dayKey: string, minutes: number): OpeningStatus => {
  const weekday = weekdayOf(dayKey)
  const today = findDay(hours, weekday)
  if (today && minutes >= today.opensMinutes && minutes < today.closesMinutes) {
    return { isOpen: true, label: `Открыто до ${formatClock(today.closesMinutes)}` }
  }
  if (today && minutes < today.opensMinutes) {
    return { isOpen: false, label: `Откроемся в ${formatClock(today.opensMinutes)}` }
  }

  for (let offset = 1; offset <= DAYS_IN_WEEK; offset += 1) {
    const next = findDay(hours, (weekday + offset) % DAYS_IN_WEEK)
    if (!next) continue
    const when = offset === 1 ? 'завтра' : WEEKDAYS_SHORT[next.weekday]?.toLowerCase()

    return { isOpen: false, label: `Откроемся ${when} в ${formatClock(next.opensMinutes)}` }
  }

  return { isOpen: false, label: 'Сейчас не принимаем' }
}

// "Ежедневно 10:00–20:00" or "Пн–Пт 10:00–19:00, Сб 11:00–16:00".
const formatWeekSchedule = (hours: WorkingDay[]) => {
  const groups: { from: number; to: number; range: string }[] = []

  for (let weekday = 0; weekday < DAYS_IN_WEEK; weekday += 1) {
    const day = findDay(hours, weekday)
    if (!day) continue
    const range = `${formatClock(day.opensMinutes)}–${formatClock(day.closesMinutes)}`
    const last = groups.at(-1)
    if (last && last.range === range && last.to === weekday - 1) last.to = weekday
    else groups.push({ from: weekday, to: weekday, range })
  }

  if (groups.length === 0) return 'Запись временно закрыта'
  const [only] = groups
  if (groups.length === 1 && only && only.from === 0 && only.to === DAYS_IN_WEEK - 1) {
    return `Ежедневно ${only.range}`
  }

  return groups
    .map(({ from, to, range }) => {
      const days =
        from === to ? WEEKDAYS_SHORT[from] : `${WEEKDAYS_SHORT[from]}–${WEEKDAYS_SHORT[to]}`
      return `${days} ${range}`
    })
    .join(', ')
}

export {
  findDay,
  formatClock,
  formatWeekSchedule,
  getOpeningStatus,
  parseClock,
  WEEKDAYS_FULL,
  WEEKDAYS_SHORT,
  weekdayOf,
}
