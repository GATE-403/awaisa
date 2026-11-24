import { CHEAPER_THAN_MIN } from '../config/offerCard'

/**
 * «Cheaper than 70% of places» under a price: the share of other places with this service that ask more,
 * shown only when it is clearly on the low side and in whole tens (73 reads as 70, not as a
 * figure to check). null hides the line.
 */
export const cheaperThan = (percent: number | null | undefined) =>
  percent && percent >= CHEAPER_THAN_MIN ? Math.floor(percent / 10) * 10 : null
