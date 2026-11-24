'use client'

import { readJson, removeKey, writeJson } from '@/shared/lib/storage'

type BookingDraft = {
  slug: string
  businessName: string
  serviceId: string
  serviceName: string
  specialistId: string | null
  branchId: string | null
  /** The chosen time, so resuming lands on it (missing in drafts saved before it was kept). */
  date?: string | null
  time?: string | null
  /** How many of the four steps are done: service, master, time, contacts. */
  stepsDone?: number
  updatedAt: number
}

const DRAFT_STEPS = 4

const STORAGE_KEY = 'awaisa:booking-draft:v1'
const MAX_AGE_MS = 24 * 60 * 60_000
const EVENT = 'awaisa:booking-draft'

const isObject = (value: unknown): value is BookingDraft =>
  typeof value === 'object' && value !== null

const readDraft = (): BookingDraft | null => {
  const draft = readJson(STORAGE_KEY, isObject)
  if (!draft?.slug || !draft.serviceId || Date.now() - draft.updatedAt > MAX_AGE_MS) return null

  return draft
}

const notify = () => window.dispatchEvent(new Event(EVENT))

// A booking left half-way is kept on the device, so the client can pick it up again.
// Storage may be unavailable (private mode): resuming is a convenience only.
const saveDraft = (draft: Omit<BookingDraft, 'updatedAt'>) => {
  if (writeJson(STORAGE_KEY, { ...draft, updatedAt: Date.now() })) notify()
}

const clearDraft = () => {
  if (removeKey(STORAGE_KEY)) notify()
}

const draftHref = (draft: BookingDraft) => {
  const params = new URLSearchParams({ service: draft.serviceId })
  if (draft.specialistId) params.set('specialist', draft.specialistId)
  if (draft.branchId) params.set('branch', draft.branchId)
  if (draft.date && draft.time) {
    params.set('date', draft.date)
    params.set('time', draft.time)
  }

  return `/${draft.slug}/book?${params}`
}

const subscribeToDraft = (onChange: () => void) => {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)

  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export type { BookingDraft }
export { clearDraft, DRAFT_STEPS, draftHref, readDraft, saveDraft, subscribeToDraft }
