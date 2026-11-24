import {
  renderWhatsapp,
  toWhatsappPayload,
  WHATSAPP_TEMPLATES,
  whatsappConfirmation,
  whatsappReminder,
  whatsappReturnVisit,
  whatsappSalonCancellation,
} from './whatsapp-messages.js'

const WEB = 'https://awaisa.kg'
const LINK = `${WEB}/v/7f1c?s=abc_DEF-12`

const booking = {
  business: { name: 'Awaisa Studio', slug: 'awaisa-studio' },
  serviceName: "Men's haircut",
  specialistName: 'Erlan Asanov',
  date: '2026-11-24',
  time: '15:30',
}

const options = { to: '+996555123456', language: 'en', webUrl: WEB }

describe('whatsapp messages', () => {
  it('builds a template payload with body parameters and the link after the site as the button', () => {
    expect(toWhatsappPayload(whatsappConfirmation(booking, LINK), options)).toEqual({
      messaging_product: 'whatsapp',
      to: '996555123456',
      type: 'template',
      template: {
        name: 'booking_confirmation',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Awaisa Studio' },
              { type: 'text', text: "Men's haircut" },
              { type: 'text', text: '24 November' },
              { type: 'text', text: '15:30' },
              { type: 'text', text: 'Erlan Asanov' },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: 'v/7f1c?s=abc_DEF-12' }],
          },
        ],
      },
    })
  })

  it('refuses a link that is not on the site, so SMS carries it instead', () => {
    expect(toWhatsappPayload(whatsappConfirmation(booking, 'http://other.kg/v/1'), options)).toBe(
      null,
    )
    expect(
      toWhatsappPayload(whatsappConfirmation(booking, LINK), { ...options, webUrl: `${WEB}/` }),
    ).not.toBe(null)
  })

  it('cleans parameters Meta would refuse', () => {
    const payload = toWhatsappPayload(
      whatsappConfirmation(
        { ...booking, serviceName: 'Haircut\n   and    beard', specialistName: ' ' },
        LINK,
      ),
      options,
    )
    const body = payload?.template.components[0]
    expect(body?.parameters.map((parameter) => parameter.text)).toEqual([
      'Awaisa Studio',
      'Haircut and beard',
      '24 November',
      '15:30',
      '-',
    ])
  })

  it('fills every template parameter it declares', () => {
    const messages = [
      whatsappConfirmation(booking, LINK),
      whatsappReminder(booking, false, LINK),
      whatsappSalonCancellation(booking, WEB),
      whatsappReturnVisit('Awaisa Studio', 'Haircut', 'Erlan Asanov', `${WEB}/awaisa-studio/book`),
    ]
    for (const message of messages) {
      const count = WHATSAPP_TEMPLATES[message.template].body.match(/\{\{\d+\}\}/g)?.length
      expect(message.params).toHaveLength(count ?? 0)
      expect(renderWhatsapp(message)).not.toContain('{{')
    }
  })

  it('renders the reminder and the cancellation as the client reads them', () => {
    expect(renderWhatsapp(whatsappReminder(booking, true, LINK))).toBe(
      `A reminder: today at 15:30 you have Men's haircut at Awaisa Studio with Erlan Asanov. See you soon! [Change or cancel: ${LINK}]`,
    )
    expect(renderWhatsapp(whatsappSalonCancellation(booking, WEB))).toBe(
      `Sorry, your booking at Awaisa Studio on 24 November at 15:30 has been cancelled. Pick another time with the button below. [Pick a time: ${WEB}/awaisa-studio/book]`,
    )
    expect(
      renderWhatsapp(whatsappReturnVisit('Awaisa Studio', 'Haircut', 'Erlan Asanov', `${WEB}/x`)),
    ).toContain('Erlan is ready for you')
  })

  it('never starts or ends a template body with a parameter (Meta rejects those)', () => {
    for (const { body } of Object.values(WHATSAPP_TEMPLATES)) {
      expect(body.startsWith('{{')).toBe(false)
      expect(body.endsWith('}}')).toBe(false)
    }
  })
})
