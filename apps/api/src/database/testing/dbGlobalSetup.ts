import 'reflect-metadata'
import { existsSync } from 'node:fs'
import { DataSource } from 'typeorm'
import type { TestProject } from 'vitest/node'

const ROOT_ENV_FILE = `${import.meta.dirname}/../../../../../.env`

declare module 'vitest' {
  export interface ProvidedContext {
    dbUrl: string
  }
}

// The test database sits next to the one in DATABASE_URL, so dev data is never touched.
const toTestUrl = (url: string) => {
  const parsed = new URL(url)
  const name = parsed.pathname.slice(1) || 'awaisa'
  parsed.pathname = `/${name.endsWith('_dbtest') ? name : `${name}_dbtest`}`
  return parsed
}

const setup = async (project: TestProject) => {
  if (existsSync(ROOT_ENV_FILE)) process.loadEnvFile(ROOT_ENV_FILE)
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set: start Postgres with `pnpm db:up`')
  const testUrl = toTestUrl(url)
  const name = testUrl.pathname.slice(1)

  const admin = new DataSource({ type: 'postgres', url })
  await admin.initialize()
  await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
  await admin.query(`CREATE DATABASE "${name}"`)
  await admin.destroy()

  // Node strips the migrations' types itself, so they load from source.
  const db = new DataSource({
    type: 'postgres',
    url: testUrl.toString(),
    migrations: [`${import.meta.dirname}/../migrations/*.ts`],
    logging: ['error'],
  })
  await db.initialize()
  await db.runMigrations()
  await db.destroy()

  project.provide('dbUrl', testUrl.toString())
}

export { setup }
