import { Global, Module } from '@nestjs/common'
import { ReferralsService } from './referrals.service.js'

@Global()
@Module({
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
