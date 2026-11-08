import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { BookingsModule } from '../bookings/bookings.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { Customer } from './customer.entity.js'
import { MeController } from './me.controller.js'

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), AuthModule, BookingsModule, BusinessesModule],
  controllers: [MeController],
})
export class CustomersModule {}
