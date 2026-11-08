import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CatalogService } from './catalog.service.js'
import { Category } from './category.entity.js'
import { Service } from './service.entity.js'
import { Specialist } from './specialist.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([Category, Service, Specialist])],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
