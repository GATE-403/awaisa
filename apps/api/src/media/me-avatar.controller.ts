import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuthGuard, CurrentCustomer } from '../auth/auth.guard.js'
import { Customer } from '../customers/customer.entity.js'
import { processImage } from './images.js'
import { StorageService } from './storage.service.js'

const imageUpload = FileInterceptor('file', {
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, accept) => accept(null, file.mimetype.startsWith('image/')),
})

/** The client's own photo for the profile: re-encoded as a 480² avatar like masters' photos. */
@Controller('me/avatar')
@UseGuards(AuthGuard)
export class MeAvatarController {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    private readonly storage: StorageService,
  ) {}

  @Post()
  @UseInterceptors(imageUpload)
  async upload(
    @CurrentCustomer() customer: Customer,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ) {
    if (!file) throw new BadRequestException('Выберите фото')
    const url = await this.storage.put(
      `customers/${randomUUID()}.webp`,
      await processImage(file.buffer, 'avatar'),
    )
    if (customer.avatarUrl) await this.storage.remove(customer.avatarUrl)
    await this.customers.update({ id: customer.id }, { avatarUrl: url })
    return { avatarUrl: url }
  }

  @Delete()
  @HttpCode(204)
  async remove(@CurrentCustomer() customer: Customer) {
    if (customer.avatarUrl) await this.storage.remove(customer.avatarUrl)
    await this.customers.update({ id: customer.id }, { avatarUrl: null })
  }
}
