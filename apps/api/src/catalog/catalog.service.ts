import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Category } from './category.entity.js'
import { Service } from './service.entity.js'
import { Specialist } from './specialist.entity.js'

type CatalogView = {
  categories: Pick<Category, 'id' | 'name'>[]
  services: Pick<
    Service,
    'id' | 'categoryId' | 'name' | 'description' | 'durationMinutes' | 'price' | 'isPopular'
  >[]
  specialists: (Pick<Specialist, 'id' | 'name' | 'role' | 'rating'> & { serviceIds: string[] })[]
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Service) private readonly services: Repository<Service>,
    @InjectRepository(Specialist) private readonly specialists: Repository<Specialist>,
  ) {}

  async getCatalog(): Promise<CatalogView> {
    const [categories, services, specialists] = await Promise.all([
      this.categories.find({ order: { position: 'ASC' } }),
      this.services.find({ where: { isActive: true }, order: { position: 'ASC' } }),
      this.specialists.find({
        where: { isActive: true },
        relations: { services: true },
        order: { position: 'ASC' },
      }),
    ])
    const activeServiceIds = new Set(services.map((service) => service.id))

    return {
      categories: categories.map(({ id, name }) => ({ id, name })),
      services: services.map(
        ({ id, categoryId, name, description, durationMinutes, price, isPopular }) => ({
          id,
          categoryId,
          name,
          description,
          durationMinutes,
          price,
          isPopular,
        }),
      ),
      specialists: specialists.map(({ id, name, role, rating, services: offered = [] }) => ({
        id,
        name,
        role,
        rating,
        serviceIds: offered
          .map((service) => service.id)
          .filter((serviceId) => activeServiceIds.has(serviceId)),
      })),
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
}

export type { CatalogView }
