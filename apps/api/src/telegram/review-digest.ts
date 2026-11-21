// The Monday summary of a place's reviews for its owners' Telegram: numbers only, so the owner sees
// in one glance how the week went and what still waits for them. Pure, unit-tested.

type ReviewWeek = {
  business: string
  /** Reviews left in the last seven days, and their average. */
  count: number
  average: number | null
  /** The average of the seven days before, for the change. */
  previousAverage: number | null
  /** The master with the best average this week (at least two reviews), if any. */
  bestMaster: { name: string; average: number; count: number } | null
  /** Ratings of 3 ★ and below with no reply and not marked «Решено». */
  poorOpen: number
  /** Every review still without a reply. */
  unanswered: number
  cabinetUrl: string
}

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const plural = (count: number, [one, few, many]: [string, string, string]) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

const REVIEWS: [string, string, string] = ['отзыв', 'отзыва', 'отзывов']

const rating = (value: number) => value.toFixed(1).replace('.', ',')

// A change smaller than this reads as noise, not a trend.
const NOTICEABLE_CHANGE = 0.05

const changeText = (average: number, previous: number | null) => {
  if (previous === null) return ''
  const change = average - previous
  if (Math.abs(change) < NOTICEABLE_CHANGE) return ' (как на прошлой неделе)'
  const sign = change > 0 ? '▲ +' : '▼ −'
  return ` (${sign}${rating(Math.abs(change))} к прошлой неделе)`
}

/** The week's summary, or null when there is nothing to say (no reviews and nothing waiting). */
const reviewDigestText = (week: ReviewWeek) => {
  if (week.count === 0 && week.unanswered === 0) return null

  const lines = [`📊 <b>Отзывы за неделю · ${escapeHtml(week.business)}</b>`]
  if (week.count > 0 && week.average !== null) {
    lines.push(
      `${week.count} ${plural(week.count, REVIEWS)}, средняя ★ ${rating(week.average)}${changeText(week.average, week.previousAverage)}`,
    )
  } else {
    lines.push('Новых отзывов не было')
  }
  if (week.bestMaster) {
    const master = week.bestMaster
    lines.push(
      `Лучший мастер: ${escapeHtml(master.name)}, ★ ${rating(master.average)} (${master.count} ${plural(master.count, REVIEWS)})`,
    )
  }
  if (week.poorOpen > 0) {
    lines.push(
      `⚠️ Ждут вашего ответа: ${week.poorOpen} ${plural(week.poorOpen, ['плохой отзыв', 'плохих отзыва', 'плохих отзывов'])}`,
    )
  }
  if (week.unanswered > 0) {
    lines.push(`Без ответа всего: ${week.unanswered}`)
  }
  if (week.unanswered > 0 || week.poorOpen > 0) {
    lines.push(`<a href="${escapeHtml(week.cabinetUrl)}">Ответить в кабинете</a>`)
  }

  return lines.join('\n')
}

export type { ReviewWeek }
export { reviewDigestText }
