import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { BookingsModule } from '../bookings/bookings.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { CatalogModule } from '../catalog/catalog.module.js'
import { Specialist } from '../catalog/specialist.entity.js'
import { PayrollModule } from '../payroll/payroll.module.js'
import { MasterController } from './master.controller.js'
import { MasterGuard } from './master.guard.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([Specialist]),
    AuthModule,
    BookingsModule,
    BusinessesModule,
    CatalogModule,
    PayrollModule,
  ],
  controllers: [MasterController],
  providers: [MasterGuard],
})
export class MasterModule {}
