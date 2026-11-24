type ChoiceParts = {
  /** The visit's services in order (the first names the visit). */
  services: string[]
  /** The master's line: their first name, Any specialist, or nothing yet. */
  master: string | null
  /** "Mon 23 Nov, 10:00", once day and time are picked. */
  when: string | null
}

// What the booking bar says while steps remain: what is chosen so far, short enough for one line
// beside the action. Several services read as the first and how many join it (two names in full
// pushed the master out of the line).
const choiceLine = ({ services, master, when }: ChoiceParts) => {
  const [first, ...added] = services
  const service = first ? (added.length ? `${first} +${added.length}` : first) : null

  return [service, master, when].filter(Boolean).join(' · ')
}

export { choiceLine }
