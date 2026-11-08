import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { CatalogModule } from '../catalog/catalog.module.js'
import { Category } from '../catalog/category.entity.js'
import { Business } from './business.entity.js'
import { BusinessAccessGuard } from './business-access.guard.js'
import { BusinessMember } from './business-member.entity.js'
import { BusinessesController } from './businesses.controller.js'
import { BusinessesService } from './businesses.service.js'
import { ManageController } from './manage.controller.js'
import { WorkingHours } from './working-hours.entity.js'

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, BusinessMember, WorkingHours, Category]),
    AuthModule,
    CatalogModule,
  ],
  controllers: [BusinessesController, ManageController],
  providers: [BusinessesService, BusinessAccessGuard],
  exports: [BusinessesService, BusinessAccessGuard],
})
export class BusinessesModule {}
