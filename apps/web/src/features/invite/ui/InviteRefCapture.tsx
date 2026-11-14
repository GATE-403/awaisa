'use client'

import { useEffect } from 'react'
import { rememberRef } from '../lib/inviteRef'

// Any page opened from a friend's link remembers who invited (read from the URL after mount, so
// prerendered pages stay static).
export const InviteRefCapture = () => {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) rememberRef(ref)
  }, [])

  return null
}
