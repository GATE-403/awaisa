import { normalizePhone } from '../common/phone.js'

type Env = {
  NODE_ENV: 'development' | 'production' | 'test'
  API_PORT: number
  DATABASE_URL: string
  WEB_ORIGIN: string[]
  RATE_LIMIT_PER_MINUTE: number
  BOOKING_RATE_LIMIT_PER_MINUTE: number
  AUTH_RATE_LIMIT_PER_MINUTE: number
  PUBLIC_WEB_URL: string
  AUTH_SECRET: string
  ADMIN_PHONES: string[]
  SMS_DRIVER: SmsDriver
  TWILIO_ACCOUNT_SID?: string
  TWILIO_AUTH_TOKEN?: string
  TWILIO_FROM?: string
  TWILIO_MESSAGING_SERVICE_SID?: string
  OTP_TEST_CODE?: string
  TELEGRAM_GATEWAY_TOKEN?: string
}

type SmsDriver = 'console' | 'twilio'

const DEV_AUTH_SECRET = 'dev-only-secret-change-me-in-production-0000'
const MIN_SECRET_LENGTH = 32

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

const parsePositiveInt = (name: string, value: unknown, fallback: number): number => {
  const parsed = Number(value ?? fallback)
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`${name} must be a positive integer`)

  return parsed
}

const parseOrigins = (value: unknown): string[] =>
  String(value ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const optionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined

const parseAuthSecret = (value: unknown, nodeEnv: Env['NODE_ENV']) => {
  const secret = optionalString(value)
  if (secret && secret.length >= MIN_SECRET_LENGTH) return secret
  if (nodeEnv !== 'production' && !secret) return DEV_AUTH_SECRET

  throw new Error(`AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters`)
}

const parseAdminPhones = (value: unknown) =>
  String(value ?? '')
    .split(',')
    .map((phone) => normalizePhone(phone))
    .filter((phone): phone is string => phone !== null)

const parseSmsDriver = (config: Record<string, unknown>): SmsDriver => {
  const driver = optionalString(config.SMS_DRIVER)
  if (driver === 'console' || driver === 'twilio') return driver
  if (driver) throw new Error('SMS_DRIVER must be console or twilio')

  return optionalString(config.TWILIO_ACCOUNT_SID) ? 'twilio' : 'console'
}

const parseTwilio = (config: Record<string, unknown>, driver: SmsDriver) => {
  const twilio = {
    TWILIO_ACCOUNT_SID: optionalString(config.TWILIO_ACCOUNT_SID),
    TWILIO_AUTH_TOKEN: optionalString(config.TWILIO_AUTH_TOKEN),
    TWILIO_FROM: optionalString(config.TWILIO_FROM),
    TWILIO_MESSAGING_SERVICE_SID: optionalString(config.TWILIO_MESSAGING_SERVICE_SID),
  }
  const hasSender = twilio.TWILIO_FROM || twilio.TWILIO_MESSAGING_SERVICE_SID
  if (
    driver === 'twilio' &&
    !(twilio.TWILIO_ACCOUNT_SID && twilio.TWILIO_AUTH_TOKEN && hasSender)
  ) {
    throw new Error(
      'SMS_DRIVER=twilio needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID',
    )
  }

  return twilio
}

const parseTestCode = (value: unknown, nodeEnv: Env['NODE_ENV']) => {
  const code = optionalString(value)
  if (!code) return undefined
  if (nodeEnv === 'production') throw new Error('OTP_TEST_CODE must not be set in production')
  if (!/^\d{6}$/.test(code)) throw new Error('OTP_TEST_CODE must be 6 digits')

  return code
}

const validateEnv = (config: Record<string, unknown>): Env => {
  const nodeEnv = parseNodeEnv(config.NODE_ENV)
  const webOrigins = parseOrigins(config.WEB_ORIGIN)
  const smsDriver = parseSmsDriver(config)

  return {
    NODE_ENV: nodeEnv,
    API_PORT: parsePort(config.API_PORT ?? config.PORT),
    DATABASE_URL: parseDatabaseUrl(config.DATABASE_URL),
    WEB_ORIGIN: webOrigins,
    RATE_LIMIT_PER_MINUTE: parsePositiveInt(
      'RATE_LIMIT_PER_MINUTE',
      config.RATE_LIMIT_PER_MINUTE,
      120,
    ),
    BOOKING_RATE_LIMIT_PER_MINUTE: parsePositiveInt(
      'BOOKING_RATE_LIMIT_PER_MINUTE',
      config.BOOKING_RATE_LIMIT_PER_MINUTE,
      5,
    ),
    AUTH_RATE_LIMIT_PER_MINUTE: parsePositiveInt(
      'AUTH_RATE_LIMIT_PER_MINUTE',
      config.AUTH_RATE_LIMIT_PER_MINUTE,
      5,
    ),
    PUBLIC_WEB_URL: (optionalString(config.PUBLIC_WEB_URL) ?? webOrigins[0] ?? '').replace(
      /\/$/,
      '',
    ),
    AUTH_SECRET: parseAuthSecret(config.AUTH_SECRET, nodeEnv),
    ADMIN_PHONES: parseAdminPhones(config.ADMIN_PHONES),
    SMS_DRIVER: smsDriver,
    ...parseTwilio(config, smsDriver),
    OTP_TEST_CODE: parseTestCode(config.OTP_TEST_CODE, nodeEnv),
    TELEGRAM_GATEWAY_TOKEN: optionalString(config.TELEGRAM_GATEWAY_TOKEN),
  }
}

export type { Env, SmsDriver }
export { validateEnv }
