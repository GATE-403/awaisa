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
  /** Ratings of 3 ★ and below with no reply and not marked «Resolved». */
  poorOpen: number
  /** Every review still without a reply. */
  unanswered: number
  cabinetUrl: string
}

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const plural = (count: number, [one, other]: [string, string]) => (count === 1 ? one : other)

const REVIEWS: [string, string] = ['review', 'reviews']

const rating = (value: number) => value.toFixed(1)

// A change smaller than this reads as noise, not a trend.
const NOTICEABLE_CHANGE = 0.05

const changeText = (average: number, previous: number | null) => {
  if (previous === null) return ''
  const change = average - previous
  if (Math.abs(change) < NOTICEABLE_CHANGE) return ' (same as last week)'
  const sign = change > 0 ? '▲ +' : '▼ −'
  return ` (${sign}${rating(Math.abs(change))} on last week)`
}

/** The week's summary, or null when there is nothing to say (no reviews and nothing waiting). */
const reviewDigestText = (week: ReviewWeek) => {
  if (week.count === 0 && week.unanswered === 0) return null

  const lines = [`📊 <b>Reviews this week · ${escapeHtml(week.business)}</b>`]
  if (week.count > 0 && week.average !== null) {
    lines.push(
      `${week.count} ${plural(week.count, REVIEWS)}, average ★ ${rating(week.average)}${changeText(week.average, week.previousAverage)}`,
    )
  } else {
    lines.push('No new reviews')
  }
  if (week.bestMaster) {
    const master = week.bestMaster
    lines.push(
      `Top specialist: ${escapeHtml(master.name)}, ★ ${rating(master.average)} (${master.count} ${plural(master.count, REVIEWS)})`,
    )
  }
  if (week.poorOpen > 0) {
    lines.push(
      `⚠️ Waiting for your reply: ${week.poorOpen} ${plural(week.poorOpen, ['poor review', 'poor reviews'])}`,
    )
  }
  if (week.unanswered > 0) {
    lines.push(`Unanswered in total: ${week.unanswered}`)
  }
  if (week.unanswered > 0 || week.poorOpen > 0) {
    lines.push(`<a href="${escapeHtml(week.cabinetUrl)}">Reply in the dashboard</a>`)
  }

  return lines.join('\n')
}

export type { ReviewWeek }
export { reviewDigestText }
