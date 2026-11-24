// The app speaks English only. `t()` marks user-facing text and fills `{name}` placeholders,
// so the strings stay easy to find when translations come back (extracted, like Bluesky's Lingui).

type Vars = Record<string, string | number>

const LOCALE = 'en-GB'

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, key: string) => String(vars[key] ?? match)) : text

const fromDayKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

const format = (key: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, options).format(fromDayKey(key))

const t = Object.assign((text: string, vars?: Vars) => fill(text, vars), {
  /** «1 visit», «12 visits». */
  count: (count: number, [one, other]: [string, string]) => `${count} ${count === 1 ? one : other}`,
  /** «45 min», «1 h», «1 h 30 min». */
  duration: (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    if (hours === 0) return `${rest} min`
    if (rest === 0) return `${hours} h`
    return `${hours} h ${rest} min`
  },
  weekdayShort: (key: string) => format(key, { weekday: 'short' }),
  weekdayLong: (key: string) => format(key, { weekday: 'long' }),
  monthShort: (key: string) => format(key, { month: 'short' }),
  /** «Saturday 14 November». */
  dayLong: (key: string) => format(key, { weekday: 'long', day: 'numeric', month: 'long' }),
  /** «Sat 14 Nov». */
  dayShort: (key: string) => format(key, { weekday: 'short', day: 'numeric', month: 'short' }),
})

type Translate = typeof t

const useT = (): Translate => t

export type { Translate }
export { t, useT }
