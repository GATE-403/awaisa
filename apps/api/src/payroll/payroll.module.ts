import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { PayrollController } from './payroll.controller.js'
import { PayrollService } from './payroll.service.js'

@Module({
  imports: [AuthModule, BusinessesModule],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
