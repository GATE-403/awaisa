import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CatalogService } from './catalog.service.js'
import { Category } from './category.entity.js'
import { MasterScheduleService } from './master-schedule.service.js'
import { Service } from './service.entity.js'
import { Specialist } from './specialist.entity.js'
import { SpecialistHours } from './specialist-hours.entity.js'
import { SpecialistLeave } from './specialist-leave.entity.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Service, Specialist, SpecialistHours, SpecialistLeave]),
  ],
  providers: [CatalogService, MasterScheduleService],
  exports: [CatalogService, MasterScheduleService],
})
export class CatalogModule {}
