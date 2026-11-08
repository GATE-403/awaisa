import type { MigrationInterface, QueryRunner } from 'typeorm'

const CATEGORIES = [
  ['hair', 'Волосы', 1],
  ['color', 'Окрашивание', 2],
  ['nails', 'Ногти', 3],
  ['care', 'Уход', 4],
] as const

const SERVICES = [
  [
    'haircut-women',
    'hair',
    'Женская стрижка',
    'Консультация, мытьё, стрижка и укладка',
    60,
    1500,
    true,
    1,
  ],
  [
    'haircut-men',
    'hair',
    'Мужская стрижка',
    'Стрижка машинкой и ножницами, укладка',
    45,
    900,
    true,
    2,
  ],
  ['styling', 'hair', 'Укладка', 'Брашинг или локоны на любую длину', 40, 1000, false, 3],
  [
    'color-roots',
    'color',
    'Окрашивание корней',
    'До 3 см, профессиональные красители',
    90,
    2500,
    false,
    4,
  ],
  [
    'color-airtouch',
    'color',
    'Airtouch',
    'Мягкое осветление с естественным переходом',
    240,
    9000,
    true,
    5,
  ],
  ['manicure', 'nails', 'Маникюр с покрытием', 'Аппаратный маникюр и гель-лак', 90, 1800, true, 6],
  ['pedicure', 'nails', 'Педикюр', 'Аппаратный педикюр без покрытия', 75, 2000, false, 7],
  [
    'care-keratin',
    'care',
    'Кератиновое восстановление',
    'Глубокое восстановление и блеск',
    120,
    4500,
    false,
    8,
  ],
] as const

const SPECIALISTS = [
  ['aigerim', 'Айгерим Садыкова', 'Топ-стилист', 5.0, 1],
  ['timur', 'Тимур Абдыкадыров', 'Барбер', 4.9, 2],
  ['elena', 'Елена Ким', 'Колорист', 4.8, 3],
  ['nurai', 'Нурай Токтосунова', 'Мастер ногтевого сервиса', 4.9, 4],
] as const

const SPECIALIST_SERVICES: Record<string, string[]> = {
  aigerim: ['haircut-women', 'styling', 'color-roots', 'color-airtouch', 'care-keratin'],
  timur: ['haircut-men', 'styling'],
  elena: ['color-roots', 'color-airtouch', 'care-keratin', 'haircut-women'],
  nurai: ['manicure', 'pedicure'],
}

export class SeedCatalog1794200000001 implements MigrationInterface {
  name = 'SeedCatalog1794200000001'

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [id, name, position] of CATEGORIES) {
      await queryRunner.query(
        'INSERT INTO "categories" ("id", "name", "position") VALUES ($1, $2, $3)',
        [id, name, position],
      )
    }

    for (const service of SERVICES) {
      await queryRunner.query(
        `INSERT INTO "services"
          ("id", "category_id", "name", "description", "duration_minutes", "price", "is_popular", "position")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [...service],
      )
    }

    for (const specialist of SPECIALISTS) {
      await queryRunner.query(
        'INSERT INTO "specialists" ("id", "name", "role", "rating", "position") VALUES ($1, $2, $3, $4, $5)',
        [...specialist],
      )
    }

    for (const [specialistId, serviceIds] of Object.entries(SPECIALIST_SERVICES)) {
      for (const serviceId of serviceIds) {
        await queryRunner.query(
          'INSERT INTO "specialist_services" ("specialist_id", "service_id") VALUES ($1, $2)',
          [specialistId, serviceId],
        )
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM "specialist_services"')
    await queryRunner.query('DELETE FROM "specialists"')
    await queryRunner.query('DELETE FROM "services"')
    await queryRunner.query('DELETE FROM "categories"')
  }
}
