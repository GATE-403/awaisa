'use client'

import { useEffect } from 'react'
import { reportError } from '@/shared/lib/telemetry'

// Uncaught errors and rejected promises in the browser reach /telemetry/errors, so a booking
// that breaks on someone's phone is seen without them having to tell us.
export const ErrorReporter = () => {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Script errors from other origins carry no details: nothing to act on.
      if (event.message === 'Script error.' && !event.error) return
      reportError(event.error ?? event.message)
    }
    const handleRejection = (event: PromiseRejectionEvent) => {
      // Aborted fetches are the app changing its mind, not a failure.
      if (event.reason instanceof DOMException && event.reason.name === 'AbortError') return
      reportError(event.reason)
    }
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}
