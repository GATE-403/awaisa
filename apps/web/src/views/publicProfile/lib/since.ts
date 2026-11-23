import type { Translate } from '@/shared/i18n'

const DAY_MS = 86_400_000

const toUtc = (dayKey: string) => {
  const [year = 0, month = 1, day = 1] = dayKey.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** How long ago a visit was, short: «сегодня», «5 дн. назад», «3 нед. назад», «4 мес. назад». */
export const agoLabel = (visitDayKey: string, todayKey: string, t: Translate) => {
  const days = Math.max(0, Math.round((toUtc(todayKey) - toUtc(visitDayKey)) / DAY_MS))
  if (days === 0) return t('сегодня')
  if (days === 1) return t('вчера')
  if (days < 14) return t('{count} дн. назад', { count: days })
  if (days < 60) return t('{count} нед. назад', { count: Math.floor(days / 7) })
  if (days < 365) return t('{count} мес. назад', { count: Math.floor(days / 30) })
  return t('{count} г. назад', { count: Math.floor(days / 365) })
}
