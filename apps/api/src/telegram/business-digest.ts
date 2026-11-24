// The Monday summary of a place's week for its owners' Telegram: the numbers and what needs them,
// each a fact on its own line, so it reads in a glance on a phone. Pure, unit-tested.

type BusinessWeek = {
  business: string
  /** The last seven days: what visits earned, how many, and the seven days before. */
  revenue: number
  previousRevenue: number
  visits: number
  /** The master whose visits earned the most this week, if any visit happened. */
  bestMaster: { name: string; revenue: number } | null
  noShows: { count: number; amount: number }
  /** Ended visits of the last 30 days nobody marked. */
  unmarked: number
  analyticsUrl: string
}

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const plural = (count: number, [one, other]: [string, string]) => (count === 1 ? one : other)

// Thousands parted by a comma, like the dashboard's figures.
const money = (amount: number) =>
  `${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')} som`

const changeText = (current: number, previous: number) => {
  if (previous === 0) return ''
  const change = Math.round(((current - previous) / previous) * 100)
  if (change === 0) return ' (same as last week)'
  return ` (${change > 0 ? '▲ +' : '▼ −'}${Math.abs(change)}% on last week)`
}

/** The week's summary, or null for a week with no visits and nothing waiting. */
const businessWeekText = (week: BusinessWeek) => {
  if (week.visits === 0 && week.unmarked === 0) return null

  const lines = [`📈 <b>Week · ${escapeHtml(week.business)}</b>`]
  lines.push(`Revenue ${money(week.revenue)}${changeText(week.revenue, week.previousRevenue)}`)
  lines.push(`${week.visits} ${plural(week.visits, ['visit', 'visits'])}`)
  if (week.bestMaster) {
    lines.push(`Top earner: ${escapeHtml(week.bestMaster.name)}, ${money(week.bestMaster.revenue)}`)
  }
  if (week.noShows.count > 0) {
    lines.push(`No-shows: ${week.noShows.count}, missed ${money(week.noShows.amount)}`)
  }
  if (week.unmarked > 0) {
    lines.push(`⚠️ Not marked: ${week.unmarked} ${plural(week.unmarked, ['visit', 'visits'])}`)
  }
  lines.push(`<a href="${escapeHtml(week.analyticsUrl)}">Analytics</a>`)

  return lines.join('\n')
}

export type { BusinessWeek }
export { businessWeekText }
