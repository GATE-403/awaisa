'use client'

import { useSyncExternalStore } from 'react'

const SCROLL_THRESHOLD = 4

const subscribe = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => window.removeEventListener('scroll', onChange)
}

const getSnapshot = () => window.scrollY > SCROLL_THRESHOLD

const getServerSnapshot = () => false

export const useIsScrolled = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
