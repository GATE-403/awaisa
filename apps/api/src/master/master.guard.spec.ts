import { type ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import type { Repository } from 'typeorm'
import type { AuthService } from '../auth/auth.service.js'
import type { BusinessesService } from '../businesses/businesses.service.js'
import type { Specialist } from '../catalog/specialist.entity.js'
import { MasterGuard } from './master.guard.js'

const BUSINESS = { id: 'business-1', slug: 'studio' }
const PHONE = '+996555000111'

const setup = (phone: string | null, master: Partial<Specialist> | null) => {
  const auth = {
    findCustomerBySession: vi.fn().mockResolvedValue(phone ? { id: 'customer-1', phone } : null),
  }
  const businesses = { findBySlug: vi.fn().mockResolvedValue(BUSINESS) }
  const specialists = { findOneBy: vi.fn().mockResolvedValue(master) }
  const guard = new MasterGuard(
    auth as unknown as AuthService,
    businesses as unknown as BusinessesService,
    specialists as unknown as Repository<Specialist>,
  )
  const request: Record<string, unknown> = { params: { slug: 'studio' }, cookies: {} }
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext

  return { guard, context, request, specialists }
}

describe('MasterGuard', () => {
  it('asks guests to sign in', async () => {
    const { guard, context } = setup(null, null)

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('refuses a number that is not an active master of this business', async () => {
    const { guard, context } = setup(PHONE, null)

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('This number is not linked to a specialist'),
    )
  })

  it('looks the master up by the signed-in phone, in this business, active only', async () => {
    const master = { id: 'master-1', businessId: BUSINESS.id, phone: PHONE, isActive: true }
    const { guard, context, request, specialists } = setup(PHONE, master)

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(specialists.findOneBy).toHaveBeenCalledWith({
      businessId: BUSINESS.id,
      phone: PHONE,
      isActive: true,
    })
    expect(request.master).toBe(master)
    expect(request.business).toBe(BUSINESS)
  })
})
