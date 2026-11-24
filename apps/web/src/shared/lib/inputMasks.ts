import { formatNationalPhone, type Region } from '@awaisa/region'
import { REGION } from '@/shared/config/region'

/** The national digits once the calling code and the trunk prefix («0555…») are taken off. */
const localPart = (digits: string, region: Region) => {
  const { callingCode, trunkPrefix } = region.phone
  const local = digits.startsWith(callingCode) ? digits.slice(callingCode.length) : digits
  return trunkPrefix && local.startsWith(trunkPrefix) ? local.slice(trunkPrefix.length) : local
}

// Formats a phone while it is typed: «0555123456» or «555 12 34 56» become «+996 555 123 456»
// (the region's code and grouping). Numbers with another country code are left as typed.
const maskPhoneInput = (value: string, region: Region = REGION) => {
  const { callingCode, nationalDigits } = region.phone
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (trimmed.startsWith('+') && digits.length >= 3 && !digits.startsWith(callingCode)) {
    return trimmed
  }

  const local = localPart(digits, region).slice(0, nationalDigits)
  if (!local) return ''

  return formatNationalPhone(region, local)
}

// The number typed after a fixed «+996» (the sign-in screen): «0555123456», «555 12 34 56» or a
// pasted or autofilled «+996 555 123 456» all become «+996 555 123 456».
const maskLocalPhoneInput = (value: string, region: Region = REGION) => {
  const { callingCode, nationalDigits } = region.phone
  const digits = value.replace(/\D/g, '')
  const local =
    digits.length > nationalDigits && digits.startsWith(callingCode)
      ? digits.slice(callingCode.length)
      : digits
  // With the code in front, so maskPhoneInput never reads a local «996…» as the country code.
  return maskPhoneInput(`${callingCode}${local}`, region)
}

// What is wrong with a typed phone before it is sent, or null when it is a whole number of the
// region (+996 and 9 digits) - a half-typed number must not go out as a sign-in request.
const phoneProblem = (value: string, region: Region = REGION): string | null => {
  const { callingCode, nationalDigits } = region.phone
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return 'Введите номер телефона'
  if (trimmed.startsWith('+') && !digits.startsWith(callingCode)) {
    return `Пока принимаем только номера с кодом +${callingCode}`
  }
  if (localPart(digits, region).length < nationalDigits) {
    return `Номер неполный: после +${callingCode} нужно ${nationalDigits} цифр`
  }
  return null
}

// Groups thousands while a price is typed: «1500» → «1 500».
const maskAmountInput = (digits: string) =>
  digits ? Number(digits).toLocaleString(REGION.locale.numbers).replace(/\s/g, ' ') : ''

export { maskAmountInput, maskLocalPhoneInput, maskPhoneInput, phoneProblem }
