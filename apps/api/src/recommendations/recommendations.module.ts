import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BookingsModule } from '../bookings/bookings.module.js'
import { RecommendationsController } from './recommendations.controller.js'
import { RecommendationsService } from './recommendations.service.js'

@Module({
  imports: [AuthModule, BookingsModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
