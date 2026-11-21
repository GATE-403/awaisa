// Reply templates a business writes once instead of answering every review by hand: an automatic
// reply to good reviews and quick replies offered above the reply field. Pure, unit-tested.

const MAX_TEMPLATE_LENGTH = 500
const MAX_QUICK_REPLIES = 6

// No name after a preposition: Russian would want a declension a template cannot make («у Максат»).
const DEFAULT_AUTO_TEMPLATE = 'Спасибо, {имя}! Рады, что вам понравилось. Ждём вас снова 🙏'

const DEFAULT_QUICK_REPLIES = [
  'Спасибо, {имя}! Ждём вас снова 🙏',
  'Спасибо за отзыв, передадим мастеру {мастер}.',
  'Нам жаль, что так вышло. Напишите нам, пожалуйста, разберёмся.',
]

interface ReplyContext {
  /** «Асель Т.» on the review: the first name is used. */
  authorName: string
  /** The master's full name: the first name is used. */
  specialistName: string
  serviceName: string
}

const firstWord = (text: string) => text.trim().split(/\s+/)[0] ?? ''

/**
 * Fills `{имя}`, `{мастер}` and `{услуга}` (any case) with the client's first name, the master's
 * first name and the service; an unknown value leaves a readable sentence («у мастера»).
 */
const fillReplyTemplate = (template: string, context: ReplyContext) =>
  template
    .replace(/\{имя\}/giu, firstWord(context.authorName) || 'гость')
    .replace(/\{мастер\}/giu, firstWord(context.specialistName) || 'мастера')
    .replace(/\{услуга\}/giu, context.serviceName.trim().toLowerCase() || 'услуга')
    .replace(/[ \t]{2,}/g, ' ')
    // The pill editor may leave a space before punctuation («Спасибо, Асель !»).
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
