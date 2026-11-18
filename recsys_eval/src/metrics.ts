// Ranking metrics for one list against what the client actually booked, and list-level
// qualities that accuracy alone hides (does it show the whole catalog, mix kinds, surface less
// obvious services, or just repeat what the client already had).

type ListMetrics = {
  precision: number
  recall: number
  ndcg: number
  ap: number
  hit: number
}

const listMetrics = (list: string[], relevant: Set<string>, k: number): ListMetrics => {
  const top = list.slice(0, k)
  let hits = 0
  let dcg = 0
  let apSum = 0
  for (const [index, id] of top.entries()) {
    if (!relevant.has(id)) continue
    hits += 1
    dcg += 1 / Math.log2(index + 2)
    apSum += hits / (index + 1)
  }
  let idcg = 0
  for (let index = 0; index < Math.min(relevant.size, k); index += 1) {
    idcg += 1 / Math.log2(index + 2)
  }
  return {
    precision: hits / k,
    recall: relevant.size ? hits / relevant.size : 0,
    ndcg: idcg ? dcg / idcg : 0,
    ap: relevant.size ? apSum / Math.min(relevant.size, k) : 0,
    hit: hits > 0 ? 1 : 0,
  }
}

/** Share of pairs in the list from different categories: 0 = all one kind, 1 = all different. */
const intraListDiversity = (list: string[], categoryOf: (id: string) => string) => {
  if (list.length < 2) return 0
  let different = 0
  let pairs = 0
  for (let first = 0; first < list.length; first += 1) {
    for (let second = first + 1; second < list.length; second += 1) {
      pairs += 1
      if (categoryOf(list[first] as string) !== categoryOf(list[second] as string)) different += 1
    }
  }
  return different / pairs
}

/** Mean self-information of the items: higher = less obvious picks (−log2 of booking share). */
const novelty = (list: string[], popularity: Map<string, number>, total: number) => {
  if (list.length === 0 || total === 0) return 0
  const sum = list.reduce((acc, id) => acc + -Math.log2(((popularity.get(id) ?? 0) + 1) / total), 0)
  return sum / list.length
}

const mean = (values: number[]) =>
  values.length ? values.reduce((acc, value) => acc + value, 0) / values.length : 0

/** 95% bootstrap interval of a mean: how sure a difference is with this many clients. */
const bootstrapInterval = (values: number[], random: () => number, rounds = 300) => {
  if (values.length === 0) return [0, 0] as const
  const means: number[] = []
  for (let round = 0; round < rounds; round += 1) {
    let sum = 0
    for (let draw = 0; draw < values.length; draw += 1) {
      sum += values[Math.floor(random() * values.length)] as number
    }
    means.push(sum / values.length)
  }
  means.sort((first, second) => first - second)
  return [means[Math.floor(rounds * 0.025)] ?? 0, means[Math.floor(rounds * 0.975)] ?? 0] as const
}

export type { ListMetrics }
export { bootstrapInterval, intraListDiversity, listMetrics, mean, novelty }
