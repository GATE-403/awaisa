import { msg } from '@lingui/core/macro'

// Reviews come ten at a time: a long feed scrolled forever ("too long to scroll").
const PAGE_SIZE = 10

// Which good reviews get the automatic reply.
const AUTO_REPLY_RATINGS = [
  { value: 5 as const, label: msg`5 ★ only` },
  { value: 4 as const, label: msg`4 and 5 ★` },
]

// What a reply template can say about the review, shown as pills instead of `{name}` ("what is
// {name} … isn't clear"). The keys are what the API fills in; templates saved before the app spoke
// English carry the Russian keys, which the API still fills, so they show as the same pills.
const TEMPLATE_TOKENS = [
  { key: 'name', aliases: ['имя'], label: msg`Client name` },
  { key: 'specialist', aliases: ['мастер'], label: msg`Specialist` },
  { key: 'service', aliases: ['услуга'], label: msg`Service` },
] as const

// Ratings from this one down ask the owner to settle it with the client in person.
const POOR_RATING = 3

export { AUTO_REPLY_RATINGS, PAGE_SIZE, POOR_RATING, TEMPLATE_TOKENS }
