import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { ImportController } from './import.controller.js'
import { ImportService } from './import.service.js'

@Module({
  imports: [AuthModule, BusinessesModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
