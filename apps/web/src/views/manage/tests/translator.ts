import { setupI18n } from '@lingui/core'
import type { Translate } from '@/shared/i18n'

// A real translator with no catalog: every message comes out as its English source.
const i18n = setupI18n({ locale: 'en', messages: { en: {} } })

const t: Translate = i18n._.bind(i18n)

export { i18n, t }
