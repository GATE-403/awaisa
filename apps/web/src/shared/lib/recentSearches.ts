import { isArray, onlyStrings, readJson, removeKey, writeJson } from './storage'

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

// Blocked or broken storage: nothing recent.
const readRecentSearches = (): string[] => onlyStrings(readJson(RECENT_KEY, isArray))

const writeRecentSearches = (list: string[]) => {
  if (list.length === 0) removeKey(RECENT_KEY)
  else writeJson(RECENT_KEY, list)
}

const rememberSearch = (query: string) =>
  writeRecentSearches(addRecent(readRecentSearches(), query))

export { addRecent, readRecentSearches, rememberSearch, writeRecentSearches }
