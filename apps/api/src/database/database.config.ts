import type { DataSourceOptions } from 'typeorm'

export const getDatabaseOptions = (url: string, isProduction: boolean): DataSourceOptions => ({
  type: 'postgres',
  url,
  entities: [`${import.meta.dirname}/../**/*.entity.js`],
  migrations: [`${import.meta.dirname}/migrations/*.js`],
  synchronize: false,
  logging: isProduction ? ['error'] : ['error', 'warn'],
})
