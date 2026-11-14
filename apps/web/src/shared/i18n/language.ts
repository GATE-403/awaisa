'use client'

import { useSyncExternalStore } from 'react'
import { DEFAULT_LANGUAGE, type Language } from '@/shared/config/languages'

type LanguageCode = Language['code']

const STORAGE_KEY = 'awaisa:lang:v1'
const listeners = new Set<() => void>()
let current: LanguageCode | null = null

const isLanguage = (value: unknown): value is LanguageCode =>
  value === 'ru' || value === 'ky' || value === 'en'

const read = (): LanguageCode => {
  if (current) return current
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    current = isLanguage(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    current = DEFAULT_LANGUAGE
  }
  return current
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// The server always renders Russian (pages are prerendered for everyone); the chosen language
// takes over right after hydration through the client snapshot.
const useLanguage = () => useSyncExternalStore(subscribe, read, () => DEFAULT_LANGUAGE)

const setLanguage = (language: LanguageCode) => {
  current = language
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Private mode: the choice lasts until the page closes.
  }
  document.documentElement.lang = language
  for (const listener of listeners) listener()
}

export type { LanguageCode }
export { setLanguage, useLanguage }
