const KG_COUNTRY_CODE = '996'
const KG_LOCAL_DIGITS = 9
const MIN_DIGITS = 9
const MAX_DIGITS = 15

// Kyrgyz numbers are typed as "555 123 456", "0555 123 456" or "+996 555 123 456"; all map to one E.164 value.
const normalizePhone = (value: string): string | null => {
  const digits = value.replace(/\D/g, '')
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null
  if (digits.length === KG_LOCAL_DIGITS) return `+${KG_COUNTRY_CODE}${digits}`
  if (digits.length === KG_LOCAL_DIGITS + 1 && digits.startsWith('0')) {
    return `+${KG_COUNTRY_CODE}${digits.slice(1)}`
  }

  return `+${digits}`
}

const maskPhone = (phone: string) => `${phone.slice(0, -4).replace(/\d/g, '•')}${phone.slice(-4)}`

export { maskPhone, normalizePhone }
