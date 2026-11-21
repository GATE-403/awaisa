import type { ConfigService } from '@nestjs/config'
import type { DataSource } from 'typeorm'
import type { BillingService } from '../billing/billing.service.js'
import type { PaymentsService } from '../bookings/payments.service.js'
import type { Env } from '../config/env.js'
import type { LoyaltyService } from '../loyalty/loyalty.service.js'
import type { ClientMessagesService } from '../notifications/client-messages.service.js'
import type { TelegramBotService } from '../telegram/telegram-bot.service.js'
import { CertificateSalesService } from './certificate-sales.service.js'

const BUYER = '+996555111222'
const RECIPIENT = '+996700333444'

const paidOrder = {
  id: 'order-1',
  business_id: 'biz-1',
  amount: 3000,
  buyer_name: 'Нурлан',
  buyer_phone: BUYER,
  recipient_name: 'Айгуль',
  recipient_phone: RECIPIENT,
  message: 'С днём рождения!',
}

type Answer = (sql: string, params: unknown[]) => unknown[]

const setup = (answer: Answer, { isAvailable = true, hasLoyalty = true } = {}) => {
  const query = vi.fn(async (sql: string, params: unknown[] = []) => answer(sql, params))
  const payments = {
    isAvailable,
    registerOrder: vi.fn(),
    createOrderCheckout: vi.fn(async () => ({ paymentId: 'pay-1', url: '/pay/pay-1?s=sig' })),
    failPendingOrders: vi.fn(async () => undefined),
  }
  const loyalty = {
    issueCertificate: vi.fn(async () => ({ id: 'cert-1', code: 'ABCD2345', amount: 3000 })),
  }
  const clientMessages = { send: vi.fn(async () => undefined) }
  const telegram = { notifyBusiness: vi.fn(async () => undefined) }
  const config = {
    get: () => 'https://awaisa.kg',
  } as unknown as ConfigService<Env, true>
  const transaction = vi.fn(async (work: (manager: { query: typeof query }) => unknown) =>
    work({ query }),
  )
  const service = new CertificateSalesService(
    { query, transaction } as unknown as DataSource,
    payments as unknown as PaymentsService,
    loyalty as unknown as LoyaltyService,
    clientMessages as unknown as ClientMessagesService,
    telegram as unknown as TelegramBotService,
    config,
    { hasFeature: vi.fn(async () => hasLoyalty) } as unknown as BillingService,
  )
  return { service, query, payments, loyalty, clientMessages, telegram }
}

describe('CertificateSalesService.onPaid', () => {
  it('issues the certificate once the payment is confirmed and texts both codes', async () => {
    const { service, loyalty, clientMessages, query } = setup((sql) => {
      if (sql.includes('SET "status" = \'paid\'')) return [[paidOrder], 1]
      if (sql.includes('FROM "businesses"'))
        return [{ name: 'Awaisa Studio', slug: 'awaisa-studio' }]
      return []
    })

    await service.onPaid('order-1')

    expect(loyalty.issueCertificate).toHaveBeenCalledWith(
      'biz-1',
      { amount: 3000, recipient: 'Айгуль', phone: RECIPIENT, expiresOn: null },
      expect.objectContaining({ query }),
    )
    expect(query).toHaveBeenCalledWith(expect.stringContaining('"certificate_id" = $2'), [
      'order-1',
      'cert-1',
    ])
    expect(clientMessages.send).toHaveBeenCalledTimes(2)
    expect(clientMessages.send).toHaveBeenCalledWith(
      BUYER,
      expect.objectContaining({ text: expect.stringContaining('ABCD2345') }),
    )
    expect(clientMessages.send).toHaveBeenCalledWith(
      RECIPIENT,
      expect.objectContaining({
        text: expect.stringContaining('Нурлан дарит вам'),
        link: { label: 'Записаться', url: 'https://awaisa.kg/awaisa-studio/book' },
      }),
    )
  })

  it('claims the order only while unpaid: a second notification issues nothing', async () => {
    const { service, query, loyalty, clientMessages } = setup(() => [[], 0])

    await service.onPaid('order-1')

    expect(query.mock.calls[0]?.[0]).toContain('"status" <> \'paid\'')
    expect(loyalty.issueCertificate).not.toHaveBeenCalled()
    expect(clientMessages.send).not.toHaveBeenCalled()
  })

  it('sends the code only to the buyer when there is no recipient number', async () => {
    const { service, loyalty, clientMessages } = setup((sql) => {
      if (sql.includes('SET "status" = \'paid\''))
        return [[{ ...paidOrder, recipient_phone: null, recipient_name: '' }], 1]
      if (sql.includes('FROM "businesses"'))
        return [{ name: 'Awaisa Studio', slug: 'awaisa-studio' }]
      return []
    })

    await service.onPaid('order-1')

    expect(loyalty.issueCertificate).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({ recipient: 'Нурлан', phone: BUYER }),
      expect.anything(),
    )
    expect(clientMessages.send).toHaveBeenCalledTimes(1)
    expect(clientMessages.send).toHaveBeenCalledWith(
      BUYER,
      expect.objectContaining({ text: expect.stringContaining('Передайте код') }),
    )
  })

  it('leaves the order unpaid when issuing fails, so the next notification tries again', async () => {
    const { service, loyalty, clientMessages } = setup((sql) =>
      sql.includes('SET "status" = \'paid\'') ? [[paidOrder], 1] : [],
    )
    loyalty.issueCertificate.mockRejectedValueOnce(new Error('database went away'))

    await expect(service.onPaid('order-1')).rejects.toThrow('database went away')
    expect(clientMessages.send).not.toHaveBeenCalled()
  })
})

