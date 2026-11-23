// A waitlist entry is for a whole visit: its first service and the ones after it (manicure and
// pedicure). Pure, unit-tested: entries waiting for the same visit are checked together.

type WaitlistVisit = {
  serviceId: string
  extraServiceIds: string[]
  specialistId: string | null
  branchId: string | null
  date: string
}

/** One key per visit: the same services in the same order, master, branch and day. */
const waitlistGroupKey = (entry: WaitlistVisit) =>
  [
    entry.serviceId,
    entry.extraServiceIds.join(','),
    entry.specialistId ?? '',
    entry.branchId ?? '',
    entry.date,
  ].join('|')

export type { WaitlistVisit }
export { waitlistGroupKey }
