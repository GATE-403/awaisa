// Deterministic randomness: the same seed gives the same report, run after run.

const mulberry32 = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const seedOf = (text: string) => {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

type Random = () => number

const pick = <T>(random: Random, list: readonly T[]): T =>
  list[Math.floor(random() * list.length)] as T

const shuffle = <T>(random: Random, list: readonly T[]): T[] => {
  const copy = [...list]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    ;[copy[index], copy[other]] = [copy[other] as T, copy[index] as T]
  }
  return copy
}

export type { Random }
export { mulberry32, pick, seedOf, shuffle }
