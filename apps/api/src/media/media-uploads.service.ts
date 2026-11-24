import { randomUUID } from 'node:crypto'
import type {
  AvatarUpload,
  CoverUpload,
  LogoUpload,
  SpecialistPhotoUpload,
  UploadedPhoto,
  WorkPhoto,
} from '@awaisa/contracts'
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Business } from '../businesses/business.entity.js'
import { Specialist } from '../catalog/specialist.entity.js'
import { Customer } from '../customers/customer.entity.js'
import { type ImageKind, processImage } from './images.js'
import { StorageService } from './storage.service.js'
import { WorkPhotosService } from './work-photos.service.js'

type UploadedImage = { buffer: Buffer }

type WorkPhotoTags = { serviceId: string | null; specialistId: string | null }

/** Uploaded pictures: re-encoded, stored, and the row that shows them updated. */
@Injectable()
export class MediaUploadsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Business) private readonly businesses: Repository<Business>,
    @InjectRepository(Specialist) private readonly specialists: Repository<Specialist>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    private readonly storage: StorageService,
    private readonly workPhotos: WorkPhotosService,
  ) {}

  async setCover(business: Business, file: UploadedImage | undefined): Promise<CoverUpload> {
    const url = await this.save(business, file, 'cover')
    if (business.coverUrl) await this.storage.remove(business.coverUrl)
    await this.businesses.update({ id: business.id }, { coverUrl: url })

    return { coverUrl: url }
  }

  async removeCover(business: Business): Promise<void> {
    if (business.coverUrl) await this.storage.remove(business.coverUrl)
    await this.businesses.update({ id: business.id }, { coverUrl: null })
  }

  async setLogo(business: Business, file: UploadedImage | undefined): Promise<LogoUpload> {
    const url = await this.save(business, file, 'logo')
    if (business.logoUrl) await this.storage.remove(business.logoUrl)
    await this.businesses.update({ id: business.id }, { logoUrl: url })

    return { logoUrl: url }
  }

  async removeLogo(business: Business): Promise<void> {
    if (business.logoUrl) await this.storage.remove(business.logoUrl)
    await this.businesses.update({ id: business.id }, { logoUrl: null })
  }

  async addWorkPhoto(
    business: Business,
    file: UploadedImage | undefined,
    tags: WorkPhotoTags,
  ): Promise<WorkPhoto[]> {
    await this.workPhotos.assertRoom(business.id)
    const url = await this.save(business, file, 'photo')
    await this.workPhotos.add(business.id, url, tags)

    return this.workPhotos.listForBusiness(business.id)
  }

  async removeWorkPhoto(businessId: string, id: string): Promise<WorkPhoto[]> {
    const url = await this.workPhotos.remove(businessId, id)
    if (url) await this.storage.remove(url)
    return this.workPhotos.listForBusiness(businessId)
  }

  async setSpecialistPhoto(
    business: Business,
    id: string,
    file: UploadedImage | undefined,
  ): Promise<SpecialistPhotoUpload> {
    const specialist = await this.findSpecialist(business, id)
    const url = await this.save(business, file, 'avatar')
    if (specialist.photoUrl) await this.storage.remove(specialist.photoUrl)
    await this.specialists.update({ id }, { photoUrl: url })

    return { photoUrl: url }
  }

  async removeSpecialistPhoto(business: Business, id: string): Promise<void> {
    const specialist = await this.findSpecialist(business, id)
    if (specialist.photoUrl) await this.storage.remove(specialist.photoUrl)
    await this.specialists.update({ id }, { photoUrl: null })
  }

  // `masterId`: only that master's visits (a master signed in by phone); null for the cabinet.
  async saveVisitPhoto(
    business: Business,
    bookingId: string | undefined,
    file: UploadedImage | undefined,
    masterId: string | null,
  ): Promise<UploadedPhoto> {
    if (!file) throw new BadRequestException('Choose a photo')
    const [booking] = (await this.dataSource.query(
      `SELECT "service_id" AS "serviceId", "specialist_id" AS "specialistId" FROM "bookings"
       WHERE "id" = $1 AND "business_id" = $2`,
      [bookingId ?? null, business.id],
    )) as { serviceId: string; specialistId: string }[]
    if (!booking) throw new BadRequestException('Visit not found')
    if (masterId && booking.specialistId !== masterId)
      throw new ForbiddenException('This visit belongs to another specialist')
    const freed = await this.workPhotos.makeRoomForVisit(business.id)
    if (freed) await this.storage.remove(freed).catch(() => undefined)
    const url = await this.storage.put(
      `${business.id}/${randomUUID()}.webp`,
      await processImage(file.buffer, 'photo'),
    )
    await this.workPhotos.add(business.id, url, {
      serviceId: booking.serviceId,
      specialistId: booking.specialistId,
      bookingId,
    })
    return { url }
  }

  /** The client's own photo for the profile: re-encoded as a 480² avatar like masters' photos. */
  async setAvatar(customer: Customer, file: UploadedImage | undefined): Promise<AvatarUpload> {
    if (!file) throw new BadRequestException('Choose a photo')
    const url = await this.storage.put(
      `customers/${randomUUID()}.webp`,
      await processImage(file.buffer, 'avatar'),
    )
    if (customer.avatarUrl) await this.storage.remove(customer.avatarUrl)
    await this.customers.update({ id: customer.id }, { avatarUrl: url })
    return { avatarUrl: url }
  }

  async removeAvatar(customer: Customer): Promise<void> {
    if (customer.avatarUrl) await this.storage.remove(customer.avatarUrl)
    await this.customers.update({ id: customer.id }, { avatarUrl: null })
  }

  private async save(business: Business, file: UploadedImage | undefined, kind: ImageKind) {
    if (!file) throw new BadRequestException('Choose a photo')

    return this.storage.put(
      `${business.id}/${randomUUID()}.webp`,
      await processImage(file.buffer, kind),
    )
  }

  private async findSpecialist(business: Business, id: string) {
    const specialist = await this.specialists.findOneBy({ id, businessId: business.id })
    if (!specialist) throw new NotFoundException('Specialist not found')

    return specialist
  }
}
