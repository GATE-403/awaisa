// Mailing templates: {name} becomes the client's first name, {link} the booking link. Templates
// saved before the app spoke English use {имя} and {ссылка}, so those still work.

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? ''

const NAME_TOKENS = /\{(?:name|имя)\}/giu
const LINK_TOKENS = /\{(?:link|ссылка)\}/giu

const renderMailing = (template: string, name: string, link: string) =>
  template
    .replace(NAME_TOKENS, firstName(name) || 'Hello')
    .replace(LINK_TOKENS, link)
    .replace(/\s{2,}/g, ' ')
    .trim()

// The GSM 03.38 alphabet: a text of only these goes as GSM-7, anything else as UCS-2.
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
// These take two septets each (an escape and the character).
const GSM_EXTENDED = '^{}\\[~]|€\f'

const gsmLength = (text: string) => {
  let septets = 0
  for (const character of text) {
    if (GSM_BASIC.includes(character)) septets += 1
    else if (GSM_EXTENDED.includes(character)) septets += 2
    else return null
  }
  return septets
}

/**
 * SMS parts the text takes: GSM-7 (160 in one part, 153 per part when longer) when every
 * character is in the GSM alphabet, else UCS-2 (70, then 67 per part, counted in UTF-16 units).
 */
const smsParts = (text: string) => {
  const septets = gsmLength(text)
  if (septets !== null) return septets <= 160 ? 1 : Math.ceil(septets / 153)
  return text.length <= 70 ? 1 : Math.ceil(text.length / 67)
}

export { firstName, renderMailing, smsParts }
