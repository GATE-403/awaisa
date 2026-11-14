import type { CSSProperties } from 'react'

// The colour a client picks for their profile (the API keeps the key): a soft wash at the top of
// the page and the level line. Drawn from system tokens, in both themes.
const ACCENTS: Record<string, { label: string; color: string }> = {
  blue: { label: 'Синий', color: 'var(--system-blue)' },
  indigo: { label: 'Индиго', color: 'var(--system-indigo)' },
  purple: { label: 'Фиолетовый', color: 'var(--system-purple)' },
  pink: { label: 'Розовый', color: 'var(--system-pink)' },
  red: { label: 'Красный', color: 'var(--system-red)' },
  orange: { label: 'Оранжевый', color: 'var(--system-orange)' },
  green: { label: 'Зелёный', color: 'var(--system-green)' },
  teal: { label: 'Бирюзовый', color: 'var(--system-teal)' },
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
