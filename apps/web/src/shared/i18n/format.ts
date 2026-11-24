import type { I18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { REGION } from '@/shared/config/region'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { DEFAULT_LOCALE, INTL_LOCALES, isLocale, type Locale } from './locales'

// Dates and lengths in the page's language. Browsers ship few Kyrgyz date names (Chrome falls
// back to Russian «пн»), so Kyrgyz day and month names live here.
const KY_WEEKDAYS = ['жекшемби', 'дүйшөмбү', 'шейшемби', 'шаршемби', 'бейшемби', 'жума', 'ишемби']
const KY_WEEKDAYS_SHORT = ['жек', 'дүй', 'шей', 'шар', 'бей', 'жума', 'ишм']
const KY_MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
]

const fromDayKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const amountFormatters = new Map<Locale, Intl.NumberFormat>()

/**
 * «1,500» in English, «1 500» in Russian and Kyrgyz (a no-break space: browsers group Russian
 * with a narrow one, Node with a normal one, so every space becomes U+00A0 and a price never
 * breaks or reads differently on the server and in the browser).
 */
const formatAmount = (locale: Locale, value: number) => {
  let formatter = amountFormatters.get(locale)
  if (!formatter) {
    formatter = new Intl.NumberFormat(INTL_LOCALES[locale])
    amountFormatters.set(locale, formatter)
  }
  return formatter.format(value).replace(/\s/g, '\u00a0')
}

/** What follows a price in this language: the region's own word for it, else its one label. */
const moneyLabel = (locale: Locale) => REGION.currency.labels[locale] ?? REGION.currency.label

/** «1,500 som» · «1 500 сом»: for code that knows the language but has no hook (server pages). */
const formatMoney = (locale: Locale, value: number) =>
  `${formatAmount(locale, value)}\u00a0${moneyLabel(locale)}`

const numberFormatters = new Map<string, Intl.NumberFormat>()

/**
 * A rating, a count or a quantity in the page's language: «4.4» in English, «4,4» in Russian
 * and Kyrgyz. Spaces become no-break ones, as in `formatAmount`.
 */
const formatNumber = (locale: Locale, value: number, options: Intl.NumberFormatOptions = {}) => {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = numberFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(INTL_LOCALES[locale], options)
    numberFormatters.set(key, formatter)
  }
  return formatter.format(value).replace(/\s/g, '\u00a0')
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/** «Ишемби, 14-ноябрь 2026, 15:30»: the parts the options ask for, with our own Kyrgyz words. */
const formatKyrgyzDate = (date: Date, options: Intl.DateTimeFormatOptions) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: options.timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ''
  const weekdayIndex = WEEKDAY_INDEX[part('weekday')] ?? 0
  const monthName = KY_MONTHS[Number(part('month')) - 1] ?? ''
  const month = options.month === 'short' ? monthName.slice(0, 3) : monthName
  const weekday =
    options.weekday === 'long' ? KY_WEEKDAYS[weekdayIndex] : KY_WEEKDAYS_SHORT[weekdayIndex]

  const day = options.day ? `${Number(part('day'))}-${month}` : month
  const words = [
    options.weekday ? `${weekday},` : '',
    day,
    options.year ? part('year') : '',
  ].filter(Boolean)
  const text = words.join(' ')
  const time = options.hour ? `${part('hour')}:${part('minute')}` : ''
  return time ? `${text}, ${time}` : text
}

/**
 * A moment (an ISO timestamp or a `Date`) in the page's language, on the region's clock unless
 * `options.timeZone` says otherwise. Kyrgyz month names are ours: browsers print Russian ones.
 */
const formatDate = (locale: Locale, value: string | Date, options: Intl.DateTimeFormatOptions) => {
  const date = typeof value === 'string' ? new Date(value) : value
  const zoned = { timeZone: BUSINESS_TIME_ZONE, ...options }
  const hasMonthName = options.month === 'long' || options.month === 'short'
  if (locale === 'ky' && hasMonthName) return formatKyrgyzDate(date, zoned)
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], zoned).format(date)
}

/** The formatters for one language; `i18n` translates the units («ч», «саат», «h»). */
const makeFormat = (i18n: I18n) => {
  const locale: Locale = isLocale(i18n.locale) ? i18n.locale : DEFAULT_LOCALE
  const intl = INTL_LOCALES[locale]
  const isKyrgyz = locale === 'ky'
  const format = (key: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intl, options).format(fromDayKey(key)).replace('.', '')

  return {
    locale,
    /** The currency's word in this language: «som», «сом». */
    currency: moneyLabel(locale),
    /** «1,500» · «1 500»: grouped by the page's language. */
    amount: (value: number) => formatAmount(locale, value),
    /** «1,500 som» · «1 500 сом». */
    price: (value: number) => formatMoney(locale, value),
    /** «4.4» · «4,4»: ratings, counts, quantities. */
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(locale, value, options),
    /** A star rating with one decimal: «4.0» · «4,0». */
    rating: (value: number) =>
      formatNumber(locale, value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    /** «20 November» · «20 ноября» · «20-ноябрь»: a moment on the region's clock. */
    date: (value: string | Date, options: Intl.DateTimeFormatOptions) =>
      formatDate(locale, value, options),
    /** «45 min», «1 h», «1 h 30 min». */
    duration: (minutes: number) => {
      const hours = Math.floor(minutes / 60)
      const rest = minutes % 60
      if (hours === 0) return i18n._(msg`${rest} min`)
      if (rest === 0) return i18n._(msg`${hours} h`)
      return i18n._(msg`${hours} h ${rest} min`)
    },
    weekdayShort: (key: string) =>
      isKyrgyz
        ? (KY_WEEKDAYS_SHORT[fromDayKey(key).getDay()] ?? '')
        : format(key, { weekday: 'short' }),
    weekdayLong: (key: string) =>
      isKyrgyz ? (KY_WEEKDAYS[fromDayKey(key).getDay()] ?? '') : format(key, { weekday: 'long' }),
    monthShort: (key: string) =>
      isKyrgyz
        ? (KY_MONTHS[fromDayKey(key).getMonth()] ?? '').slice(0, 3)
        : format(key, { month: 'short' }),
    /** «Saturday 14 November» · «Суббота, 14 ноября» · «Ишемби, 14-ноябрь». */
    dayLong: (key: string) => {
      const date = fromDayKey(key)
      if (isKyrgyz) {
        return capitalize(
          `${KY_WEEKDAYS[date.getDay()]}, ${date.getDate()}-${KY_MONTHS[date.getMonth()]}`,
        )
      }
      return capitalize(
        new Intl.DateTimeFormat(intl, { weekday: 'long', day: 'numeric', month: 'long' }).format(
          date,
        ),
      )
    },
    /** «Sat 14 Nov» · «сб, 14 нояб.» · «ишм, 14-ноя». */
    dayShort: (key: string) => {
      const date = fromDayKey(key)
      if (isKyrgyz) {
        return `${KY_WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()}-${KY_MONTHS[date.getMonth()]?.slice(0, 3)}`
      }
      return new Intl.DateTimeFormat(intl, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(date)
    },
  }
}

type Format = ReturnType<typeof makeFormat>

export type { Format }
export { formatAmount, formatDate, formatMoney, formatNumber, makeFormat, moneyLabel }
