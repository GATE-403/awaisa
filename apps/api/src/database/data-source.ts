import 'reflect-metadata'
import { existsSync } from 'node:fs'
import { DataSource } from 'typeorm'
import { validateEnv } from '../config/env.js'
import { getDatabaseOptions } from './database.config.js'

const ROOT_ENV_FILE = `${import.meta.dirname}/../../../../.env`

if (existsSync(ROOT_ENV_FILE)) process.loadEnvFile(ROOT_ENV_FILE)

const env = validateEnv(process.env)

export const dataSource = new DataSource(
  getDatabaseOptions(env.DATABASE_URL, env.NODE_ENV === 'production'),
)
