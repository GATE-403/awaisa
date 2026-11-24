import type { MessageDescriptor } from '@lingui/core'

/**
 * A translator passed into helpers that build sentences: the `t` of `useLingui()` (or
 * `i18n._`). Helpers write their messages with `msg` and call `t(msg\`…\`)`.
 */
type Translate = (descriptor: MessageDescriptor) => string

export type { Format } from './format'
export {
  formatAmount,
  formatDate,
  formatMoney,
  formatNumber,
  makeFormat,
  moneyLabel,
} from './format'
export type { Locale } from './locales'
export { DEFAULT_LOCALE, LOCALE_NAMES, LOCALES, localizePath } from './locales'
export { Link, useLocale, usePathname, useRouter } from './navigation'
export { useFormat } from './useFormat'
export type { Translate }
