'use client'

import { useEffect, useRef, useState } from 'react'
import {
  checkTelegramLogin,
  getTelegramLoginConfig,
  startTelegramLogin,
} from '@/shared/api/clientApi'
import type { Customer } from '@/shared/api/types'

// A fresh link a minute before the API's 10 minutes run out.
const TOKEN_LIFETIME_MS = 9 * 60_000
const POLL_MS = 2000

const newToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * «Sign in with Telegram»: the page's own token is registered ahead, so the bot link is a plain
 * `<a href>` (it opens the Telegram app at once, in the WebView too, and is never blocked as a
 * pop-up); after the tap the page asks every 2 s - and on coming back - whether the number was
 * shared, then hands the customer to `onSignedIn`.
 */
export const useTelegramLogin = (onSignedIn: (customer: Customer) => void) => {
  const [bot, setBot] = useState<string | null>(null)
  // Assumed until the config answers, so the number field does not flash in and out.
  const [isCodeAvailable, setIsCodeAvailable] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const onSignedInRef = useRef(onSignedIn)

  useEffect(() => {
    onSignedInRef.current = onSignedIn
  })

  useEffect(() => {
    const controller = new AbortController()
    getTelegramLoginConfig(controller.signal)
      .then((config) => {
        setBot(config.isAvailable ? config.botUsername : null)
        setIsCodeAvailable(config.isCodeAvailable)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!bot) return
    const renew = () => {
      const next = newToken()
      setToken(next)
      void startTelegramLogin(next).catch(() => undefined)
    }
    renew()
    const interval = window.setInterval(renew, TOKEN_LIFETIME_MS)
    return () => window.clearInterval(interval)
  }, [bot])

  useEffect(() => {
    if (!isWaiting || !token) return
    let isDone = false
    const check = async () => {
      if (isDone) return
      const state = await checkTelegramLogin(token).catch(() => null)
      if (!state || isDone) return
      if (state.status === 'signedIn') {
        isDone = true
        onSignedInRef.current(state.customer)
      }
      if (state.status === 'expired') {
        isDone = true
        setIsExpired(true)
        setIsWaiting(false)
        const next = newToken()
        setToken(next)
        void startTelegramLogin(next).catch(() => undefined)
      }
    }
    const interval = window.setInterval(check, POLL_MS)
    // Back from Telegram: ask at once instead of waiting for the next tick.
    const onVisible = () => document.visibilityState === 'visible' && void check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      isDone = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isWaiting, token])

  return {
    isAvailable: Boolean(bot && token),
    /** A code to the number in Telegram can be sent (the Telegram Gateway). */
    isCodeAvailable,
    href: bot && token ? `https://t.me/${bot}?start=login_${token}` : undefined,
    isWaiting,
    isExpired,
    start: () => {
      setIsExpired(false)
      setIsWaiting(true)
    },
    cancel: () => setIsWaiting(false),
  }
}
