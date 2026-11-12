import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { ManageLoyaltyController, MyLoyaltyController } from './loyalty.controller.js'
import { LoyaltyService } from './loyalty.service.js'

@Module({
  imports: [AuthModule, BusinessesModule],
  controllers: [ManageLoyaltyController, MyLoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
