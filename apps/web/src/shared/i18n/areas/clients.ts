import type { CountedEntry, Entry } from './types'

// The cabinet's clients (cards, import, mailings) and reviews (replies, questions).
const CLIENTS: Record<string, Entry> = {}

const CLIENTS_COUNTED: Record<string, CountedEntry> = {}

export { CLIENTS, CLIENTS_COUNTED }
