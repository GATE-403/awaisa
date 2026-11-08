import { Controller, Get } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { CatalogService } from './catalog.service.js'

// The web server fetches the catalog for every page render from one IP, so a per-IP limit
// here would throttle all visitors at once.
@SkipThrottle()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  getCatalog() {
    return this.catalogService.getCatalog()
  }
}
