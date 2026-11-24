import { msg, ph } from '@lingui/core/macro'
import type { Translate } from '@/shared/i18n'

const REGULAR_PREFIX = 'A regular at '

/** Achievement titles come from the API in English; all but «A regular at <place>» are a fixed set. */
export const achievementTitle = (title: string, t: Translate) =>
  title.startsWith(REGULAR_PREFIX)
    ? t(msg`A regular at ${ph({ place: title.slice(REGULAR_PREFIX.length) })}`)
    : title
