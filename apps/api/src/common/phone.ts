import { formatNationalPhone, type Region } from '@awaisa/region'
import { currentRegion } from './region.js'

const MAX_DIGITS = 15

// National numbers are typed as "555 123 456", "0555 123 456" or "+996 555 123 456" (the
// region's calling code, national digits and trunk prefix); all map to one E.164 value.
const normalizePhone = (value: string, region: Region = currentRegion()): string | null => {
  const { callingCode, nationalDigits, trunkPrefix } = region.phone
  const digits = value.replace(/\D/g, '')
  if (digits.length < nationalDigits || digits.length > MAX_DIGITS) return null
  if (digits.length === nationalDigits) return `+${callingCode}${digits}`
  if (trunkPrefix && digits.length === nationalDigits + 1 && digits.startsWith(trunkPrefix)) {
    return `+${callingCode}${digits.slice(trunkPrefix.length)}`
  }

  return `+${digits}`
}

// Texts cost money per message and international routes are where SMS fraud pays (bots request
// codes to premium numbers). `codes` are country calling codes («996», «7»); «*» allows any.
const isAllowedDestination = (phone: string, codes: string[]) =>
  codes.includes('*') || codes.some((code) => phone.startsWith(`+${code}`))

/** «+996555123456» → «+996 555 123 456»; a number of another country stays as it is. */
const formatPhone = (phone: string, region: Region = currentRegion()) => {
  const { callingCode, nationalDigits } = region.phone
  const prefix = `+${callingCode}`
  const national = phone.slice(prefix.length)
  const isNational =
    phone.startsWith(prefix) && national.length === nationalDigits && /^\d+$/.test(national)
  return isNational ? formatNationalPhone(region, national) : phone
}

/** «+996 ••• ••• 456»: enough to tell two clients apart, not enough to call. */
const hidePhone = (phone: string, region: Region = currentRegion()) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 6) return ''
  const prefix = `+${region.phone.callingCode}`
  const country = phone.startsWith(prefix) ? `${prefix} ` : '+'
  return `${country}••• ••• ${digits.slice(-3)}`
}

const maskPhone = (phone: string) => `${phone.slice(0, -4).replace(/\d/g, '•')}${phone.slice(-4)}`

export { formatPhone, hidePhone, isAllowedDestination, maskPhone, normalizePhone }
