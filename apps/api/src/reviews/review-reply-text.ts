// Reply templates a business writes once instead of answering every review by hand: an automatic
// reply to good reviews and quick replies offered above the reply field. Pure, unit-tested.

const MAX_TEMPLATE_LENGTH = 500
const MAX_QUICK_REPLIES = 6

const DEFAULT_AUTO_TEMPLATE = 'Thank you, {name}! We are glad you liked it. See you again soon 🙏'

const DEFAULT_QUICK_REPLIES = [
  'Thank you, {name}! See you again soon 🙏',
  'Thank you for your review, we will pass it on to {specialist}.',
  'We are sorry it went that way. Please write to us and we will sort it out.',
]

interface ReplyContext {
  /** «Asel T.» on the review: the first name is used. */
  authorName: string
  /** The master's full name: the first name is used. */
  specialistName: string
  serviceName: string
}

const firstWord = (text: string) => text.trim().split(/\s+/)[0] ?? ''

/**
 * Fills `{name}`, `{specialist}` and `{service}` (any case) with the client's first name, the
 * master's first name and the service; an unknown value leaves a readable sentence («your
 * specialist»). Templates saved before the app spoke English use `{имя}`, `{мастер}` and
 * `{услуга}`, so those are filled the same way.
 */
const fillReplyTemplate = (template: string, context: ReplyContext) =>
  template
    .replace(/\{(?:name|имя)\}/giu, firstWord(context.authorName) || 'there')
    .replace(/\{(?:specialist|мастер)\}/giu, firstWord(context.specialistName) || 'your specialist')
    .replace(/\{(?:service|услуга)\}/giu, context.serviceName.trim().toLowerCase() || 'the service')
    .replace(/[ \t]{2,}/g, ' ')
    // The pill editor may leave a space before punctuation («Thank you, Asel !»).
    .replace(/[ \t]+([!?.,:;])/g, '$1')
    .trim()

export {
  DEFAULT_AUTO_TEMPLATE,
  DEFAULT_QUICK_REPLIES,
  fillReplyTemplate,
  MAX_QUICK_REPLIES,
  MAX_TEMPLATE_LENGTH,
}
export type { ReplyContext }
