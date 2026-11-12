// Mailing templates: {имя} becomes the client's first name, {ссылка} the booking link.

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? ''

const renderMailing = (template: string, name: string, link: string) =>
  template
    .replaceAll('{имя}', firstName(name) || 'Здравствуйте')
    .replaceAll('{ссылка}', link)
    .replace(/\s{2,}/g, ' ')
    .trim()

/** Cyrillic SMS: 70 characters in one part, 67 per part when longer. */
const smsParts = (text: string) => (text.length <= 70 ? 1 : Math.ceil(text.length / 67))

export { firstName, renderMailing, smsParts }
