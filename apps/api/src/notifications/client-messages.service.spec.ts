import type { ConfigService } from '@nestjs/config'
import type { DataSource } from 'typeorm'
import type { BillingService } from '../billing/billing.service.js'
import type { Env } from '../config/env.js'
import { ClientMessagesService } from './client-messages.service.js'
import type { SmsService } from './sms.service.js'
import type { WhatsappService } from './whatsapp.service.js'
import { whatsappConfirmation } from './whatsapp-messages.js'

const PHONE = '+996555123456'
const LINK = 'https://awaisa.kg/v/1?s=sig'

const message = {
  text: `Awaisa Studio: вы записаны. Перенести или отменить: ${LINK}`,
  link: { label: 'Перенести или отменить', url: LINK },
  whatsapp: whatsappConfirmation(
    {
      business: { name: 'Awaisa Studio', slug: 'awaisa-studio' },
      serviceName: 'Стрижка',
      specialistName: 'Эрлан',
      date: '2026-11-24',
      time: '15:30',
    },
    LINK,
  ),
}

const setup = ({
  chatId = null as string | null,
  isWhatsappOn = true,
  isWhatsappAccepted = true,
  canSend = true,
  botToken = undefined as string | undefined,
  hasSms = true,
} = {}) => {
  const dataSource = {
    query: vi.fn(async () => (chatId ? [{ chatId }] : [])),
  } as unknown as DataSource
  const sms = {
    sendSafely: vi.fn(async () => undefined),
    canSendTo: vi.fn(() => canSend),
  }
  const whatsapp = {
    isEnabled: vi.fn(() => isWhatsappOn),
    send: vi.fn(async () => isWhatsappAccepted),
  }
  const config = {
    get: (key: string) => (key === 'TELEGRAM_BOT_TOKEN' ? botToken : 'secret'),
  } as unknown as ConfigService<Env, true>
  const billing = { takeSms: vi.fn(async () => hasSms) }
  const service = new ClientMessagesService(
    dataSource,
    sms as unknown as SmsService,
    whatsapp as unknown as WhatsappService,
    config,
    billing as unknown as BillingService,
  )
  return { service, sms, whatsapp, billing }
}

describe('ClientMessagesService.send', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends WhatsApp when it is on and the number has no Telegram', async () => {
    const { service, sms, whatsapp } = setup()
    await service.send(PHONE, message)
    expect(whatsapp.send).toHaveBeenCalledWith(PHONE, message.whatsapp)
    expect(sms.sendSafely).not.toHaveBeenCalled()
  })

  it('falls back to SMS when WhatsApp refuses the message', async () => {
    const { service, sms, whatsapp } = setup({ isWhatsappAccepted: false })
    await service.send(PHONE, message)
    expect(whatsapp.send).toHaveBeenCalled()
    expect(sms.sendSafely).toHaveBeenCalledWith(PHONE, message.text)
  })

  it('sends SMS when WhatsApp is off or the message has no template', async () => {
    const off = setup({ isWhatsappOn: false })
    await off.service.send(PHONE, message)
    expect(off.whatsapp.send).not.toHaveBeenCalled()
    expect(off.sms.sendSafely).toHaveBeenCalledWith(PHONE, message.text)

    const plain = setup()
    await plain.service.send(PHONE, { text: message.text })
    expect(plain.whatsapp.send).not.toHaveBeenCalled()
    expect(plain.sms.sendSafely).toHaveBeenCalledWith(PHONE, message.text)
  })

  it('keeps WhatsApp to the countries SMS may reach', async () => {
    const { service, sms, whatsapp } = setup({ canSend: false })
    await service.send('+79991234567', message)
    expect(whatsapp.send).not.toHaveBeenCalled()
    // SmsService.sendSafely logs the skip itself and sends nothing.
    expect(sms.sendSafely).toHaveBeenCalledWith('+79991234567', message.text)
  })

  it('prefers the linked Telegram chat and stops there when it takes the message', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
    const { service, sms, whatsapp } = setup({ chatId: '42', botToken: 'token' })
    await service.send(PHONE, message)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(whatsapp.send).not.toHaveBeenCalled()
    expect(sms.sendSafely).not.toHaveBeenCalled()
  })

  it('goes on to WhatsApp when Telegram refuses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, description: 'bot was blocked' })),
    )
    const { service, sms, whatsapp } = setup({ chatId: '42', botToken: 'token' })
    await service.send(PHONE, message)
    expect(whatsapp.send).toHaveBeenCalled()
    expect(sms.sendSafely).not.toHaveBeenCalled()
  })

  it('never throws', async () => {
    const { service, whatsapp } = setup()
    whatsapp.send.mockRejectedValueOnce(new Error('boom'))
    await expect(service.send(PHONE, message)).resolves.toBeUndefined()
  })

  it('skips an optional SMS once the business has used its month of SMS', async () => {
    const { service, sms, billing } = setup({ isWhatsappOn: false, hasSms: false })
    await service.send(PHONE, { ...message, billing: { businessId: 'b1', isOptional: true } })
    expect(billing.takeSms).toHaveBeenCalledWith('b1', { businessId: 'b1', isOptional: true })
    expect(sms.sendSafely).not.toHaveBeenCalled()
  })

  it('counts a visit confirmation against the month, and sends it', async () => {
    const { service, sms, billing } = setup({ isWhatsappOn: false })
    await service.send(PHONE, { ...message, billing: { businessId: 'b1', isOptional: false } })
    expect(billing.takeSms).toHaveBeenCalled()
    expect(sms.sendSafely).toHaveBeenCalledWith(PHONE, message.text)
  })
})
