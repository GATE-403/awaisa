// A guest's name and number from their last booking, so the next one needs no typing.
// Only on this device; signed-in clients use their account instead.
type StoredContact = { name: string; phone: string }

const CONTACT_KEY = 'awaisa:contact:v1'

const readContact = (): StoredContact | null => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONTACT_KEY) ?? 'null') as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as StoredContact).name === 'string' &&
      typeof (parsed as StoredContact).phone === 'string'
    ) {
      return parsed as StoredContact
    }
  } catch {
    // Private mode or corrupted value: start empty.
  }
  return null
}

const saveContact = (contact: StoredContact) => {
  try {
    window.localStorage.setItem(CONTACT_KEY, JSON.stringify(contact))
  } catch {
    // Storage may be unavailable; the booking itself is already saved.
  }
}

export type { StoredContact }
export { readContact, saveContact }
