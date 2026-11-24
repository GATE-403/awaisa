import type { ProfileSettings, PublicProfile } from '@awaisa/contracts'
import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common'
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
  profile(
    @Param('id') id: string,
    @CurrentCustomer() customer: Customer | null,
  ): Promise<PublicProfile> {
    // A public id or a handle (`/u/sabina`).
    if (!PUBLIC_ID_PATTERN.test(id) && !/^[a-z0-9][a-z0-9_.]{2,19}$/i.test(id)) {
      throw new NotFoundException('Profile not found')
    }
    return this.profiles.profile(id, customer)
  }

  // The face as a PNG for the story card and the share image (they cannot read WebP).
  @Get('profiles/:id/avatar.png')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=300')
  async avatar(@Param('id') id: string, @Query('w') width?: string) {
    if (!PUBLIC_ID_PATTERN.test(id) && !/^[a-z0-9][a-z0-9_.]{2,19}$/i.test(id)) {
      throw new NotFoundException('Profile not found')
    }
    const size = Math.min(1080, Math.max(64, Number(width) || 820))
    return new StreamableFile(await this.profiles.avatarPng(id, size))
  }

  @Get('me/profile')
  @UseGuards(AuthGuard)
  settings(@CurrentCustomer() customer: Customer): Promise<ProfileSettings> {
    return this.profiles.settings(customer)
  }

  @Patch('me/profile')
  @UseGuards(AuthGuard)
  update(
    @CurrentCustomer() customer: Customer,
    @Body({ schema: updateProfileStyleSchema }) body: UpdateProfileStyleInput,
  ): Promise<ProfileSettings> {
    return this.profiles.updateSettings(customer, body)
  }
}
