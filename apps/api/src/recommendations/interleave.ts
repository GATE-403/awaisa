import { createHash } from 'node:crypto'
import type { Algorithm, Candidate } from './recommend-score.js'

// Team-draft interleaving (Radlinski et al., 2008): two scorers take turns giving their best card
// not on the shelf yet, the one behind in picks going first and a coin deciding ties, so neither
// gets the better slots on average. Each card remembers which scorer gave it (`algorithm`); a
// session whose taps went more to one scorer's cards is a win for it. It needs ten to a hundred
// times fewer sessions than an A/B test of the same two scorers (docs/recsys/experiments.md).

type Ranked<T extends Candidate> = { candidate: T; reason: string }[]
type Team<T extends Candidate> = { algorithm: Algorithm; ranked: Ranked<T> }
type Drafted<T extends Candidate> = { candidate: T; reason: string; algorithm: Algorithm }

const normalize = (value: string) => value.toLowerCase().replace(/ё/g, 'е').trim()

const teamDraft = <T extends Candidate>(
  first: Team<T>,
  second: Team<T>,
  limit: number,
  random: () => number = Math.random,
  perPlace = 2,
): Drafted<T>[] => {
  const result: Drafted<T>[] = []
  const ids = new Set<string>()
  const names = new Set<string>()
  const perSlug = new Map<string, number>()
  const picks = new Map<Algorithm, number>([
    [first.algorithm, 0],
    [second.algorithm, 0],
  ])
  const cursor = new Map<Algorithm, number>([
    [first.algorithm, 0],
    [second.algorithm, 0],
  ])
  // The shelf rules hold for the merged list too: one card per service name, two per place.
  const fits = (candidate: T) =>
    !ids.has(candidate.serviceId) &&
    !names.has(normalize(candidate.name)) &&
    (perSlug.get(candidate.slug) ?? 0) < perPlace
  const nextOf = (team: Team<T>) => {
    let index = cursor.get(team.algorithm) ?? 0
    while (index < team.ranked.length && !fits((team.ranked[index] as Ranked<T>[number]).candidate))
      index += 1
    cursor.set(team.algorithm, index)
    return team.ranked[index]
  }
  while (result.length < limit) {
    const firstPicks = picks.get(first.algorithm) ?? 0
    const secondPicks = picks.get(second.algorithm) ?? 0
    const firstTurn = firstPicks < secondPicks || (firstPicks === secondPicks && random() < 0.5)
    const order = firstTurn ? [first, second] : [second, first]
    const team = order.find((entry) => nextOf(entry) !== undefined)
    if (!team) break
    const entry = nextOf(team) as Ranked<T>[number]
    result.push({ ...entry, algorithm: team.algorithm })
    ids.add(entry.candidate.serviceId)
    names.add(normalize(entry.candidate.name))
    perSlug.set(entry.candidate.slug, (perSlug.get(entry.candidate.slug) ?? 0) + 1)
    picks.set(team.algorithm, (picks.get(team.algorithm) ?? 0) + 1)
  }
  return result
}

/** Whether this device's shelves are interleaved: a stable share of devices by a hash. */
const isInterleaved = (session: string | undefined, algorithm: Algorithm, percent: number) => {
  if (!session) return false
  const digest = createHash('sha256').update(`interleave:${algorithm}:${session}`).digest()
  return digest.readUInt32BE(0) % 100 < percent
}

type TeamTally = { requestId: string; algorithm: string; clicks: number; bookings: number }

/** Two-sided sign test, normal approximation: how likely a split this uneven is by chance. */
const signTestP = (wins: number, losses: number) => {
  const n = wins + losses
  if (n === 0) return 1
  const z = Math.abs(wins - n / 2) / Math.sqrt(n / 4)
  // erfc via Abramowitz–Stegun 7.1.26 (|error| < 1.5e-7): enough for a decision threshold.
  const t = 1 / (1 + 0.3275911 * (z / Math.SQRT2))
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  return Math.min(1, poly * Math.exp(-(z * z) / 2))
}

/**
 * Per shelf answer, the scorer whose cards got more taps (and, separately, bookings) wins;
 * answers with equal taps are ties and left out of the test, as team-draft prescribes.
 */
const interleavingVerdict = (tallies: TeamTally[], requests: number) => {
  const byRequest = new Map<string, Map<string, TeamTally>>()
  const algorithms = new Set<string>()
  for (const tally of tallies) {
    algorithms.add(tally.algorithm)
    const teams = byRequest.get(tally.requestId) ?? new Map<string, TeamTally>()
    teams.set(tally.algorithm, tally)
    byRequest.set(tally.requestId, teams)
  }
  const names = [...algorithms].sort()
  const outcome = (measure: 'clicks' | 'bookings') => {
    const wins = Object.fromEntries(names.map((name) => [name, 0]))
    let ties = 0
    for (const teams of byRequest.values()) {
      const scores = names.map((name) => teams.get(name)?.[measure] ?? 0)
      if (scores.every((score) => score === 0)) continue
      const best = Math.max(...scores)
      const leaders = names.filter((_, index) => scores[index] === best)
      if (leaders.length > 1) ties += 1
      else wins[leaders[0] as string] = (wins[leaders[0] as string] ?? 0) + 1
    }
    const [first = 0, second = 0] = names.map((name) => wins[name] ?? 0)
    return { wins, ties, pValue: Math.round(signTestP(first, second) * 1000) / 1000 }
  }
  return { algorithms: names, requests, clicks: outcome('clicks'), bookings: outcome('bookings') }
}

export type { TeamTally }
export { interleavingVerdict, isInterleaved, signTestP, teamDraft }
