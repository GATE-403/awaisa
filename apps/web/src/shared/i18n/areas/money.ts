import type { CountedEntry, Entry } from './types'

// The cabinet's money: «Касса», sales, receipts, stock, loyalty and promotions.
const MONEY: Record<string, Entry> = {}

const MONEY_COUNTED: Record<string, CountedEntry> = {}

export { MONEY, MONEY_COUNTED }
