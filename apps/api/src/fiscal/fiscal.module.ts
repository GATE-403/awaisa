import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { FiscalController, PublicReceiptsController } from './fiscal.controller.js'
import { FiscalService } from './fiscal.service.js'

@Module({
  imports: [AuthModule, BusinessesModule],
  controllers: [FiscalController, PublicReceiptsController],
  providers: [FiscalService],
  exports: [FiscalService],
})
export class FiscalModule {}