describe('CertificateSalesService.expireOrders', () => {
  it('expires unpaid orders past their time and fails their payment attempts', async () => {
    const { service, query, payments } = setup((sql) =>
      sql.includes('"status" = \'expired\'') ? [[{ id: 'order-1' }, { id: 'order-2' }], 2] : [],
    )

    await service.expireOrders()

    expect(query.mock.calls[0]?.[0]).toMatch(/"status" = 'pending' AND "due_at" < now\(\)/)
    expect(payments.failPendingOrders).toHaveBeenCalledWith('certificate', ['order-1', 'order-2'])
  })

  it('does nothing to payments when no order ran out of time', async () => {
    const { service, payments } = setup(() => [[], 0])

    await service.expireOrders()

    expect(payments.failPendingOrders).toHaveBeenCalledWith('certificate', [])
  })
})

describe('CertificateSalesService.createOrder', () => {
  const business = { id: 'biz-1', name: 'Awaisa Studio', amounts: [1000, 3000] }
  const input = {
    amount: 3000,
    buyerName: 'Нурлан',
    buyerPhone: '0555 111 222',
    recipientName: 'Айгуль',
    recipientPhone: '0700 333 444',
    message: '',
  }

  it('keeps the order waiting for its payment and answers with the checkout', async () => {
    const { service, payments, query } = setup((sql) => {
      if (sql.includes('FROM "businesses"')) return [business]
      if (sql.includes('INSERT INTO "certificate_orders"')) return [{ id: 'order-1' }]
      return []
    })

    await expect(service.createOrder('awaisa-studio', input, null)).resolves.toEqual({
      id: 'order-1',
      checkoutUrl: '/pay/pay-1?s=sig',
    })
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT'))
    expect(insert?.[1]).toEqual(expect.arrayContaining([BUYER, RECIPIENT, 3000]))
    expect(payments.createOrderCheckout).toHaveBeenCalledWith(
      'certificate',
      'order-1',
      3000,
      expect.objectContaining({ phone: BUYER }),
    )
  })

  it('refuses an amount the place does not offer', async () => {
    const { service } = setup((sql) => (sql.includes('FROM "businesses"') ? [business] : []))

    await expect(
      service.createOrder('awaisa-studio', { ...input, amount: 2000 }, null),
    ).rejects.toThrow('Выберите сумму')
  })

  it('sells nothing on a plan without loyalty', async () => {
    const { service } = setup((sql) => (sql.includes('FROM "businesses"') ? [business] : []), {
      hasLoyalty: false,
    })

    await expect(service.createOrder('awaisa-studio', input, null)).rejects.toThrow('не продаются')
    await expect(service.saleFor('awaisa-studio')).resolves.toEqual({ amounts: [] })
  })

  it('sells nothing while payments are off', async () => {
    const { service } = setup(() => [business], { isAvailable: false })

    await expect(service.createOrder('awaisa-studio', input, null)).rejects.toThrow('не продаются')
  })
})
