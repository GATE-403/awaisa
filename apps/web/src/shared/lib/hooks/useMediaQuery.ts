'use client'

import { useSyncExternalStore } from 'react'

// Whether a media query matches now, kept in sync with the screen; false on the server.
export const useMediaQuery = (query: string) =>
  useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
