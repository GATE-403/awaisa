import type { Translate } from '@/shared/i18n'

const REGULAR_PREFIX = 'Свой в '

/** Achievement titles come from the API in Russian; all but «Свой в <place>» are a fixed set. */
export const achievementTitle = (title: string, t: Translate) =>
  title.startsWith(REGULAR_PREFIX)
    ? t('A regular at {place}', { place: title.slice(REGULAR_PREFIX.length) })
    : t(title)
