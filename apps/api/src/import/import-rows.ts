// Exports from Altegio and YCLIENTS (and spreadsheets edited by hand) write dates and times
// in several ways; these turn them into ours or say why a row cannot be read.

/** 15.11.2026, 15/11/2026, 15-11-26, 2026-11-15 (optionally followed by a time) → 2026-11-15. */
const parseDate = (raw: string): string | null => {
  const value = raw.trim()
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  const local = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})(?!\d)/)
  const [year, month, day] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : local
      ? [
          Number(local[3].length === 2 ? `20${local[3]}` : local[3]),
          Number(local[2]),
          Number(local[1]),
        ]
      : [0, 0, 0]
  if (!year) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.toISOString().slice(0, 10)
}

/** 9:30, 09.30, 14:00:00, or the time inside «15.11.2026 14:00» → 09:30. */
const parseTime = (raw: string): string | null => {
  const match = raw.trim().match(/(?:^|\s)(\d{1,2})[:.](\d{2})(?::\d{2})?\s*$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Names compared the way people type them: case, ё, extra spaces and quotes do not matter. */
const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * A service or master by name. An exact match wins; a record listing several services
 * («Стрижка, Укладка») takes the first one we know; a master may be written by first name only.
 */
const matchByName = <T extends { name: string }>(items: T[], raw: string): T | null => {
  const wanted = normalizeName(raw)
  if (!wanted) return null
  const exact = items.find((item) => normalizeName(item.name) === wanted)
  if (exact) return exact
  for (const part of wanted.split(/[,;+]/).map((item) => item.trim())) {
    const found = items.find((item) => normalizeName(item.name) === part)
    if (found) return found
  }
  const byFirstWord = items.filter((item) => normalizeName(item.name).split(' ')[0] === wanted)
  return byFirstWord.length === 1 ? byFirstWord[0] : null
}

export { matchByName, normalizeName, parseDate, parseTime }
