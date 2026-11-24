import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import type { Customer } from '../customers/customer.entity.js'
import { SESSION_COOKIE } from './auth.constants.js'
import { AuthService } from './auth.service.js'

type AuthedRequest = Request & { customer?: Customer | null }

const readSessionToken = (request: Request): string | undefined =>
  (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE]

const resolveCustomer = async (request: AuthedRequest, auth: AuthService) => {
  if (request.customer === undefined) {
    request.customer = await auth.findCustomerBySession(readSessionToken(request))
  }

  return request.customer
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const customer = await resolveCustomer(context.switchToHttp().getRequest(), this.auth)
    if (!customer) throw new UnauthorizedException('Sign in with your phone number')

    return true
  }
}

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    await resolveCustomer(context.switchToHttp().getRequest(), this.auth)
    return true
  }
}

const CurrentCustomer = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthedRequest>().customer ?? null,
)

export { CurrentCustomer, readSessionToken }
