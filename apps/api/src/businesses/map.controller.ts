import { Controller, Get, Query } from '@nestjs/common'
import { type MapQuery, mapQuerySchema } from './businesses.schemas.js'
import { BusinessesService } from './businesses.service.js'

@Controller('map')
export class MapController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  list(@Query({ schema: mapQuerySchema }) query: MapQuery) {
    return this.businesses.listMap(query)
  }
}
