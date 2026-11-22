// Texts a follower of a master gets (SMS, or Telegram when their number is linked). Names lead
// the line: a first name cannot be declined reliably («У Азамат» reads wrong).

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

/** «сегодня», «завтра» or «25 ноября», for a day key against today's key in Bishkek. */
const dayWords = (date: string, today: string, tomorrow: string) => {
  if (date === today) return 'сегодня'
  if (date === tomorrow) return 'завтра'
  const [, month, day] = date.split('-').map(Number)
  const months = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ]
  return `${day} ${months[(month ?? 1) - 1]}`
}

const freedText = (master: string, place: string, day: string, time: string, link: string) =>
  `${firstName(master)}, ${place}: освободилось ${day} в ${time}. Записаться: ${link}`

const movedText = (master: string, place: string, link: string) =>
  `${firstName(master)} теперь работает в «${place}». Записаться: ${link}`

const worksText = (master: string, count: number, link: string) => {
  const words =
    count % 10 === 1 && count % 100 !== 11
      ? 'новая работа'
      : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)
        ? 'новые работы'
        : 'новых работ'
  return `${firstName(master)}: ${count} ${words} в «Образах». Смотреть: ${link}`
}

export { dayWords, freedText, movedText, worksText }
