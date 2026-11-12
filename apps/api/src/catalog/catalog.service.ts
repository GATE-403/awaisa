import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import type {
  CategoryInput,
  ServiceInput,
  SpecialistInput,
} from '../businesses/businesses.schemas.js'
import { normalizePhone } from '../common/phone.js'
import { Category } from './category.entity.js'
import { Service } from './service.entity.js'
import { Specialist } from './specialist.entity.js'

type CatalogView = {
  categories: Pick<Category, 'id' | 'name'>[]
  services: (Pick<
    Service,
    | 'id'
    | 'categoryId'
    | 'name'
    | 'description'
    | 'durationMinutes'
    | 'price'
    | 'deposit'
    | 'rebookDays'
    | 'isPopular'
  > & { isActive?: boolean })[]
  specialists: (Pick<Specialist, 'id' | 'name' | 'role' | 'rating'> & {
    serviceIds: string[]
    isActive?: boolean
  })[]
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Service) private readonly services: Repository<Service>,
    @InjectRepository(Specialist) private readonly specialists: Repository<Specialist>,
  ) {}

  // Public pages see active items only; the owner's cabinet also gets the hidden ones.
  async getCatalog(businessId: string, { includeInactive = false } = {}): Promise<CatalogView> {
    const activeOnly = includeInactive ? {} : { isActive: true }
    const [categories, services, specialists] = await Promise.all([
      this.categories.find({ where: { businessId }, order: { position: 'ASC' } }),
      this.services.find({ where: { businessId, ...activeOnly }, order: { position: 'ASC' } }),
      this.specialists.find({
        where: { businessId, ...activeOnly },
        relations: { services: true },
        order: { position: 'ASC' },
      }),
    ])
    const visibleServiceIds = new Set(services.map((service) => service.id))

    return {
      categories: categories.map(({ id, name }) => ({ id, name })),
      services: services.map(
        ({
          id,
          categoryId,
          name,
          description,
          durationMinutes,
          price,
          deposit,
          rebookDays,
          isPopular,
          isActive,
        }) => ({
          id,
          categoryId,
          name,
          description,
          durationMinutes,
          price,
          deposit,
          rebookDays,
          isPopular,
          ...(includeInactive ? { isActive } : {}),
        }),
      ),
      specialists: specialists.map(
        ({
          id,
          name,
          role,
          rating,
          photoUrl,
          branchId,
          isActive,
          phone,
          commissionPercent,
          services: offered = [],
        }) => ({
          id,
          name,
          role,
          rating,
          photoUrl,
          branchId,
          serviceIds: offered
            .map((service) => service.id)
            .filter((serviceId) => visibleServiceIds.has(serviceId)),
          // Only the cabinet sees how a master signs in.
          ...(includeInactive ? { isActive, phone: phone ?? '', commissionPercent } : {}),
        }),
      ),
    }
  }

  async getActiveService(id: string) {
    const service = await this.services.findOneBy({ id, isActive: true })
    if (!service) throw new NotFoundException('Услуга не найдена')

    return service
  }

  async getSpecialistsForService(serviceId: string) {
    return this.specialists
      .createQueryBuilder('specialist')
      .innerJoin('specialist.services', 'service', 'service.id = :serviceId', { serviceId })
      .where('specialist.isActive = true')
      .orderBy('specialist.position', 'ASC')
      .getMany()
  }

  async listActiveSpecialists(businessId: string) {
    return this.specialists.find({
      where: { businessId, isActive: true },
      order: { position: 'ASC' },
    })
  }

  async specialistBelongsTo(specialistId: string, businessId: string) {
    return this.specialists.existsBy({ id: specialistId, businessId })
  }

  async createCategory(businessId: string, input: CategoryInput) {
    const position = (await this.categories.countBy({ businessId })) + 1

    return this.categories.save(
      this.categories.create({ id: randomUUID(), businessId, name: input.name, position }),
    )
  }

  async updateCategory(businessId: string, id: string, input: CategoryInput) {
    await this.findOwned(this.categories, businessId, id, 'Категория не найдена')
    await this.categories.update({ id, businessId }, { name: input.name })
  }

  async deleteCategory(businessId: string, id: string) {
    await this.findOwned(this.categories, businessId, id, 'Категория не найдена')
    if (await this.services.existsBy({ categoryId: id })) {
      throw new ConflictException('Сначала перенесите или удалите услуги из этой категории')
    }
    await this.categories.delete({ id, businessId })
  }

  async createService(businessId: string, input: ServiceInput) {
    await this.findOwned(this.categories, businessId, input.categoryId, 'Категория не найдена')
    const position = (await this.services.countBy({ businessId })) + 1
    const service = await this.services.save(
      this.services.create({ id: randomUUID(), businessId, position, ...input }),
    )
    // A first service is useless without someone to perform it: give it to every active master.
    const specialists = await this.listActiveSpecialists(businessId)
    if (specialists.length > 0) {
      await this.specialists
        .createQueryBuilder()
        .relation(Specialist, 'services')
        .of(specialists)
        .add(service.id)
    }

    return service
  }

  async updateService(businessId: string, id: string, input: ServiceInput) {
    await this.findOwned(this.services, businessId, id, 'Услуга не найдена')
    await this.findOwned(this.categories, businessId, input.categoryId, 'Категория не найдена')
    await this.services.update({ id, businessId }, input)
  }

  async saveSpecialist(businessId: string, input: SpecialistInput, id?: string) {
    const services = await this.services.findBy({ businessId, id: In(input.serviceIds) })
    if (services.length !== new Set(input.serviceIds).size) {
      throw new BadRequestException('Услуга не найдена')
    }

    const existing = id
      ? await this.findOwned(this.specialists, businessId, id, 'Мастер не найден')
      : this.specialists.create({
          id: randomUUID(),
          businessId,
          rating: null,
          position: (await this.specialists.countBy({ businessId })) + 1,
        })

    if (input.phone && !normalizePhone(input.phone)) {
      throw new BadRequestException('Проверьте номер мастера')
    }
    if (input.branchId) {
      const [branch] = (await this.specialists.manager.query(
        'SELECT 1 FROM "branches" WHERE "id" = $1 AND "business_id" = $2',
        [input.branchId, businessId],
      )) as unknown[]
      if (!branch) throw new BadRequestException('Филиал не найден')
    }

    const previousPhone = existing.phone ?? null
    const saved = await this.specialists.save({
      ...existing,
      name: input.name,
      role: input.role,
      isActive: input.isActive,
      branchId: input.branchId,
      phone: input.phone ? normalizePhone(input.phone) : null,
      commissionPercent: input.commissionPercent,
      services,
    })

    // A number given now (or changed) means the master has not heard about «Мой день» yet.
    return { ...saved, isNewLogin: Boolean(saved.phone) && saved.phone !== previousPhone }
  }

  private async findOwned<Entity extends { id: string; businessId: string }>(
    repository: Repository<Entity>,
    businessId: string,
    id: string,
    message: string,
  ) {
    const entity = await repository.findOneBy({ id, businessId } as never)
    if (!entity) throw new NotFoundException(message)

    return entity
  }
}

export type { CatalogView }
