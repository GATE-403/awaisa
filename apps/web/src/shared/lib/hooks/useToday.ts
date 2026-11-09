'use client'

import { useSyncExternalStore } from 'react'
import { PLATFORM } from '@/shared/config/platform'

type Today = {
  dayKey: string
  minutes: number
}

const MINUTE_MS = 60_000

const subscribe = (onChange: () => void) => {
  const interval = window.setInterval(onChange, MINUTE_MS)
  return () => window.clearInterval(interval)
}

const pad = (value: number) => String(value).padStart(2, '0')

const getSnapshot = () => {
  const businessNow = new Date(Date.now() + PLATFORM.utcOffsetMinutes * MINUTE_MS)
  const dayKey = `${businessNow.getUTCFullYear()}-${pad(businessNow.getUTCMonth() + 1)}-${pad(businessNow.getUTCDate())}`

  return `${dayKey}|${businessNow.getUTCHours() * 60 + businessNow.getUTCMinutes()}`
}

const getServerSnapshot = () => null

export const useToday = (): Today | null => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  if (!snapshot) return null

  const [dayKey = '', minutes = '0'] = snapshot.split('|')
  return { dayKey, minutes: Number(minutes) }
}
