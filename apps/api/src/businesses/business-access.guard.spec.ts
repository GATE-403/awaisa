import { type ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import type { AuthService } from '../auth/auth.service.js'
import type { Env } from '../config/env.js'
import { BusinessAccessGuard, OwnerOnly } from './business-access.guard.js'
import type { BusinessesService } from './businesses.service.js'

const BUSINESS = { id: 'business-1', slug: 'studio' }
const ADMIN_PHONE = '+996700000001'

class Handlers {
  open() {}

  @OwnerOnly()
  ownersOnly() {}
}

@OwnerOnly()
class OwnerController {
  any() {}
}

type Setup = {
  phone?: string | null
  role?: 'owner' | 'staff' | null
  handler?: () => void
  controller?: new () => unknown
}

const setup = ({ phone = '+996555000111', role = null, handler, controller = Handlers }: Setup) => {
  const customer = phone ? { id: 'customer-1', phone } : null
  const auth = { findCustomerBySession: vi.fn().mockResolvedValue(customer) }
  const businesses = {
    findBySlug: vi.fn().mockResolvedValue(BUSINESS),
    memberRole: vi.fn().mockResolvedValue(role),
  }
  const config = { get: vi.fn().mockReturnValue([ADMIN_PHONE]) }
  const guard = new BusinessAccessGuard(
    auth as unknown as AuthService,
    businesses as unknown as BusinessesService,
    config as unknown as ConfigService<Env, true>,
    new Reflector(),
  )
  const request: Record<string, unknown> = { params: { slug: 'studio' }, cookies: {} }
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler ?? Handlers.prototype.open,
    getClass: () => controller,
  } as unknown as ExecutionContext

  return { guard, context, request, businesses }
}

describe('BusinessAccessGuard', () => {
  it('asks guests to sign in', async () => {
    const { guard, context } = setup({ phone: null })

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('keeps out an account that is not on the team', async () => {
    const { guard, context } = setup({ role: null })

    await expect(guard.canActivate(context)).rejects.toThrow('No access to this business')
  })

  it('lets staff run the day and hands the business and role on', async () => {
    const { guard, context, request } = setup({ role: 'staff' })

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(request.business).toBe(BUSINESS)
    expect(request.memberRole).toBe('staff')
  })

  it('refuses staff what only the owner may do, on a handler or a whole controller', async () => {
    const onHandler = setup({ role: 'staff', handler: Handlers.prototype.ownersOnly })
    const onController = setup({
      role: 'staff',
      handler: OwnerController.prototype.any,
      controller: OwnerController,
    })

    await expect(onHandler.guard.canActivate(onHandler.context)).rejects.toThrow(
      new ForbiddenException('Only the owner can do this'),
    )
    await expect(onController.guard.canActivate(onController.context)).rejects.toThrow(
      'Only the owner can do this',
    )
  })

  it('lets the owner do everything', async () => {
    const { guard, context, request } = setup({
      role: 'owner',
      handler: Handlers.prototype.ownersOnly,
    })

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(request.memberRole).toBe('owner')
  })

  it('treats a platform admin as the owner of any business without a membership', async () => {
    const { guard, context, request, businesses } = setup({
      phone: ADMIN_PHONE,
      role: null,
      handler: Handlers.prototype.ownersOnly,
    })

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(request.memberRole).toBe('owner')
    expect(businesses.memberRole).not.toHaveBeenCalled()
    // Unpublished pages are managed too.
    expect(businesses.findBySlug).toHaveBeenCalledWith('studio', { publishedOnly: false })
  })
})
