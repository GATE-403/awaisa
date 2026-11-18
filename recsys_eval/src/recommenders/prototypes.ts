import { interestsOf } from '../../../apps/api/src/recommendations/recommend-score.ts'
import { DAY_MS } from '../data/split.ts'
import type { Context, Recommender, User, Visit } from '../types.ts'
import { productionScores } from './production.ts'
import { selectShelf } from './shelf.ts'

// Prototypes from docs/recsys/roadmap.md, built as small changes on top of the production score
// (each candidate's production score, adjusted, then the same shelf rules), so a difference in
// the report is that change alone. None of this runs in the app.

const normalize = (name: string) => name.toLowerCase().replace(/ё/g, 'е').trim()

// --- 1. «После этой услуги берут ту» by service, not by kind ---------------------------------

const PAIR_WINDOW_DAYS = 60
const MIN_SUPPORT = 3
const RECENT_DAYS = 90

type PairTable = Map<string, Map<string, number>>

/** Lift of «name B within two months after name A» among the clients who had A. */
const coVisitLifts = (train: Visit[], context: Context): PairTable => {
  const byClient = new Map<string, { name: string; time: number }[]>()
  for (const visit of train) {
    const item = context.byId.get(visit.serviceId)
    if (!item) continue
    const list = byClient.get(visit.client) ?? []
    list.push({ name: normalize(item.name), time: visit.time })
    byClient.set(visit.client, list)
  }
  const had = new Map<string, number>()
  const pairs = new Map<string, number>()
  for (const list of byClient.values()) {
    list.sort((first, second) => first.time - second.time)
    for (const name of new Set(list.map((entry) => entry.name))) {
      had.set(name, (had.get(name) ?? 0) + 1)
    }
    const seen = new Set<string>()
    for (const [index, first] of list.entries()) {
      for (const second of list.slice(index + 1)) {
        if (second.time - first.time > PAIR_WINDOW_DAYS * DAY_MS) break
        if (second.name !== first.name) seen.add(`${first.name}\u0000${second.name}`)
      }
    }
    for (const key of seen) pairs.set(key, (pairs.get(key) ?? 0) + 1)
  }
  const clients = byClient.size
  const table: PairTable = new Map()
  for (const [key, support] of pairs) {
    if (support < MIN_SUPPORT) continue
    const [from, to] = key.split('\u0000') as [string, string]
    const lift = support / (had.get(from) ?? 1) / ((had.get(to) ?? 1) / clients)
    if (lift <= 1) continue
    const row = table.get(from) ?? new Map<string, number>()
    row.set(to, lift)
    table.set(from, row)
  }
  return table
}

const coVisitBoost = (table: PairTable, user: User, context: Context, name: string) => {
  let best = 0
  for (const visit of user.history) {
    if (context.now - visit.time > RECENT_DAYS * DAY_MS) break
    const from = context.byId.get(visit.serviceId)
    const lift = from ? (table.get(normalize(from.name))?.get(normalize(name)) ?? 0) : 0
    if (lift > best) best = lift
  }
  return best > 1 ? Math.min(3, 1.5 * Math.log2(best)) : 0
}

// --- 2. The client's own rhythm instead of one 28-day cycle -----------------------------------

const DEFAULT_CYCLE = 28

const medianGap = (times: number[]) => {
  if (times.length < 2) return null
  const sorted = [...times].sort((first, second) => first - second)
  const gaps = sorted.slice(1).map((time, index) => (time - (sorted[index] as number)) / DAY_MS)
  gaps.sort((first, second) => first - second)
  return gaps[Math.floor(gaps.length / 2)] ?? null
}

