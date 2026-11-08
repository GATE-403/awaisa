const BUSINESS_UTC_OFFSET_MINUTES = 6 * 60
const MINUTE_MS = 60_000
const DAY_MINUTES = 24 * 60

const pad = (value: number) => String(value).padStart(2, '0')

const toBusinessParts = (date: Date) => {
  const shifted = new Date(date.getTime() + BUSINESS_UTC_OFFSET_MINUTES * MINUTE_MS)

  return {
    dateKey: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  }
}

const businessDateTimeToUtc = (dateKey: string, minutes: number) => {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number)
  const utcMidnight = Date.UTC(year, month - 1, day)

  return new Date(utcMidnight + (minutes - BUSINESS_UTC_OFFSET_MINUTES) * MINUTE_MS)
}

const addDays = (dateKey: string, days: number) =>
  toBusinessParts(businessDateTimeToUtc(dateKey, 12 * 60 + days * DAY_MINUTES)).dateKey

const formatMinutes = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

const parseTime = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export {
  addDays,
  BUSINESS_UTC_OFFSET_MINUTES,
  businessDateTimeToUtc,
  formatMinutes,
  parseTime,
  toBusinessParts,
}
