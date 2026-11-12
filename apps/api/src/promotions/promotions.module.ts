import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { Service } from '../catalog/service.entity.js'
import { Promotion } from './promotion.entity.js'
import { ManagePromotionsController, PromotionsController } from './promotions.controller.js'
import { PromotionsService } from './promotions.service.js'

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, Service]), AuthModule, BusinessesModule],
  controllers: [PromotionsController, ManagePromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
