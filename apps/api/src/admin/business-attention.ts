// «Мои бизнесы»: how full today is in a business and how far it is from taking bookings (pure,
// unit-tested).

/** Booked minutes over the open minutes of every active master, 0–1 to two places; null on a
 * day off or without masters, so the list draws no bar there. Overbooked days stop at full. */
const todayLoad = (bookedMinutes: number, openMinutes: number) =>
  openMinutes > 0 ? Math.min(1, Math.round((bookedMinutes / openMinutes) * 100) / 100) : null

type SetupStep = 'services' | 'masters' | 'hours'

/** The steps before clients can book, in the cabinet's own order (`SetupProgress` on the web). */
const SETUP_STEPS: SetupStep[] = ['services', 'masters', 'hours']

/** How far a business is from taking bookings: steps done and the first one left, if any. */
const setupProgress = (done: Record<SetupStep, boolean>) => ({
  done: SETUP_STEPS.filter((step) => done[step]).length,
  total: SETUP_STEPS.length,
  next: SETUP_STEPS.find((step) => !done[step]) ?? null,
})

export type { SetupStep }
export { SETUP_STEPS, setupProgress, todayLoad }
