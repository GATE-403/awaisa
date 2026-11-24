// localStorage may be missing (server render), blocked (private mode, site data off) or full,
// and a stored value may be from an older version or broken: every read falls back to null and
// every write reports whether it was kept, never throws.

const readText = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** The stored JSON, or null when it is missing, unreadable or fails `guard`. */
const parseJson = <T>(raw: string | null, guard?: (value: unknown) => value is T): T | null => {
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (guard && !guard(value)) return null
    return value as T
  } catch {
    return null
  }
}

const readJson = <T>(key: string, guard?: (value: unknown) => value is T): T | null =>
  parseJson(readText(key), guard)

/** True when the value was kept. */
const writeJson = (key: string, value: unknown): boolean => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const removeKey = (key: string): boolean => {
  try {
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/** A guard for lists of strings: anything else in the list is dropped by the caller. */
const isArray = (value: unknown): value is unknown[] => Array.isArray(value)

const onlyStrings = (list: unknown[] | null): string[] =>
  (list ?? []).filter((item): item is string => typeof item === 'string')

export { isArray, onlyStrings, parseJson, readJson, readText, removeKey, writeJson }
