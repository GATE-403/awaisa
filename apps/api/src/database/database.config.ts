import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js'

export const getDatabaseOptions = (
  url: string,
  isProduction: boolean,
): PostgresDataSourceOptions => ({
  type: 'postgres',
  url,
  entities: [`${import.meta.dirname}/../**/*.entity.js`],
  migrations: [`${import.meta.dirname}/migrations/*.js`],
  synchronize: false,
  logging: isProduction ? ['error'] : ['error', 'warn'],
})
