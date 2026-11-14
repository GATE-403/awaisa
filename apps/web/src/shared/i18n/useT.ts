'use client'

import { useMemo } from 'react'
import { pluralize } from '@/shared/lib/plural'
import { COUNTED, DICTIONARY } from './dictionary'
import { type LanguageCode, useLanguage } from './language'

type Vars = Record<string, string | number>

const LOCALES: Record<LanguageCode, string> = { ru: 'ru-RU', ky: 'ky-KG', en: 'en-GB' }

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, key: string) => String(vars[key] ?? match)) : text

const fromDayKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

// Browsers ship few Kyrgyz date names (Chrome falls back to Russian «пн»), so they live here.
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

// One function per language, so React Compiler recomputes everything that used the old one.
const makeT = (language: LanguageCode) => {
  const index = language === 'ky' ? 0 : 1
  const locale = LOCALES[language]
  const format = (key: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options).format(fromDayKey(key)).replace('.', '')

  const t = (text: string, vars?: Vars) =>
    fill(language === 'ru' ? text : (DICTIONARY[text]?.[index] ?? text), vars)

  return Object.assign(t, {
    language,
    /** «12 свободных» in Russian, «12 бош» in Kyrgyz, «12 free» in English. */
    count: (count: number, forms: [string, string, string]) => {
      const counted = COUNTED[forms[2]]
      if (language === 'ru' || !counted) return pluralize(count, forms)
      if (language === 'ky') return `${count} ${counted[0]}`
      return `${count} ${count === 1 ? counted[1] : counted[2]}`
    },
    duration: (minutes: number) => {
      const [hour, minute] =
        language === 'ky' ? ['саат', 'мүн'] : language === 'en' ? ['h', 'min'] : ['ч', 'мин']
      const hours = Math.floor(minutes / 60)
      const rest = minutes % 60
      if (hours === 0) return `${rest} ${minute}`
      if (rest === 0) return `${hours} ${hour}`
      return `${hours} ${hour} ${rest} ${minute}`
    },
    weekdayShort: (key: string) =>
      language === 'ky'
        ? (KY_WEEKDAYS_SHORT[fromDayKey(key).getDay()] ?? '')
        : format(key, { weekday: 'short' }),
    weekdayLong: (key: string) =>
      language === 'ky'
        ? (KY_WEEKDAYS[fromDayKey(key).getDay()] ?? '')
        : format(key, { weekday: 'long' }),
    monthShort: (key: string) =>
      language === 'ky'
        ? (KY_MONTHS[fromDayKey(key).getMonth()] ?? '').slice(0, 3)
        : format(key, { month: 'short' }),
    /** «Суббота, 14 ноября» · «Ишемби, 14-ноябрь» · «Saturday 14 November». */
    dayLong: (key: string) => {
      const date = fromDayKey(key)
      if (language === 'ky') {
        return capitalize(
          `${KY_WEEKDAYS[date.getDay()]}, ${date.getDate()}-${KY_MONTHS[date.getMonth()]}`,
        )
      }
      return capitalize(
        new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
          date,
        ),
      )
    },
    /** «сб, 14 нояб.» · «ишм, 14-ноя». */
    dayShort: (key: string) => {
      const date = fromDayKey(key)
      if (language === 'ky') {
        return `${KY_WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()}-${KY_MONTHS[date.getMonth()]?.slice(0, 3)}`
      }
      return new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(date)
    },
  })
}

type Translate = ReturnType<typeof makeT>

const useT = (): Translate => {
  const language = useLanguage()
  return useMemo(() => makeT(language), [language])
}

export type { Translate }
export { useT }
