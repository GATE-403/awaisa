/** @typedef {import('./index.js').Region} Region */
/** @typedef {import('./index.js').RegionArea} RegionArea */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/** @param {unknown} value */
const text = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null)

/**
 * @param {unknown} value
 * @returns {value is number}
 */
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

/** @param {string} zone */
const isTimeZone = (zone) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/** @param {string} code */
const isCurrency = (code) => {
  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: code })
    return /^[A-Z]{3}$/.test(code)
  } catch {
    return false
  }
}

/**
 * @param {unknown} value
 * @returns {import('./index.js').GeoPoint | null}
 */
const toPoint = (value) => {
  if (!isRecord(value)) return null
  const { latitude, longitude } = value
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return { latitude, longitude }
}

/** @param {unknown} value @returns {RegionArea | null} */
const toArea = (value) => {
  if (!isRecord(value)) return null
  const label = text(value.label)
  return label && isNumber(value.lat) && isNumber(value.lng)
    ? { label, lat: value.lat, lng: value.lng }
    : null
}

/** @param {string} locale @param {string} code */
const currencyLabelOf = (locale, code) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: 'name' })
    .formatToParts(5)
    .find((part) => part.type === 'currency')?.value ?? code

/**
 * @param {unknown} input
 * @returns {Region}
 */
const parseRegion = (input) => {
  /** @type {string[]} */
  const problems = []
  const root = isRecord(input) ? input : {}
  if (!isRecord(input)) problems.push('the region must be an object')

  const country = text(root.country)?.toUpperCase() ?? ''
  if (!/^[A-Z]{2}$/.test(country)) problems.push('country: an ISO 3166-1 code like «KG»')

  const timeZone = text(root.timeZone) ?? ''
  if (!isTimeZone(timeZone)) problems.push('timeZone: an IANA zone like «Asia/Bishkek»')

  const phone = isRecord(root.phone) ? root.phone : {}
  const callingCode = text(phone.callingCode)?.replace(/^\+/, '') ?? ''
  if (!/^\d{1,4}$/.test(callingCode)) problems.push('phone.callingCode: digits like «996»')
  const nationalDigits = isNumber(phone.nationalDigits) ? phone.nationalDigits : 0
  if (!Number.isInteger(nationalDigits) || nationalDigits < 4 || nationalDigits > 14) {
    problems.push('phone.nationalDigits: how many digits follow the calling code')
  }
  const trunkPrefix = text(phone.trunkPrefix)
  if (trunkPrefix !== null && !/^\d{1,2}$/.test(trunkPrefix)) {
    problems.push('phone.trunkPrefix: the digit typed before a national number, or null')
  }
  const groups =
    Array.isArray(phone.groups) && phone.groups.every((size) => Number.isInteger(size) && size > 0)
      ? /** @type {number[]} */ (phone.groups)
      : [nationalDigits]
  const example = text(phone.example) ?? '1'.repeat(Math.max(nationalDigits, 0))
  if (!/^\d+$/.test(example) || example.length !== nationalDigits) {
    problems.push('phone.example: a national number of phone.nationalDigits digits')
  }

  const locale = isRecord(root.locale) ? root.locale : {}
  const defaultLocale = text(locale.default) ?? 'en'
  const available = Array.isArray(locale.available)
    ? locale.available.map(text).filter((item) => item !== null)
    : [defaultLocale]
  const numbers = text(locale.numbers) ?? defaultLocale

  const currency = isRecord(root.currency) ? root.currency : {}
  const currencyCode = text(currency.code)?.toUpperCase() ?? ''
  if (!isCurrency(currencyCode)) problems.push('currency.code: an ISO 4217 code like «KGS»')
  /** @type {Record<string, string>} */
  const currencyLabels = {}
  if (currency.labels !== undefined && currency.labels !== null) {
    const labels = isRecord(currency.labels) ? currency.labels : null
    const entries = labels ? Object.entries(labels) : []
    for (const [language, value] of entries) {
      const label = text(value)
      if (label && /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(language)) currencyLabels[language] = label
    }
    if (!labels || Object.keys(currencyLabels).length !== entries.length) {
      problems.push('currency.labels: { "en": "som", "ru": "сом" }, a label per language code')
    }
  }

  const city = isRecord(root.city) ? root.city : {}
  const cityName = text(city.name) ?? ''
  if (!cityName) problems.push('city.name')
  const center = toPoint(city.center)
  if (!center) problems.push('city.center: { "latitude": …, "longitude": … }')
  const areas = Array.isArray(city.areas) ? city.areas.map(toArea) : []
  if (areas.some((/** @type {RegionArea | null} */ area) => area === null)) {
    problems.push('city.areas: each { "label": …, "lat": …, "lng": … }')
  }

  const geocoderBox = text(root.geocoderBox)
  if (geocoderBox !== null && !/^-?[\d.]+(,-?[\d.]+){3}$/.test(geocoderBox)) {
    problems.push('geocoderBox: «minLon,minLat,maxLon,maxLat» or null')
  }

  if (problems.length > 0) throw new Error(`Region is not valid: ${problems.join('; ')}`)

  return {
    country,
    timeZone,
    phone: { callingCode, nationalDigits, trunkPrefix, groups, example },
    currency: {
      code: currencyCode,
      label: text(currency.label) ?? currencyLabelOf(numbers, currencyCode),
      labels: currencyLabels,
    },
    locale: { default: defaultLocale, available, numbers },
    city: {
      name: cityName,
      center: /** @type {NonNullable<typeof center>} */ (center),
      areas: /** @type {RegionArea[]} */ (areas),
    },
    geocoderBox,
  }
}

/** @param {Region} region @param {Date} [at] */
const utcOffsetMinutes = (region, at = new Date()) => {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone: region.timeZone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  // «GMT+06:00», «GMT-03:30», or «GMT» for UTC itself.
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name)
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return match[1] === '-' ? -minutes : minutes
}

/** @param {Region} region */
const phonePrefix = (region) => `+${region.phone.callingCode}`

/** @param {Region} region @param {string} nationalDigits */
const formatNationalPhone = (region, nationalDigits) => {
  const groups = []
  let start = 0
  for (const size of region.phone.groups) {
    const part = nationalDigits.slice(start, start + size)
    if (part) groups.push(part)
    start += size
  }
  const rest = nationalDigits.slice(start)
  if (rest) groups.push(rest)
  return [phonePrefix(region), ...groups].join(' ')
}

/** @param {Region} region */
const phonePlaceholder = (region) => formatNationalPhone(region, region.phone.example)

/** @param {Region} region */
const wholePhoneDigits = (region) => region.phone.callingCode.length + region.phone.nationalDigits

export {
  formatNationalPhone,
  parseRegion,
  phonePlaceholder,
  phonePrefix,
  utcOffsetMinutes,
  wholePhoneDigits,
}
