import type { CountedEntry, Entry } from './types'

// The owners' landing `/business` and the setup `/business/new`; also `/insights` and `/moderation`.
const FOR_BUSINESS: Record<string, Entry> = {}

const FOR_BUSINESS_COUNTED: Record<string, CountedEntry> = {}

export { FOR_BUSINESS, FOR_BUSINESS_COUNTED }
