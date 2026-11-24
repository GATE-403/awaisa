import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { CSSProperties } from 'react'

// The colour a client picks for their profile (the API keeps the key): a soft wash at the top of
// the page and the level line. Drawn from system tokens, in both themes.
const ACCENTS: Record<string, { label: MessageDescriptor; color: string }> = {
  blue: { label: msg`Blue`, color: 'var(--system-blue)' },
  indigo: { label: msg`Indigo`, color: 'var(--system-indigo)' },
  purple: { label: msg`Purple`, color: 'var(--system-purple)' },
  pink: { label: msg`Pink`, color: 'var(--system-pink)' },
  red: { label: msg`Red`, color: 'var(--system-red)' },
  orange: { label: msg`Orange`, color: 'var(--system-orange)' },
  green: { label: msg`Green`, color: 'var(--system-green)' },
  teal: { label: msg`Teal`, color: 'var(--system-teal)' },
}

/** CSS variables for a profile's look: `--accent`. */
const profileStyle = (accent: string) =>
  ({ '--accent': ACCENTS[accent]?.color ?? 'var(--system-blue)' }) as CSSProperties

/** Emoji for the status, picked from a short list like Discord's custom status. */
const STATUS_EMOJI = [
  '✨',
  '💇‍♀️',
  '💈',
  '💅',
  '💆‍♀️',
  '🧖‍♀️',
  '🌸',
  '🔥',
  '😎',
  '💪',
  '☕',
  '🎉',
  '👑',
  '🌿',
  '💖',
  '🧘‍♀️',
]

export { ACCENTS, profileStyle, STATUS_EMOJI }
