import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common'
import type { Business } from '../businesses/business.entity.js'
import { BusinessAccessGuard, CurrentBusiness } from '../businesses/business-access.guard.js'
import {
  type ClientsQuery,
  clientsQuerySchema,
  type UpdateClientInput,
  updateClientSchema,
} from './clients.schemas.js'
import { ClientsService } from './clients.service.js'

@Controller('manage/:slug/clients')
@UseGuards(BusinessAccessGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  list(
    @CurrentBusiness() business: Business,
    @Query({ schema: clientsQuerySchema }) query: ClientsQuery,
  ) {
    return this.clients.list(business, query.q)
  }

  @Get(':phone')
  get(@CurrentBusiness() business: Business, @Param('phone') phone: string) {
    return this.clients.get(business, phone)
  }

  @Put(':phone')
  update(
    @CurrentBusiness() business: Business,
    @Param('phone') phone: string,
    @Body({ schema: updateClientSchema }) body: UpdateClientInput,
  ) {
    return this.clients.update(business, phone, body)
  }
}
