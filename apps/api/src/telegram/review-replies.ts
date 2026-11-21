// Answering a review from the owners' Telegram chat: the buttons under «Новый отзыв», what their
// data says, and the bot's lines. Pure, unit-tested.

const QUICK = 'rq'
const OWN = 'rw'
// A button shows about this much of a quick reply; the reply itself is sent whole.
const BUTTON_TEXT_LENGTH = 40

type ReviewCallback =
  | { kind: 'quick'; reviewId: string; index: number }
  | { kind: 'own'; reviewId: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const shorten = (text: string, length: number) =>
  text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…`

/**
 * The keyboard under a new review: a button per quick reply (already filled with the client's name),
 * «✍️ Свой ответ», and the cabinet when its address is https (Telegram refuses other links).
 */
const reviewKeyboard = (reviewId: string, quickReplies: string[], cabinetUrl: string | null) => ({
  inline_keyboard: [
    ...quickReplies.map((text, index) => [
      { text: shorten(text, BUTTON_TEXT_LENGTH), callback_data: `${QUICK}:${reviewId}:${index}` },
    ]),
    [{ text: '✍️ Свой ответ', callback_data: `${OWN}:${reviewId}` }],
    ...(cabinetUrl?.startsWith('https://')
      ? [[{ text: 'Открыть в кабинете', url: cabinetUrl }]]
      : []),
  ],
})

/** A button's data back into what it asks for; anything else (or tampered) is null. */
const parseReviewCallback = (data: string | undefined): ReviewCallback | null => {
  const [kind, reviewId = '', index] = (data ?? '').split(':')
  if (!UUID.test(reviewId)) return null
  if (kind === OWN && index === undefined) return { kind: 'own', reviewId }
  if (kind === QUICK && index !== undefined && /^\d$/.test(index)) {
    return { kind: 'quick', reviewId, index: Number(index) }
  }
  return null
}

const replyPromptText = (authorName: string, rating: number) =>
  `✍️ Ответ на отзыв <b>${escapeHtml(authorName)}</b> ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}\nНапишите его ответом на это сообщение: он появится на странице места.`

const repliedText = (text: string) => `✅ Ответ опубликован:\n«${escapeHtml(text)}»`

const ALREADY_ANSWERED = 'На этот отзыв уже ответили.'
const NOT_YOURS = 'Этот отзыв не из вашего бизнеса.'
const REPLY_PLACEHOLDER = 'Ваш ответ клиенту'

export type { ReviewCallback }
export {
  ALREADY_ANSWERED,
  NOT_YOURS,
  parseReviewCallback,
  REPLY_PLACEHOLDER,
  repliedText,
  replyPromptText,
  reviewKeyboard,
}
