import { REGION } from '@/shared/config/region'

// Every place is in the region's city and zone. A moment - a review's createdAt, a visit - is
// shown on that clock: formatted without a time zone, the server (UTC in production) and the
// browser print different days around midnight, and the page fails to hydrate.
const BUSINESS_TIME_ZONE = REGION.timeZone

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** A moment's day on the region's clock, «2026-11-23», for the day helpers (`t.monthShort`…). */
const toBusinessDayKey = (iso: string) => dayKeyFormat.format(new Date(iso))

export { BUSINESS_TIME_ZONE, toBusinessDayKey }
