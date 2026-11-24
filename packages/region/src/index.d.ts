// Plain JavaScript with these types, not TypeScript: the API loads this package at run time from
// node_modules (in its Docker image it is a real copy there), where Node will not strip types.
//
// The code knows no country: the installation describes its own in `region.json`
// (docs/installation-region.md); this package only reads and checks that description.

type GeoPoint = { latitude: number; longitude: number }

/** A neighbourhood people name when asked «где вы?»: a point inside it, to sort places by distance. */
type RegionArea = { label: string; lat: number; lng: number }

/** The installation's country and city, as `region.json` describes them. */
type Region = {
  /** ISO 3166-1 alpha-2, e.g. «KG». */
  country: string
  /** IANA zone the businesses book in, e.g. «Asia/Bishkek». */
  timeZone: string
  phone: {
    /** Calling code without «+», e.g. «996». */
    callingCode: string
    /** National digits after the calling code. */
    nationalDigits: number
    /** The digit people type before a national number («0555…»), or null. */
    trunkPrefix: string | null
    /** How the national digits are grouped when shown: [3, 3, 3] → «555 123 456». */
    groups: number[]
    /** A national number for placeholders. */
    example: string
  }
  currency: {
    /** ISO 4217, e.g. «KGS». */
    code: string
    /** What follows a price in the app's texts, e.g. «сом». */
    label: string
  }
  locale: {
    /** The language the server renders and texts are sent in. */
    default: string
    /** Languages the interface offers. */
    available: string[]
    /** The locale numbers are grouped by («1 500»). */
    numbers: string
  }
  city: {
    name: string
    /** Where the map opens before anything is known. */
    center: GeoPoint
    areas: RegionArea[]
  }
  /** The box address search prefers, «minLon,minLat,maxLon,maxLat», or null for the whole world. */
  geocoderBox: string | null
}

/**
 * Reads and checks a region description (the parsed JSON of `region.json`): fills the optional
 * parts and throws one error naming every field that is missing or wrong.
 */
declare const parseRegion: (input: unknown) => Region

/** The zone's offset from UTC in minutes at that moment (now by default). */
declare const utcOffsetMinutes: (region: Region, at?: Date) => number

/** «+996». */
declare const phonePrefix: (region: Region) => string
/** «+996 555 123 456»: the calling code and the national digits in their groups. */
declare const formatNationalPhone: (region: Region, nationalDigits: string) => string
/** «+996 555 123 456» as a placeholder. */
declare const phonePlaceholder: (region: Region) => string
/** Digits in a whole number with its calling code: 12 for +996. */
declare const wholePhoneDigits: (region: Region) => number

export type { GeoPoint, Region, RegionArea }
export {
  formatNationalPhone,
  parseRegion,
  phonePlaceholder,
  phonePrefix,
  utcOffsetMinutes,
  wholePhoneDigits,
}
