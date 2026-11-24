// Reasons come from the API in English (`recommend-score.ts`): «Due again · 5 wk»,
// «Nearby · 1.2 km», «Nearby · 850 m», «Today from 15:00», «Tomorrow from 15:00», «Rating 4.7»,
// «Popular», «Similar», «As usual», «Been here», «New place», «Often booked with manicure»,
// «Your pick · nails», «Your usual».

// Reasons with no « · » that run long get a short form of their own.
const SHORT_LEADS: [RegExp, (match: RegExpMatchArray) => string][] = [
  [/^Often booked with /, () => 'Often paired'],
  [/^Tomorrow from (.+)$/, (match) => `Tomorrow ${match[1] ?? ''}`],
]

const CARD_REASON_LIMIT = 17

const shortForm = (lead: string) => {
  for (const [pattern, short] of SHORT_LEADS) {
    const match = lead.match(pattern)
    if (match) return short(match)
  }
  return lead
}

// The capsule on a 144px card holds about 17 characters: past that only the reason's lead is
// shown («Your pick · haircuts» → «Your pick»), never a word cut by an ellipsis.
const shortReason = (reason: string) => {
  if (reason.length <= CARD_REASON_LIMIT) return reason
  return shortForm(reason.split(' · ')[0] ?? reason)
}

// Under a 76pt story tile there is room for about 12 characters: the reason in its shortest words
// («Your pick», «Due again», «Today 15:00», «★ 4.7»).
const storyNote = (reason: string) => {
  const lead = reason.split(' · ')[0] ?? reason
  return shortForm(lead)
    .replace(/^(Today|Tomorrow) from /, '$1 ')
    .replace(/^Rating /, '★ ')
}

// The reason the score gives a service due again.
const DUE_REASON = 'Due again'

export { DUE_REASON, shortReason, storyNote }
