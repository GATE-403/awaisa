// The same filling as the API's `reviews/review-reply-text.ts` (the automatic reply uses that one;
// this one fills quick replies in the field and the settings' preview). Keep the two in step.

const MAX_QUICK_REPLIES = 6

interface ReplyContext {
  authorName: string
  specialistName: string
  serviceName: string
}

const firstWord = (text: string) => text.trim().split(/\s+/)[0] ?? ''

const fillReplyTemplate = (template: string, context: ReplyContext) =>
  template
    .replace(/\{имя\}/giu, firstWord(context.authorName) || 'гость')
    .replace(/\{мастер\}/giu, firstWord(context.specialistName) || 'мастера')
    .replace(/\{услуга\}/giu, context.serviceName.trim().toLowerCase() || 'услуга')
    .replace(/[ \t]{2,}/g, ' ')
    // The pill editor may leave a space before punctuation («Спасибо, Асель !»).
    .replace(/[ \t]+([!?.,:;])/g, '$1')
    .trim()

// What the settings' preview fills a template with.
const SAMPLE_REVIEW: ReplyContext = {
  authorName: 'Асель Т.',
  specialistName: 'Мээрим Сатыбалдиева',
  serviceName: 'Manicure',
}

export type { ReplyContext }
export { fillReplyTemplate, MAX_QUICK_REPLIES, SAMPLE_REVIEW }
