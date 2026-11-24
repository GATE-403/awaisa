import {
  parseRegion,
  phonePlaceholder,
  phonePrefix,
  type Region,
  wholePhoneDigits,
} from '@awaisa/region'

const describedRegion = process.env.NEXT_PUBLIC_REGION
if (!describedRegion) {
  throw new Error('NEXT_PUBLIC_REGION is empty: next.config.ts fills it from region.json')
}

// The installation's country and city: `next.config.ts` reads its region.json (or the repository's
// region.example.json) at build time and inlines it here. The code knows no country of its own.
const REGION: Region = parseRegion(JSON.parse(describedRegion))

/** «+996». */
const PHONE_PREFIX = phonePrefix(REGION)
/** «+996 555 123 456». */
const PHONE_PLACEHOLDER = phonePlaceholder(REGION)
/** Digits after the calling code: 9 for +996. */
const NATIONAL_PHONE_DIGITS = REGION.phone.nationalDigits
/** Digits of a whole number with its calling code: 12 for +996. */
const WHOLE_PHONE_DIGITS = wholePhoneDigits(REGION)

export { NATIONAL_PHONE_DIGITS, PHONE_PLACEHOLDER, PHONE_PREFIX, REGION, WHOLE_PHONE_DIGITS }
