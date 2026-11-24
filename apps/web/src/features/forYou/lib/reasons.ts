import { msg, ph } from '@lingui/core/macro'
import type { Translate } from '@/shared/i18n'

// Reasons come from the API in English (`recommend-score.ts`): «Due again · 5 wk»,
// «Nearby · 1.2 km», «Nearby · 850 m», «Today from 15:00», «Tomorrow from 15:00», «Rating 4.7»,
// «Popular», «Similar», «As usual», «Been here», «New place», «Often booked with manicure»,
// «Your pick · nails», «Your usual».

// Reasons with no « · » that run long get a short form of their own: words the web writes, so
// they are translated, while the reasons themselves are shown as the API sends them.
const SHORT_LEADS: [RegExp, (match: RegExpMatchArray, t: Translate) => string][] = [
  [/^Often booked with /, (_, t) => t(msg`Often paired`)],
  [/^Tomorrow from (.+)$/, (match, t) => t(msg`Tomorrow ${ph({ time: match[1] ?? '' })}`)],
  [/^Today from (.+)$/, (match, t) => t(msg`Today ${ph({ time: match[1] ?? '' })}`)],
]

const CARD_REASON_LIMIT = 17

const shortForm = (lead: string, t: Translate) => {
  for (const [pattern, short] of SHORT_LEADS) {
    const match = lead.match(pattern)
    if (match) return short(match, t)
  }
  return lead
}

// The capsule on a 144px card holds about 17 characters: past that only the reason's lead is
// shown («Your pick · haircuts» → «Your pick»), never a word cut by an ellipsis.
const shortReason = (reason: string, t: Translate) => {
  if (reason.length <= CARD_REASON_LIMIT) return reason
  return shortForm(reason.split(' · ')[0] ?? reason, t)
}

// Under a 76pt story tile there is room for about 12 characters: the reason in its shortest words
// («Your pick», «Due again», «Today 15:00», «★ 4.7»).
const storyNote = (reason: string, t: Translate) => {
  const lead = reason.split(' · ')[0] ?? reason
  return shortForm(lead, t).replace(/^Rating /, '★ ')
}

// The reason the score gives a service due again.
const DUE_REASON = 'Due again'

export { DUE_REASON, shortReason, storyNote }
