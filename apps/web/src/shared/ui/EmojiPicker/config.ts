// Emojibase data through our own origin (`next.config.ts` rewrites it to a pinned version), so the
// browser asks no third party and the version cannot change under us.
const EMOJI_DATA_URL = '/emoji-data'
const EMOJIBASE_VERSION = '18.0.0'

const EMOJI_COLUMNS = 8

export { EMOJI_COLUMNS, EMOJI_DATA_URL, EMOJIBASE_VERSION }
