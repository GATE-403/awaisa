import { Controller, Get, Query } from '@nestjs/common'
import { Cached } from '../cache/cached.decorator.js'
import { type MapQuery, mapQuerySchema } from './businesses.schemas.js'
import { BusinessesService } from './businesses.service.js'

@Controller('map')
export class MapController {
  constructor(private readonly businesses: BusinessesService) {}

  @Cached({ ttl: 60, tags: ['catalog'], maxAge: 30 })
  @Get()
  list(@Query({ schema: mapQuerySchema }) query: MapQuery) {
    return this.businesses.listMap(query)
  }
}
