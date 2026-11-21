type SettledVisit = {
  /** Every service of the visit with its price; a visit of several pays the others apart. */
  lines?: { serviceId: string; price: number }[]
  /** What the client owes for the visit after any discount. */
  due: number
}

/**
 * What a subscription pays of a visit: the whole visit when it is one service; of several, only
 * its own service (or, for a plan on any service, the dearest one), never more than is due.
 */
const subscriptionCovers = (visit: SettledVisit, planServiceId: string | null) => {
  const lines = visit.lines ?? []
  if (lines.length <= 1) return visit.due
  const prices = lines
    .filter((line) => planServiceId === null || line.serviceId === planServiceId)
    .map((line) => line.price)
  return Math.min(visit.due, Math.max(0, ...prices))
}

export type { SettledVisit }
export { subscriptionCovers }
