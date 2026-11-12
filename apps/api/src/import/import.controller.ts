import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import {
  type ImportBookingsInput,
  type ImportClientsInput,
  importBookingsSchema,
  importClientsSchema,
} from './import.schemas.js'
import { ImportService } from './import.service.js'

@Controller('manage/:slug/import')
@UseGuards(BusinessAccessGuard)
@OwnerOnly()
export class ImportController {
  constructor(private readonly imports: ImportService) {}

  @Post('clients')
  clients(
    @CurrentBusiness() business: Business,
    @Body({ schema: importClientsSchema }) body: ImportClientsInput,
  ) {
    return this.imports.importClients(business.id, body)
  }

  @Post('bookings')
  bookings(
    @CurrentBusiness() business: Business,
    @Body({ schema: importBookingsSchema }) body: ImportBookingsInput,
  ) {
    return this.imports.importBookings(business.id, body)
  }
}
