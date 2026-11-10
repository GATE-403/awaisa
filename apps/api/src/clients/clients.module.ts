import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { ClientRecord } from './client-record.entity.js'
import { ClientsController } from './clients.controller.js'
import { ClientsService } from './clients.service.js'

@Module({
  imports: [TypeOrmModule.forFeature([ClientRecord]), AuthModule, BusinessesModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