/** The production «Пора снова» part swapped for one on the client's own gap (service, then kind). */
const cycleCorrection = (user: User, context: Context, serviceId: string) => {
  const own = user.history.filter((visit) => visit.serviceId === serviceId)
  const last = own[0]
  const item = context.byId.get(serviceId)
  if (!last || !item) return 0
  const daysAgo = Math.floor((context.now - last.time) / DAY_MS)
  const productionCycle = item.rebookDays ?? DEFAULT_CYCLE
  const productionPart = daysAgo >= productionCycle * 0.85 ? 5 : -2
  const kinds = interestsOf(item.name)
  const sameKind = user.history.filter((visit) => {
    const other = context.byId.get(visit.serviceId)
    return other ? interestsOf(other.name).some((kind) => kinds.includes(kind)) : false
  })
  const personal =
    medianGap(own.map((visit) => visit.time)) ?? medianGap(sameKind.map((visit) => visit.time))
  if (personal === null) return 0
  // Due from 85% of their own gap; long overdue (three gaps) is likely a lost habit, not a need.
  const ratio = daysAgo / Math.max(personal, 7)
  const personalPart = ratio >= 0.85 && ratio <= 3 ? 5 : ratio < 0.85 ? -2 : 1
  return personalPart - productionPart
}

// --- 3. The client's usual services: a habit, not only a due date ----------------------------

// People book a few days ahead, so a visit due within a week is already worth showing.
const LOOKAHEAD_DAYS = 7

/** The production «Пора снова / рано» part swapped for one that treats repeats as a habit. */
const usualBoost = (user: User, context: Context, serviceId: string) => {
  const own = user.history.filter((visit) => visit.serviceId === serviceId)
  const last = own[0]
  const item = context.byId.get(serviceId)
  if (!last || !item) return 0
  const daysAgo = Math.floor((context.now - last.time) / DAY_MS)
  const cycle = item.rebookDays ?? DEFAULT_CYCLE
  const productionPart = daysAgo >= cycle * 0.85 ? 5 : -2
  const usualPart = daysAgo + LOOKAHEAD_DAYS >= cycle * 0.85 ? 5 : daysAgo < LOOKAHEAD_DAYS ? -2 : 1
  return usualPart - productionPart + Math.min(own.length - 1, 3)
}

// --- Variants ------------------------------------------------------------------------------

type Delta = (user: User, context: Context, serviceId: string, serviceName: string) => number

// Scores are changed before the shelf rules (two per place, one per name, the new-place spot),
// which stay exactly as in production — see shelf.ts.
const adjusted = (
  name: string,
  description: string,
  delta: Delta,
  prepare?: (context: Context, train: Visit[]) => void,
): Recommender => ({
  name,
  description,
  prepare,
  recommend: (user, context, k) =>
    selectShelf(
      productionScores(user, context).map(({ candidate, score }) => ({
        candidate,
        score: score + delta(user, context, candidate.serviceId, candidate.name),
      })),
      k,
    ).map((candidate) => candidate.serviceId),
})

const makePrototypes = () => {
  let table: PairTable = new Map()
  const prepare = (context: Context, train: Visit[]) => {
    table = coVisitLifts(train, context)
  }
  return [
    adjusted(
      'proto-covisit',
      'score-v1 + «после этой услуги берут ту» по услугам (lift за 60 дней, ≥3 клиента).',
      (user, context, _id, name) => coVisitBoost(table, user, context, name),
      prepare,
    ),
    adjusted(
      'proto-own-cycle',
      'score-v1, но «Пора снова» по личному ритму клиента (медиана его интервалов).',
      (user, context, id) => cycleCorrection(user, context, id),
    ),
    adjusted(
      'proto-usual',
      'score-v1, но свои прошлые услуги — привычка: «пора» с запасом в неделю, +1 за каждый повтор (до +3).',
      (user, context, id) => usualBoost(user, context, id),
    ),
    adjusted(
      'proto-usual+covisit',
      'proto-usual и proto-covisit вместе.',
      (user, context, id, name) =>
        usualBoost(user, context, id) + coVisitBoost(table, user, context, name),
      prepare,
    ),
  ]
}

export { coVisitLifts, cycleCorrection, makePrototypes, medianGap, usualBoost }
