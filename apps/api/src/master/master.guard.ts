import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Request } from 'express'
import { Repository } from 'typeorm'
import { readSessionToken } from '../auth/auth.guard.js'
import { AuthService } from '../auth/auth.service.js'
import type { Business } from '../businesses/business.entity.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import { Specialist } from '../catalog/specialist.entity.js'
import type { Customer } from '../customers/customer.entity.js'

type MasterRequest = Request & {
  customer?: Customer | null
  business?: Business
  master?: Specialist
}

// Lets a master of the business in :slug through: an active master whose number is the
// signed-in customer's verified phone. They see only their own bookings.
@Injectable()
export class MasterGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly businesses: BusinessesService,
    @InjectRepository(Specialist) private readonly specialists: Repository<Specialist>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<MasterRequest>()
    request.customer ??= await this.auth.findCustomerBySession(readSessionToken(request))
    const customer = request.customer
    if (!customer) throw new UnauthorizedException('Войдите по номеру телефона')

    const business = await this.businesses.findBySlug(String(request.params.slug), {
      publishedOnly: false,
    })
    const master = await this.specialists.findOneBy({
      businessId: business.id,
      phone: customer.phone,
      isActive: true,
    })
    if (!master) throw new ForbiddenException('Этот номер не привязан к мастеру')

    request.business = business
    request.master = master
    return true
  }
}

const CurrentMaster = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<MasterRequest>().master as Specialist,
)

export { CurrentMaster }
