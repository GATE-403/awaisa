import type { ConfigService } from '@nestjs/config'
import type { DataSource } from 'typeorm'
import type { Env } from '../config/env.js'
import type { SmsService } from '../notifications/sms.service.js'
import type { Business } from './business.entity.js'
import { MembersService } from './members.service.js'

const business = { id: 'biz-1', slug: 'old-school', name: 'Old School' } as Business

type Answer = (sql: string, params: unknown[]) => unknown[]

const setup = (answer: Answer = () => []) => {
  const query = vi.fn(async (sql: string, params: unknown[] = []) => answer(sql, params))
  const sms = { sendSafely: vi.fn(async () => undefined) }
  const config = { get: () => 'https://awaisa.kg' } as unknown as ConfigService<Env, true>
  const service = new MembersService(
    { query } as unknown as DataSource,
    sms as unknown as SmsService,
    config,
  )
  return { service, query, sms }
}

describe('MembersService.add', () => {
  it('refuses a number it cannot read before touching the database', async () => {
    const { service, query, sms } = setup()

    await expect(service.add(business, 'abc')).rejects.toThrow('Check the phone number')
    expect(query).not.toHaveBeenCalled()
    expect(sms.sendSafely).not.toHaveBeenCalled()
  })

  it('adds a new administrator and texts them the cabinet link', async () => {
    const { service, query, sms } = setup((sql) => {
      if (sql.includes('INSERT INTO "customers"')) return [{ id: 'cust-1' }]
      if (sql.includes('INSERT INTO "business_members"')) return [{ customer_id: 'cust-1' }]
      return [
        { id: 'owner-1', phone: '+996555000000', name: 'Owner', role: 'owner' },
        { id: 'cust-1', phone: '+996555123456', name: '', role: 'staff' },
      ]
    })

    const members = await service.add(business, '0555 123 456')

    expect(query.mock.calls[0]?.[1]).toEqual(['+996555123456'])
    expect(query.mock.calls[1]?.[1]).toEqual(['biz-1', 'cust-1'])
    expect(sms.sendSafely).toHaveBeenCalledWith(
      '+996555123456',
      expect.stringContaining('https://awaisa.kg/manage/old-school'),
    )
    expect(members.map((member) => member.role)).toEqual(['owner', 'admin'])
  })

  it('texts nobody when the number is already on the team', async () => {
    const { service, sms } = setup((sql) =>
      sql.includes('INSERT INTO "customers"') ? [{ id: 'cust-1' }] : [],
    )

    await service.add(business, '+996555123456')

    expect(sms.sendSafely).not.toHaveBeenCalled()
  })
})

describe('MembersService.remove', () => {
  it('never removes yourself', async () => {
    const { service, query } = setup()

    await expect(service.remove('biz-1', 'me', 'me')).rejects.toThrow("You can't remove yourself")
    expect(query).not.toHaveBeenCalled()
  })

  it('removes administrators only, so the owner stays', async () => {
    const { service, query } = setup()

    await service.remove('biz-1', 'cust-1', 'me')

    const [sql, params] = query.mock.calls[0] ?? []
    expect(sql).toContain(`"role" = 'staff'`)
    expect(params).toEqual(['biz-1', 'cust-1'])
  })
})
