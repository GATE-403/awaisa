// What leaves our servers in an error report: no phone numbers, no query strings (they carry
// phones, booking tokens and signatures), no long digit runs that could be a code or a card.
const PHONE = /\+?\d[\d\s()-]{7,}\d/g
const LONG_NUMBER = /\b\d{6,}\b/g

const scrubText = (text: string) => text.replace(PHONE, '[phone]').replace(LONG_NUMBER, '[number]')

const scrubUrl = (url: string) => scrubText(url.split('?')[0] ?? '')

export { scrubText, scrubUrl }
