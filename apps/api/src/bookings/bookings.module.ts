import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CatalogModule } from '../catalog/catalog.module.js'
import { Booking } from './booking.entity.js'
import { BookingsController } from './bookings.controller.js'
import { BookingsService } from './bookings.service.js'

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), CatalogModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
