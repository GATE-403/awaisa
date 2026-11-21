import type { ConfigService } from '@nestjs/config'
import type { ModuleRef } from '@nestjs/core'
import type { DataSource } from 'typeorm'
import { describe, expect, it, vi } from 'vitest'
import type { BillingService } from '../billing/billing.service.js'
import type { Env } from '../config/env.js'
import type { PaymentsService } from './payments.service.js'
import { SubscriptionOrdersService } from './subscription-orders.service.js'

const order = (status: string, bookingId: string | null = null) => ({
  id: 'order-1',
  business_id: 'biz-1',
  plan_id: 'plan-1',
  phone: '+996555111222',
  title: '5 стрижек',
  service_id: 'cut',
  visits: 5,
  valid_days: 90,
  amount: 6000,
  booking_id: bookingId,
  status,
})

type Answer = (sql: string) => unknown[]

const setup = (answer: Answer, { hasLoyalty = true } = {}) => {
  const query = vi.fn(async (sql: string, _params: unknown[] = []) => answer(sql))
  const transaction = vi.fn(async (work: (manager: { query: typeof query }) => unknown) =>
    work({ query }),
  )
  const payments = {
    isAvailable: true,
    registerOrder: vi.fn(),
    createOrderCheckout: vi.fn(async () => ({ paymentId: 'pay-1', url: '/pay/pay-1?s=sig' })),
    failPendingOrders: vi.fn(async () => undefined),
  }
  const bookingPayments = { onSubscriptionPaid: vi.fn(async () => undefined) }
  const moduleRef = { get: () => bookingPayments } as unknown as ModuleRef
  const billing = { hasFeature: vi.fn(async () => hasLoyalty) }
  const config = { get: () => 'x'.repeat(32) } as unknown as ConfigService<Env, true>
  const service = new SubscriptionOrdersService(
    { query, transaction } as unknown as DataSource,
    payments as unknown as PaymentsService,
    config,
    moduleRef,
    billing as unknown as BillingService,
  )
  return { service, query, payments, bookingPayments, billing }
}

const issuedRows =
  (status: string, bookingId: string | null = null) =>
  (sql: string) => {
    if (sql.includes('FOR UPDATE')) return [order(status, bookingId)]
    if (sql.includes('INSERT INTO "client_subscriptions"')) return [{ id: 'sub-1' }]
    return []
  }

describe('SubscriptionOrdersService.onPaid', () => {
  it('issues the subscription on the paid number, priced and dated by the payment', async () => {
    const { service, query } = setup(issuedRows('pending'))

    expect(await service.onPaid('order-1')).toEqual({ subscriptionId: 'sub-1', bookingId: null })
    const insert = query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO "client_subscriptions"'),
    )
    expect(insert?.[1]).toEqual([
      'biz-1',
      'plan-1',
      '+996555111222',
      '5 стрижек',
      'cut',
      5,
      5,
      6000,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      expect.any(Date),
    ])
    expect(query).toHaveBeenCalledWith(expect.stringContaining('"status" = \'paid\''), [
      'order-1',
      expect.any(Date),
      'sub-1',
    ])
  })

  it('confirms the booking bought with it, paid by the new subscription', async () => {
    const { service, bookingPayments } = setup(issuedRows('pending', 'booking-1'))

    await service.onPaid('order-1')

    expect(bookingPayments.onSubscriptionPaid).toHaveBeenCalledWith('booking-1', 'sub-1')
  })

  it('issues nothing again for an order already paid', async () => {
    const { service, query, bookingPayments } = setup(issuedRows('paid', 'booking-1'))

    expect(await service.onPaid('order-1')).toBeNull()
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT'))).toBe(false)
    expect(bookingPayments.onSubscriptionPaid).not.toHaveBeenCalled()
  })

  it('places no order without a payment: nothing is issued before the money comes', async () => {
    const { service, payments, query } = setup((sql) =>
      sql.includes('INSERT INTO "subscription_orders"') ? [{ id: 'order-1' }] : [],
    )

    const placed = await service.order(
      {
        id: 'plan-1',
        business_id: 'biz-1',
        title: '5 стрижек',
        service_id: 'cut',
        visits: 5,
        valid_days: 90,
        price: 6000,
        business_name: 'Studio',
      },
      { customerId: 'c-1', phone: '+996555111222' },
    )

    expect(placed.checkoutUrl).toBe('/pay/pay-1?s=sig')
    expect(payments.createOrderCheckout).toHaveBeenCalledWith('subscription', 'order-1', 6000, {
      description: 'Абонемент «5 стрижек», Studio',
      phone: '+996555111222',
    })
    expect(query.mock.calls.some(([sql]) => sql.includes('"client_subscriptions"'))).toBe(false)
  })

  it('registers itself as the «subscription» kind of payments', () => {
    const { service, payments } = setup(() => [])
    service.onModuleInit()
    expect(payments.registerOrder).toHaveBeenCalledWith('subscription', expect.any(Object))
  })

  it('still issues a paid order after the plan lost «loyalty»: the money came', async () => {
    const { service, billing } = setup(issuedRows('pending'), { hasLoyalty: false })

    expect(await service.onPaid('order-1')).toEqual({ subscriptionId: 'sub-1', bookingId: null })
    expect(billing.hasFeature).not.toHaveBeenCalled()
  })
})

describe('SubscriptionOrdersService: online sale needs the «loyalty» plan feature', () => {
  const plans = (sql: string) => {
    if (sql.includes('FROM "businesses" WHERE "slug"')) return [{ id: 'biz-1' }]
    if (sql.includes('FROM "subscription_plans"'))
      return [{ id: 'plan-1', business_id: 'biz-1', title: '5 стрижек', price: 6000 }]
    return []
  }

  it('shows and sells online plans while the plan has «loyalty»', async () => {
    const { service, billing } = setup(plans)

    expect(await service.listOnline('studio')).toHaveLength(1)
    await expect(service.findOnlinePlan('biz-1', 'plan-1')).resolves.toMatchObject({ id: 'plan-1' })
    expect(billing.hasFeature).toHaveBeenCalledWith('biz-1', 'loyalty')
  })

  it('shows none and refuses to sell (also with a booking) without it', async () => {
    const { service } = setup(plans, { hasLoyalty: false })

    expect(await service.listOnline('studio')).toEqual([])
    await expect(service.findOnlinePlan('biz-1', 'plan-1')).rejects.toThrow(
      'Абонемент не продаётся онлайн',
    )
  })
})
