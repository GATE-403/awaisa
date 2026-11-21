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
  serviceName: 'Мужская стрижка',
  specialistName: 'Эрлан Асанов',
  date: '2026-11-24',
  time: '15:30',
}

const options = { to: '+996555123456', language: 'ru', webUrl: WEB }

describe('whatsapp messages', () => {
  it('builds a template payload with body parameters and the link after the site as the button', () => {
    expect(toWhatsappPayload(whatsappConfirmation(booking, LINK), options)).toEqual({
      messaging_product: 'whatsapp',
      to: '996555123456',
      type: 'template',
      template: {
        name: 'booking_confirmation',
        language: { code: 'ru' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Awaisa Studio' },
              { type: 'text', text: 'Мужская стрижка' },
              { type: 'text', text: '24 ноября' },
              { type: 'text', text: '15:30' },
              { type: 'text', text: 'Эрлан Асанов' },
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
        { ...booking, serviceName: 'Стрижка\n   и    борода', specialistName: ' ' },
        LINK,
      ),
      options,
    )
    const body = payload?.template.components[0]
    expect(body?.parameters.map((parameter) => parameter.text)).toEqual([
      'Awaisa Studio',
      'Стрижка и борода',
      '24 ноября',
      '15:30',
      '-',
    ])
  })

  it('fills every template parameter it declares', () => {
    const messages = [
      whatsappConfirmation(booking, LINK),
      whatsappReminder(booking, false, LINK),
      whatsappSalonCancellation(booking, WEB),
      whatsappReturnVisit('Awaisa Studio', 'Стрижка', 'Эрлан Асанов', `${WEB}/awaisa-studio/book`),
    ]
    for (const message of messages) {
      const count = WHATSAPP_TEMPLATES[message.template].body.match(/\{\{\d+\}\}/g)?.length
      expect(message.params).toHaveLength(count ?? 0)
      expect(renderWhatsapp(message)).not.toContain('{{')
    }
  })

  it('renders the reminder and the cancellation as the client reads them', () => {
    expect(renderWhatsapp(whatsappReminder(booking, true, LINK))).toBe(
      `Напоминаем: сегодня в 15:30 у вас Мужская стрижка в Awaisa Studio, мастер Эрлан Асанов. Ждём вас! [Перенести или отменить: ${LINK}]`,
    )
    expect(renderWhatsapp(whatsappSalonCancellation(booking, WEB))).toBe(
      `К сожалению, запись в Awaisa Studio на 24 ноября в 15:30 отменена. Выберите другое время по кнопке ниже. [Выбрать время: ${WEB}/awaisa-studio/book]`,
    )
    expect(
      renderWhatsapp(whatsappReturnVisit('Awaisa Studio', 'Стрижка', 'Эрлан Асанов', `${WEB}/x`)),
    ).toContain('Эрлан ждёт вас')
  })

  it('never starts or ends a template body with a parameter (Meta rejects those)', () => {
    for (const { body } of Object.values(WHATSAPP_TEMPLATES)) {
      expect(body.startsWith('{{')).toBe(false)
      expect(body.endsWith('}}')).toBe(false)
    }
  })
})
