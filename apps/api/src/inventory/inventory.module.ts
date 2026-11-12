import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { InventoryController } from './inventory.controller.js'
import { InventoryService } from './inventory.service.js'

@Module({
  imports: [AuthModule, BusinessesModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
