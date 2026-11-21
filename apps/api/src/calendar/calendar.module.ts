import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { Specialist } from '../catalog/specialist.entity.js'
import { MasterGuard } from '../master/master.guard.js'
import { CalendarController } from './calendar.controller.js'
import { CalendarFeedsService } from './calendar-feeds.service.js'

@Module({
  imports: [TypeOrmModule.forFeature([Specialist]), AuthModule, BusinessesModule],
  controllers: [CalendarController],
  providers: [CalendarFeedsService, MasterGuard],
})
export class CalendarModule {}
