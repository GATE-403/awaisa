type Env = {
  NODE_ENV: 'development' | 'production' | 'test'
  API_PORT: number
  DATABASE_URL: string
  WEB_ORIGIN: string[]
}

const NODE_ENVS: Env['NODE_ENV'][] = ['development', 'production', 'test']

const parseNodeEnv = (value: unknown): Env['NODE_ENV'] => {
  if (value === undefined) return 'development'
  if (NODE_ENVS.includes(value as Env['NODE_ENV'])) return value as Env['NODE_ENV']

  throw new Error(`NODE_ENV must be one of: ${NODE_ENVS.join(', ')}`)
}

const parsePort = (value: unknown): number => {
  const port = Number(value ?? 4000)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('API_PORT must be a valid port number')
  }

  return port
}

const parseDatabaseUrl = (value: unknown): string => {
  if (typeof value !== 'string' || !value.startsWith('postgres')) {
    throw new Error('DATABASE_URL must be a postgres:// connection string')
  }

  return value
}

const parseOrigins = (value: unknown): string[] =>
  String(value ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const validateEnv = (config: Record<string, unknown>): Env => ({
  NODE_ENV: parseNodeEnv(config.NODE_ENV),
  API_PORT: parsePort(config.API_PORT ?? config.PORT),
  DATABASE_URL: parseDatabaseUrl(config.DATABASE_URL),
  WEB_ORIGIN: parseOrigins(config.WEB_ORIGIN),
})

export type { Env }
export { validateEnv }
