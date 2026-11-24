'use client'

import { useSyncExternalStore } from 'react'

const subscribe = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true })
  window.addEventListener('resize', onChange)
  return () => {
    window.removeEventListener('scroll', onChange)
    window.removeEventListener('resize', onChange)
  }
}

// Whether the page has scrolled past its first screen: where «To top» starts to be worth a tap.
const getSnapshot = () => window.scrollY > window.innerHeight

const getServerSnapshot = () => false

export const useIsScrolledPast = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
