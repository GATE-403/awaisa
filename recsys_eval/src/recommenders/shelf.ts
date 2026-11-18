import type { Candidate } from '../../../apps/api/src/recommendations/recommend-score.ts'

// How rankCandidates turns scores into a shelf — best first, at most two per place, one per
// service name, one spot (the 4th) for a new place — repeated here so a prototype can change the
// scores *before* that selection. Adding to scores after it is too late: the name rule has already
// dropped, say, the client's own «Стрижка + борода» for the same name at another place.
// `shelf.test.ts` checks that with no change this gives exactly what rankCandidates gives.

const PER_PLACE = 2
const EXPLORE_AT = 3

const normalize = (value: string) => value.toLowerCase().replace(/ё/g, 'е').trim()

type Scored<T extends Candidate> = { candidate: T; score: number }

const selectShelf = <T extends Candidate>(entries: Scored<T>[], limit: number): T[] => {
  const scored = [...entries].sort((first, second) => second.score - first.score)
  const perSlug = new Map<string, number>()
  const names = new Set<string>()
  const result: Scored<T>[] = []
  for (const entry of scored) {
    const count = perSlug.get(entry.candidate.slug) ?? 0
    const name = normalize(entry.candidate.name)
    if (count >= PER_PLACE || names.has(name)) continue
    perSlug.set(entry.candidate.slug, count + 1)
    names.add(name)
    result.push(entry)
    if (result.length === limit) break
  }
  if (!result.slice(0, EXPLORE_AT + 3).some((entry) => entry.candidate.isNewPlace)) {
    const fresh = scored.find(
      (entry) =>
        entry.candidate.isNewPlace &&
        !result.includes(entry) &&
        !names.has(normalize(entry.candidate.name)) &&
        (perSlug.get(entry.candidate.slug) ?? 0) < PER_PLACE,
    )
    if (fresh && result.length > EXPLORE_AT) {
      result.splice(EXPLORE_AT, 0, fresh)
      if (result.length > limit) result.pop()
    }
  }
  return result.map((entry) => entry.candidate)
}

export { selectShelf }
