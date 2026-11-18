import { interestsOf } from '../../apps/api/src/recommendations/recommend-score.ts'
import type { Split } from './data/split.ts'
import { mulberry32 } from './lib/random.ts'
import {
  bootstrapInterval,
  intraListDiversity,
  type ListMetrics,
  listMetrics,
  mean,
  novelty,
} from './metrics.ts'
import type { Recommender, User } from './types.ts'

type Summary = ListMetrics & {
  users: number
  coverage: number
  diversity: number
  novelty: number
  alreadyBought: number
  /** HitRate on services new to the client, over clients who booked something new. */
  hitNew: number
  newUsers: number
  ndcgInterval: readonly [number, number]
  hitInterval: readonly [number, number]
}

type Result = {
  recommender: string
  description: string
  overall: Summary
  segments: Record<string, Summary>
  millisPerUser: number
}

type Row = ListMetrics & {
  list: string[]
  diversity: number
  novelty: number
  bought: number
  /** Whether a service new to the client that they then booked was on the list; null = nothing new booked. */
  hitNew: number | null
}

/** Who a client is at the cutoff: the cuts every metric is also read by. */
const segmentsOf = (user: User) => {
  const visits = user.history.length
  const segments = [visits === 0 ? 'cold-start' : visits <= 2 ? '1-2 визита' : '3+ визита']
  if (user.stated) segments.push('ответил анкету')
  return segments
}

const summarize = (rows: Row[], itemCount: number, seed: number): Summary => {
  const random = mulberry32(seed)
  const shown = new Set(rows.flatMap((row) => row.list))
  const ndcg = rows.map((row) => row.ndcg)
  const hit = rows.map((row) => row.hit)
  const withNew = rows.flatMap((row) => (row.hitNew === null ? [] : [row.hitNew]))
  return {
    users: rows.length,
    precision: mean(rows.map((row) => row.precision)),
    recall: mean(rows.map((row) => row.recall)),
    ndcg: mean(ndcg),
    ap: mean(rows.map((row) => row.ap)),
    hit: mean(hit),
    coverage: itemCount ? shown.size / itemCount : 0,
    diversity: mean(rows.map((row) => row.diversity)),
    novelty: mean(rows.map((row) => row.novelty)),
    alreadyBought: mean(rows.map((row) => row.bought)),
    hitNew: mean(withNew),
    newUsers: withNew.length,
    ndcgInterval: bootstrapInterval(ndcg, random),
    hitInterval: bootstrapInterval(hit, random),
  }
}

const evaluate = (split: Split, recommenders: Recommender[], k: number): Result[] => {
  const { context, cases, train } = split
  const total = [...context.popularity.values()].reduce((acc, value) => acc + value, 0)
  const categoryOf = (id: string) => {
    const item = context.byId.get(id)
    return item ? (interestsOf(item.name)[0] ?? item.kind) : ''
  }
  return recommenders.map((recommender) => {
    recommender.prepare?.(context, train)
    const started = performance.now()
    const rows = cases.map(({ user, relevant }) => {
      const list = recommender.recommend(user, context, k)
      const had = new Set(user.history.map((visit) => visit.serviceId))
      const newRelevant = new Set([...relevant].filter((id) => !had.has(id)))
      return {
        user,
        row: {
          ...listMetrics(list, relevant, k),
          list,
          diversity: intraListDiversity(list, categoryOf),
          novelty: novelty(list, context.popularity, total),
          bought: list.length ? list.filter((id) => had.has(id)).length / list.length : 0,
          hitNew: newRelevant.size ? (list.some((id) => newRelevant.has(id)) ? 1 : 0) : null,
        },
      }
    })
    const millisPerUser = cases.length ? (performance.now() - started) / cases.length : 0
    const bySegment = new Map<string, Row[]>()
    for (const { user, row } of rows) {
      for (const segment of segmentsOf(user)) {
        const list = bySegment.get(segment) ?? []
        list.push(row)
        bySegment.set(segment, list)
      }
    }
    return {
      recommender: recommender.name,
      description: recommender.description,
      overall: summarize(
        rows.map(({ row }) => row),
        context.items.length,
        1,
      ),
      segments: Object.fromEntries(
        [...bySegment.entries()].map(([segment, list]) => [
          segment,
          summarize(list, context.items.length, 2),
        ]),
      ),
      millisPerUser,
    }
  })
}

export type { Result, Summary }
export { evaluate }
