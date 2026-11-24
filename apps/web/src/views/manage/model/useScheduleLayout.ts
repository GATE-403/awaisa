'use client'

import { useSyncExternalStore } from 'react'
import type { CalendarLayout } from '@/widgets/DayCalendar'

const KEY = 'awaisa:schedule-view:v1'
const EVENT = 'awaisa:schedule-view'

const read = (): CalendarLayout => {
  try {
    return window.localStorage.getItem(KEY) === 'timeline' ? 'timeline' : 'columns'
  } catch {
    return 'columns'
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

// "Columns" or "Timeline" for the cabinet's schedule, kept on this device. The server renders the
// columns; a saved timeline takes over after hydration.
export const useScheduleLayout = () => {
  const layout = useSyncExternalStore(subscribe, read, () => 'columns' as CalendarLayout)

  const setLayout = (next: CalendarLayout) => {
    try {
      window.localStorage.setItem(KEY, next)
    } catch {
      // Private mode: the choice lasts until the page is left.
    }
    window.dispatchEvent(new Event(EVENT))
  }

  return { layout, setLayout }
}

const WIDE_KEY = 'awaisa:schedule-wide:v1'
const WIDE_EVENT = 'awaisa:schedule-wide'

const readWide = () => {
  try {
    return window.localStorage.getItem(WIDE_KEY) === '1'
  } catch {
    return false
  }
}

const subscribeWide = (onChange: () => void) => {
  window.addEventListener(WIDE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(WIDE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

// The schedule's board at the cabinet's width or across the whole window, kept on this device.
export const useScheduleWide = () => {
  const isWide = useSyncExternalStore(subscribeWide, readWide, () => false)

  const setWide = (next: boolean) => {
    try {
      window.localStorage.setItem(WIDE_KEY, next ? '1' : '0')
    } catch {
      // Private mode: the choice lasts until the page is left.
    }
    window.dispatchEvent(new Event(WIDE_EVENT))
  }

  return { isWide, setWide }
}
