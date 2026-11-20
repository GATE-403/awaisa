// Reviews come ten at a time: a long feed scrolled forever («слишком долго скролить»).
const PAGE_SIZE = 10

// Which good reviews get the automatic reply.
const AUTO_REPLY_RATINGS = [
  { value: 5 as const, label: 'Только 5 ★' },
  { value: 4 as const, label: '4 и 5 ★' },
]

// What a reply template can say about the review, shown as pills instead of `{имя}` («что за {имя}
// … не понятно»). The keys are what the API fills in.
const TEMPLATE_TOKENS = [
  { key: 'имя', label: 'Имя клиента' },
  { key: 'мастер', label: 'Мастер' },
  { key: 'услуга', label: 'Услуга' },
] as const

// Ratings from this one down ask the owner to settle it with the client in person.
const POOR_RATING = 3

const REVIEW_WORDS = ['отзыв', 'отзыва', 'отзывов'] as const

export { AUTO_REPLY_RATINGS, PAGE_SIZE, POOR_RATING, REVIEW_WORDS, TEMPLATE_TOKENS }
