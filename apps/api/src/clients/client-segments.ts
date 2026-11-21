// The client base cut into the groups an owner acts on, and its orders. Pure, unit-tested; the
// «давно не были» and birthday rules are the mailing's own, so a segment's count is who a mailing
// to it reaches (less those who turned SMS off).

type ClientSegment = 'all' | 'upcoming' | 'new' | 'regular' | 'lapsed' | 'noShows' | 'birthday'
type ClientSort = 'recent' | 'spent' | 'visits' | 'name'

type SegmentedClient = {
  name: string
  visits: number
  noShows: number
  spent: number
  /** ISO moments, or null. */
  lastVisit: string | null
  nextVisit: string | null
  /** YYYY-MM-DD from the client's card, or null. */
  birthday: string | null
}

const SEGMENTS: ClientSegment[] = [
  'all',
  'upcoming',
  'new',
  'regular',
  'lapsed',
  'noShows',
  'birthday',
]

/** No visit for this many days and nothing booked: the mailing's «Давно не были» default. */
const LAPSED_DAYS = 60
/** Three visits and more make a regular. */
const REGULAR_VISITS = 3
const BIRTHDAY_WINDOW_DAYS = 7
const DAY_MS = 86_400_000

/** Days from `today` (YYYY-MM-DD) to the next `birthday` (YYYY-MM-DD), across the new year. */
const daysUntilBirthday = (birthday: string, today: string) => {
  const [year = 2000, month = 1, day = 1] = today.split('-').map(Number)
  const [, birthMonth = 1, birthDay = 1] = birthday.split('-').map(Number)
  const start = Date.UTC(year, month - 1, day)
  let next = Date.UTC(year, birthMonth - 1, birthDay)
  if (next < start) next = Date.UTC(year + 1, birthMonth - 1, birthDay)
  return Math.round((next - start) / DAY_MS)
}

const isIn = (client: SegmentedClient, segment: ClientSegment, now: number, today: string) => {
  switch (segment) {
    case 'all':
      return true
    case 'upcoming':
      return client.nextVisit !== null
    case 'new':
      return client.visits === 1
    case 'regular':
      return client.visits >= REGULAR_VISITS
    case 'lapsed':
      return (
        client.nextVisit === null &&
        client.lastVisit !== null &&
        now - new Date(client.lastVisit).getTime() > LAPSED_DAYS * DAY_MS
      )
    case 'noShows':
      return client.noShows > 0
    case 'birthday':
      return (
        client.birthday !== null &&
        daysUntilBirthday(client.birthday, today) <= BIRTHDAY_WINDOW_DAYS
      )
  }
}

const collator = new Intl.Collator('ru')
const time = (value: string | null) => (value ? new Date(value).getTime() : 0)

// «recent»: the latest visit first, those who never came after (by their booking, then name);
// the rest by what they bring or by name.
const compare = (sort: ClientSort) => (left: SegmentedClient, right: SegmentedClient) => {
  if (sort === 'spent') return right.spent - left.spent || collator.compare(left.name, right.name)
  if (sort === 'visits') return right.visits - left.visits || right.spent - left.spent
  if (sort === 'name') return collator.compare(left.name, right.name)
  return (
    time(right.lastVisit) - time(left.lastVisit) ||
    time(left.nextVisit) - time(right.nextVisit) ||
    collator.compare(left.name, right.name)
  )
}

/** The clients of one segment in the asked order, and how many each segment holds. */
const segmentClients = <Client extends SegmentedClient>(
  clients: Client[],
  segment: ClientSegment,
  sort: ClientSort,
  now: Date,
  today: string,
) => {
  const at = now.getTime()
  const counts = Object.fromEntries(
    SEGMENTS.map((key) => [key, clients.filter((client) => isIn(client, key, at, today)).length]),
  ) as Record<ClientSegment, number>
  const items = clients.filter((client) => isIn(client, segment, at, today)).sort(compare(sort))

  return { items, counts }
}

export type { ClientSegment, ClientSort, SegmentedClient }
export { LAPSED_DAYS, SEGMENTS, segmentClients }
