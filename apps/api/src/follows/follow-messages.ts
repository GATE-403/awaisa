// Texts a follower of a master gets (SMS, or Telegram when their number is linked). Names lead
// the line, by first name only.

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** «today», «tomorrow» or «25 November», for a day key against today's key in Bishkek. */
const dayWords = (date: string, today: string, tomorrow: string) => {
  if (date === today) return 'today'
  if (date === tomorrow) return 'tomorrow'
  const [, month, day] = date.split('-').map(Number)
  return `${day} ${MONTHS[(month ?? 1) - 1]}`
}

const freedText = (master: string, place: string, day: string, time: string, link: string) =>
  `${firstName(master)}, ${place}: a slot opened up ${day} at ${time}. Book: ${link}`

const movedText = (master: string, place: string, link: string) =>
  `${firstName(master)} now works at “${place}”. Book: ${link}`

const worksText = (master: string, count: number, link: string) =>
  `${firstName(master)}: ${count} new ${count === 1 ? 'look' : 'looks'} in “Looks”. See them: ${link}`

export { dayWords, freedText, movedText, worksText }
