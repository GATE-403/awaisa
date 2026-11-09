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

// Groups thousands while a price is typed: «1500» → «1 500».
const maskAmountInput = (digits: string) =>
  digits ? Number(digits).toLocaleString('ru-RU').replace(/\s/g, ' ') : ''

export { maskAmountInput, maskPhoneInput }
