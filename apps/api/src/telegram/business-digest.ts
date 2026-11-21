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

const plural = (count: number, [one, few, many]: [string, string, string]) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

// Thousands parted by a narrow no-break space, like the cabinet's figures.
const money = (amount: number) =>
  `${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} сом`

const changeText = (current: number, previous: number) => {
  if (previous === 0) return ''
  const change = Math.round(((current - previous) / previous) * 100)
  if (change === 0) return ' (как на прошлой неделе)'
  return ` (${change > 0 ? '▲ +' : '▼ −'}${Math.abs(change)}% к прошлой неделе)`
}

/** The week's summary, or null for a week with no visits and nothing waiting. */
const businessWeekText = (week: BusinessWeek) => {
  if (week.visits === 0 && week.unmarked === 0) return null

  const lines = [`📈 <b>Неделя · ${escapeHtml(week.business)}</b>`]
  lines.push(`Выручка ${money(week.revenue)}${changeText(week.revenue, week.previousRevenue)}`)
  lines.push(`${week.visits} ${plural(week.visits, ['визит', 'визита', 'визитов'])}`)
  if (week.bestMaster) {
    lines.push(
      `Больше всех: ${escapeHtml(week.bestMaster.name)}, ${money(week.bestMaster.revenue)}`,
    )
  }
  if (week.noShows.count > 0) {
    lines.push(`Неявки: ${week.noShows.count}, недополучено ${money(week.noShows.amount)}`)
  }
  if (week.unmarked > 0) {
    lines.push(
      `⚠️ Без отметки: ${week.unmarked} ${plural(week.unmarked, ['визит', 'визита', 'визитов'])}`,
    )
  }
  lines.push(`<a href="${escapeHtml(week.analyticsUrl)}">Аналитика</a>`)

  return lines.join('\n')
}

export type { BusinessWeek }
export { businessWeekText }
