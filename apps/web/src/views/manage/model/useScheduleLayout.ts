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

// «Колонки» or «Лента» for the cabinet's schedule, kept on this device. The server renders the
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
