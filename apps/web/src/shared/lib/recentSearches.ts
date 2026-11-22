const RECENT_KEY = 'awaisa:recent-searches:v1'
const MAX_RECENT = 5

/** Newest first, no repeats regardless of case, at most five. */
const addRecent = (list: string[], query: string) => {
  const trimmed = query.trim()
  if (!trimmed) return list
  const key = trimmed.toLocaleLowerCase('ru')
  return [trimmed, ...list.filter((item) => item.toLocaleLowerCase('ru') !== key)].slice(
    0,
    MAX_RECENT,
  )
}

const readRecentSearches = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    // Blocked or broken storage: nothing recent.
    return []
  }
}

const writeRecentSearches = (list: string[]) => {
  try {
    if (list.length === 0) window.localStorage.removeItem(RECENT_KEY)
    else window.localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    // Same as above.
  }
}

const rememberSearch = (query: string) =>
  writeRecentSearches(addRecent(readRecentSearches(), query))

export { addRecent, readRecentSearches, rememberSearch, writeRecentSearches }
