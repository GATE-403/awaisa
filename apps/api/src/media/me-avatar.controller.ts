import type { AvatarUpload } from '@awaisa/contracts'
import {
  Controller,
  Delete,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import type { Customer } from '../customers/customer.entity.js'
import { MediaUploadsService } from './media-uploads.service.js'

const imageUpload = FileInterceptor('file', {
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, accept) => accept(null, file.mimetype.startsWith('image/')),
})

/** The client's own photo for the profile: re-encoded as a 480² avatar like masters' photos. */
@Controller('me/avatar')
@UseGuards(AuthGuard)
export class MeAvatarController {
  constructor(private readonly uploads: MediaUploadsService) {}

  @Post()
  @UseInterceptors(imageUpload)
  upload(
    @CurrentCustomer() customer: Customer,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ): Promise<AvatarUpload> {
    return this.uploads.setAvatar(customer, file)
  }

  @Delete()
  @HttpCode(204)
  remove(@CurrentCustomer() customer: Customer): Promise<void> {
    return this.uploads.removeAvatar(customer)
  }
}
