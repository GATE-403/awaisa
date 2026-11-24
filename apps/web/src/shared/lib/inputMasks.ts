const KG_CODE = '996'
const KG_LOCAL_DIGITS = 9

// Formats a phone while it is typed: «0555123456» or «555 12 34 56» become «+996 555 123 456».
// Numbers with another country code are left as typed.
const maskPhoneInput = (value: string) => {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (trimmed.startsWith('+') && digits.length >= 3 && !digits.startsWith(KG_CODE)) return trimmed

  const local = (digits.startsWith(KG_CODE) ? digits.slice(KG_CODE.length) : digits)
    .replace(/^0/, '')
    .slice(0, KG_LOCAL_DIGITS)
  if (!local) return ''

  const groups = [local.slice(0, 3), local.slice(3, 6), local.slice(6)].filter(Boolean)

  return `+${KG_CODE} ${groups.join(' ')}`
}

// The number typed after a fixed «+996» (the sign-in screen): «0555123456», «555 12 34 56» or a
// pasted or autofilled «+996 555 123 456» all become «+996 555 123 456».
const maskLocalPhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, '')
  const local =
    digits.length > KG_LOCAL_DIGITS && digits.startsWith(KG_CODE)
      ? digits.slice(KG_CODE.length)
      : digits
  // With the code in front, so maskPhoneInput never reads a local «996…» as the country code.
  return maskPhoneInput(`${KG_CODE}${local}`)
}

// What is wrong with a typed phone before it is sent, or null when it is a whole Kyrgyz number
// (+996 and 9 digits) - a half-typed number must not go out as a sign-in request.
const phoneProblem = (value: string): string | null => {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return 'Enter a phone number'
  if (trimmed.startsWith('+') && !digits.startsWith(KG_CODE)) {
    return 'For now we only take Kyrgyz numbers: +996'
  }
  const local = (digits.startsWith(KG_CODE) ? digits.slice(KG_CODE.length) : digits).replace(
    /^0/,
    '',
  )
  if (local.length < KG_LOCAL_DIGITS) {
    return `The number is incomplete: it needs ${KG_LOCAL_DIGITS} digits after +996`
  }
  return null
}

// Groups thousands while a price is typed: «1500» → «1,500». Spaces and commas typed or pasted
// in between are dropped first.
const maskAmountInput = (value: string) => {
  const digits = value.replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('en-GB') : ''
}

export { maskAmountInput, maskLocalPhoneInput, maskPhoneInput, phoneProblem }
