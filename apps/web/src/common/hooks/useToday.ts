import { useSyncExternalStore } from 'react'

type Today = {
  dayKey: string
  minutes: number
}

const MINUTE_MS = 60_000

const subscribe = (onChange: () => void) => {
  const interval = window.setInterval(onChange, MINUTE_MS)
  return () => window.clearInterval(interval)
}

const getSnapshot = () => {
  const now = new Date()
  const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return `${dayKey}|${now.getHours() * 60 + now.getMinutes()}`
}

const getServerSnapshot = () => null

export const useToday = (): Today | null => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  if (!snapshot) return null

  const [dayKey = '', minutes = '0'] = snapshot.split('|')
  return { dayKey, minutes: Number(minutes) }
}
