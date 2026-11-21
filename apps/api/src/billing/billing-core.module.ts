import { Global, Module } from '@nestjs/common'
import { BillingService } from './billing.service.js'
import { PlanGuard } from './plan.guard.js'

// Global: every cabinet module checks the plan through BillingService / @RequiresFeature.
@Global()
@Module({
  providers: [BillingService, PlanGuard],
  exports: [BillingService, PlanGuard],
})
export class BillingCoreModule {}
