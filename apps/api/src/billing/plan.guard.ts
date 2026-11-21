import type { PlanFeature } from '@awaisa/contracts'
import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
  SetMetadata,
  UseGuards,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { InjectDataSource } from '@nestjs/typeorm'
import type { Request } from 'express'
import { DataSource } from 'typeorm'
import { BillingService } from './billing.service.js'

const REQUIRED_FEATURE = 'requiredFeature'

type PlanRequest = Request & { business?: { id: string } }

/**
 * Refuses a cabinet route the business's plan does not include (402 «Доступно на тарифе …»).
 * Runs after `BusinessAccessGuard`, which puts the business on the request; put
 * `@RequiresFeature` above `@UseGuards(BusinessAccessGuard)` on a controller so it does.
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly billing: BillingService,
    private readonly reflector: Reflector,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext) {
    const feature = this.reflector.getAllAndOverride<PlanFeature | undefined>(REQUIRED_FEATURE, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!feature) return true
    const request = context.switchToHttp().getRequest<PlanRequest>()
    const businessId = request.business?.id ?? (await this.findBusinessId(request.params.slug))
    await this.billing.assertFeature(businessId, feature)
    return true
  }

  private async findBusinessId(slug: string | string[] | undefined) {
    const [row] = (await this.dataSource.query('SELECT "id" FROM "businesses" WHERE "slug" = $1', [
      String(slug ?? ''),
    ])) as { id: string }[]
    if (!row) throw new NotFoundException('Бизнес не найден')
    return row.id
  }
}

/** The route (or the whole controller) needs this feature in the business's plan. */
const RequiresFeature = (feature: PlanFeature) =>
  applyDecorators(SetMetadata(REQUIRED_FEATURE, feature), UseGuards(PlanGuard))

export { RequiresFeature }
