import type { Repository } from 'typeorm'
import { describe, expect, it, vi } from 'vitest'
import type { TimeOff } from '../admin/time-off.entity.js'
import type { BusinessesService } from '../businesses/businesses.service.js'
import type { CatalogService } from '../catalog/catalog.service.js'
import type { MasterScheduleService } from '../catalog/master-schedule.service.js'
import type { FiscalService } from '../fiscal/fiscal.service.js'
import type { InventoryService } from '../inventory/inventory.service.js'
import type { LoyaltyService } from '../loyalty/loyalty.service.js'
import type { Booking } from './booking.entity.js'
import type { BookingsService } from './bookings.service.js'
import { SalonBookingsService } from './salon-bookings.service.js'

const setup = (returned: { id: string }[]) => {
  const calls: string[] = []
  const track =
    (name: string) =>
    async (...args: unknown[]) => {
      calls.push(`${name} ${JSON.stringify(args)}`)
    }
  // Postgres answers UPDATE … RETURNING through TypeORM as [rows, affected].
  const query = vi.fn(async (_sql: string, _params: unknown[]) => [returned, returned.length])
  const loyalty = {
    usePlannedSubscriptions: vi.fn(track('loyalty.usePlanned')),
    earnForVisits: vi.fn(track('loyalty.earn')),
    revertVisits: vi.fn(track('loyalty.revert')),
  }
  const inventory = {
    useForVisits: vi.fn(track('inventory.use')),
    revertVisits: vi.fn(track('inventory.revert')),
  }
  const fiscal = { syncVisits: vi.fn(track('fiscal.sync')) }
  const service = new SalonBookingsService(
    { query } as unknown as Repository<Booking>,
    {} as Repository<TimeOff>,
    {} as BookingsService,
    {} as CatalogService,
    {} as MasterScheduleService,
    {} as BusinessesService,
    loyalty as unknown as LoyaltyService,
    inventory as unknown as InventoryService,
    fiscal as unknown as FiscalService,
  )

  return { service, query, calls }
}

describe('SalonBookingsService.closeDay', () => {
  it('marks the day and sets off subscriptions, bonuses, materials and receipts for those visits', async () => {
    const { service, query, calls } = setup([{ id: 'a' }, { id: 'b' }])

    expect(await service.closeDay('biz-1', '2026-11-24')).toEqual({ ids: ['a', 'b'] })

    const [sql, params] = query.mock.calls[0]
    expect(sql).toContain(`"business_id" = $1`)
    expect(sql).toContain(`"outcome" IS NULL`)
    expect(params[0]).toBe('biz-1')
    expect(calls).toEqual([
      'loyalty.usePlanned [["a","b"]]',
      'loyalty.earn [["a","b"]]',
      'inventory.use [["a","b"]]',
      'fiscal.sync ["biz-1",["a","b"]]',
    ])
  })
})

describe('SalonBookingsService.reopen', () => {
  it('gives back only what this business marked, whatever ids came in', async () => {
    // «b» belongs to another business: the UPDATE skips it, so nothing of it is reverted.
    const { service, query, calls } = setup([{ id: 'a' }])

    await service.reopen('biz-1', ['a', 'b'])

    const [sql, params] = query.mock.calls[0]
    expect(sql).toContain(`"business_id" = $1`)
    expect(sql).toContain('RETURNING')
    expect(params).toEqual(['biz-1', ['a', 'b']])
    expect(calls).toEqual([
      'loyalty.revert [["a"]]',
      'inventory.revert [["a"]]',
      'fiscal.sync ["biz-1",["a"]]',
    ])
  })
})
