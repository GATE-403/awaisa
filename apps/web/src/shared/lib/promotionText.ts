import type { PublicPromotion } from '@/shared/api/types'

const WEEKDAY_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

const describeDays = (weekdays: number[] | null) => {
  if (!weekdays || weekdays.length === 7) return ''
  const sorted = [...weekdays].sort()
  if (sorted.join() === '0,1,2,3,4') return 'по будням'
  if (sorted.join() === '5,6') return 'по выходным'
  return sorted.map((day) => WEEKDAY_SHORT[day]).join(', ')
}

const describeHours = (from: number | null, to: number | null) => {
  if (from !== null && to !== null) return `${clock(from)}–${clock(to)}`
  if (to !== null) return `до ${clock(to)}`
  if (from !== null) return `с ${clock(from)}`
  return ''
}

// «−20% по будням до 12:00», «−10% на первый визит» — one short line per promotion.
const describePromotion = (promotion: PublicPromotion) => {
  const percent = `−${promotion.percent}%`
  if (promotion.kind === 'first_visit') return `${percent} на первый визит`
  const when = [
    describeDays(promotion.weekdays),
    describeHours(promotion.fromMinutes, promotion.toMinutes),
  ]
    .filter(Boolean)
    .join(' ')
  return when ? `${percent} ${when}` : percent
}

export { describePromotion }
