import type { Translate } from '@/shared/i18n'

const DAY_MS = 86_400_000

const toUtc = (dayKey: string) => {
  const [year = 0, month = 1, day = 1] = dayKey.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** How long ago a visit was, short: «today», «5 d ago», «3 wk ago», «4 mo ago». */
export const agoLabel = (visitDayKey: string, todayKey: string, t: Translate) => {
  const days = Math.max(0, Math.round((toUtc(todayKey) - toUtc(visitDayKey)) / DAY_MS))
  if (days === 0) return t('today')
  if (days === 1) return t('yesterday')
  if (days < 14) return t('{count} d ago', { count: days })
  if (days < 60) return t('{count} wk ago', { count: Math.floor(days / 7) })
  if (days < 365) return t('{count} mo ago', { count: Math.floor(days / 30) })
  return t('{count} yr ago', { count: Math.floor(days / 365) })
}
