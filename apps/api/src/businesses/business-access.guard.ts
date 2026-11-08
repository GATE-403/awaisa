import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import { readSessionToken } from '../auth/auth.guard.js'
import { AuthService } from '../auth/auth.service.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import type { Business } from './business.entity.js'
import { BusinessesService } from './businesses.service.js'

type BusinessRequest = Request & { customer?: Customer | null; business?: Business }

// Lets owners and staff of the business in :slug through; platform admins (ADMIN_PHONES) see every business.
@Injectable()
export class BusinessAccessGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly businesses: BusinessesService,
    private readonly config: ConfigService<Env, true>,
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
    if (!isPlatformAdmin && !(await this.businesses.isMember(business.id, customer.id))) {
      throw new ForbiddenException('Нет доступа к этому бизнесу')
    }

    request.business = business
    return true
  }
}

const CurrentBusiness = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<BusinessRequest>().business,
)

export { CurrentBusiness }
