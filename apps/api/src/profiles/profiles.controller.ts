import { Body, Controller, Get, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentCustomer, OptionalAuthGuard } from '../auth/auth.guard.js'
import { PUBLIC_ID_PATTERN } from '../common/public-id.js'
import type { Customer } from '../customers/customer.entity.js'
import { type UpdateProfileStyleInput, updateProfileStyleSchema } from './profiles.schemas.js'
import { ProfilesService } from './profiles.service.js'

@Controller()
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  // Someone's public page; the owner also sees it when it is hidden (`isOwn`).
  @Get('profiles/:id')
  @UseGuards(OptionalAuthGuard)
  profile(@Param('id') id: string, @CurrentCustomer() customer: Customer | null) {
    // A public id or a handle (`/u/sabina`).
    if (!PUBLIC_ID_PATTERN.test(id) && !/^[a-z0-9][a-z0-9_.]{2,19}$/i.test(id)) {
      throw new NotFoundException('Профиль не найден')
    }
    return this.profiles.profile(id, customer)
  }

  @Get('me/profile')
  @UseGuards(AuthGuard)
  settings(@CurrentCustomer() customer: Customer) {
    return this.profiles.settings(customer)
  }

  @Patch('me/profile')
  @UseGuards(AuthGuard)
  update(
    @CurrentCustomer() customer: Customer,
    @Body({ schema: updateProfileStyleSchema }) body: UpdateProfileStyleInput,
  ) {
    return this.profiles.updateSettings(customer, body)
  }
}
