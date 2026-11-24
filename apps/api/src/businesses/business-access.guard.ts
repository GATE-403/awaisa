import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { readSessionToken } from '../auth/auth.guard.js'
import { AuthService } from '../auth/auth.service.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import type { Business } from './business.entity.js'
import type { MemberRole } from './business-member.entity.js'
import { BusinessesService } from './businesses.service.js'

type BusinessRequest = Request & {
  customer?: Customer | null
  business?: Business
  memberRole?: MemberRole
}

const OWNER_ONLY = 'ownerOnly'

/**
 * Routes only the owner may use: money (analytics), setting the business up, marketing and the
 * team. Administrators («staff») run the day - schedule, bookings, clients, waitlist, reviews.
 */
const OwnerOnly = () => SetMetadata(OWNER_ONLY, true)

// Lets owners and staff of the business in :slug through; platform admins (ADMIN_PHONES) see every business.
@Injectable()
export class BusinessAccessGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly businesses: BusinessesService,
    private readonly config: ConfigService<Env, true>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<BusinessRequest>()
    request.customer ??= await this.auth.findCustomerBySession(readSessionToken(request))
    const customer = request.customer
    if (!customer) throw new UnauthorizedException('Войдите по номеру телефона')

    const business = await this.businesses.findBySlug(String(request.params.slug), {
      publishedOnly: false,
    })
    const isPlatformAdmin = this.config
      .get('ADMIN_PHONES', { infer: true })
      .includes(customer.phone)
    const role: MemberRole | null = isPlatformAdmin
      ? 'owner'
      : await this.businesses.memberRole(business.id, customer.id)
    if (!role) throw new ForbiddenException('Нет доступа к этому бизнесу')
    const isOwnerOnly = this.reflector.getAllAndOverride<boolean>(OWNER_ONLY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isOwnerOnly && role !== 'owner') {
      throw new ForbiddenException('Это может только владелец')
    }

    request.business = business
    request.memberRole = role
    return true
  }
}

const CurrentBusiness = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<BusinessRequest>().business,
)

const CurrentRole = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<BusinessRequest>().memberRole ?? 'staff',
)

export { CurrentBusiness, CurrentRole, OwnerOnly }
