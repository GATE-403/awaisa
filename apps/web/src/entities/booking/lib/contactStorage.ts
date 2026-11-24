import { readJson, writeJson } from '@/shared/lib/storage'

// A guest's name and number from their last booking, so the next one needs no typing.
// Only on this device; signed-in clients use their account instead.
type StoredContact = { name: string; phone: string }

const CONTACT_KEY = 'awaisa:contact:v1'

const isContact = (value: unknown): value is StoredContact =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as StoredContact).name === 'string' &&
  typeof (value as StoredContact).phone === 'string'

const readContact = (): StoredContact | null => readJson(CONTACT_KEY, isContact)

// Storage may be unavailable; the booking itself is already saved.
const saveContact = (contact: StoredContact) => {
  writeJson(CONTACT_KEY, contact)
}

export type { StoredContact }
export { readContact, saveContact }
