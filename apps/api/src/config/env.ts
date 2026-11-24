import { loadRegionFile } from '@awaisa/region/node'
import { normalizePhone } from '../common/phone.js'
import { ALGORITHM, ALGORITHMS, type Algorithm } from '../recommendations/recommend-score.js'
import { type ProcessRole, parseProcessRole } from '../runtime/process-role.js'

type Env = {
  NODE_ENV: 'development' | 'production' | 'test'
  /** The installation's `region.json` (its country and city); found above the working folder by default. */
  REGION_FILE?: string
  PROCESS_ROLE: ProcessRole
  API_PORT: number
  DATABASE_URL: string
  DATABASE_POOL_SIZE: number
  DATABASE_STATEMENT_TIMEOUT_MS: number
  WEB_ORIGIN: string[]
  /** Express `trust proxy`: which hops may say who the client is (rate limits count by that IP). */
  TRUST_PROXY: string | number
  RATE_LIMIT_PER_MINUTE: number
  BOOKING_RATE_LIMIT_PER_MINUTE: number
  AUTH_RATE_LIMIT_PER_MINUTE: number
  PUBLIC_WEB_URL: string
  AUTH_SECRET: string
  ADMIN_PHONES: string[]
  SMS_DRIVER: SmsDriver
  SMS_ALLOWED_COUNTRY_CODES: string[]
  TWILIO_ACCOUNT_SID?: string
  TWILIO_AUTH_TOKEN?: string
  TWILIO_FROM?: string
  TWILIO_MESSAGING_SERVICE_SID?: string
  OTP_TEST_CODE?: string
  WHATSAPP_DRIVER: WhatsappDriver
  WHATSAPP_TOKEN?: string
  WHATSAPP_PHONE_NUMBER_ID?: string
  WHATSAPP_API_VERSION: string
  WHATSAPP_LANGUAGE: string
  WHATSAPP_VERIFY_TOKEN?: string
  WHATSAPP_APP_SECRET?: string
  TELEGRAM_GATEWAY_TOKEN?: string
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_BOT_USERNAME?: string
  TELEGRAM_WEBHOOK_SECRET?: string
  TELEGRAM_WEBHOOK_URL?: string
  ALERT_TELEGRAM_CHAT_ID?: string
  STORAGE_DRIVER: StorageDriver
  UPLOAD_DIR: string
  S3_BUCKET?: string
  S3_ENDPOINT?: string
  S3_REGION: string
  S3_ACCESS_KEY_ID?: string
  S3_SECRET_ACCESS_KEY?: string
  S3_PUBLIC_URL?: string
  WALLET_PASS_TYPE_ID?: string
  WALLET_TEAM_ID?: string
  WALLET_CERT_PEM?: string
  WALLET_KEY_PEM?: string
  WALLET_KEY_PASSPHRASE?: string
  WALLET_WWDR_PEM?: string
  GOOGLE_WALLET_ISSUER_ID?: string
  GOOGLE_WALLET_SERVICE_ACCOUNT?: string
  /** Web Push (VAPID) for owners and masters; without the pair the feature is hidden. */
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
  /** Who push services may contact: `mailto:` or an https address; the site's address by default. */
  VAPID_SUBJECT?: string
  /** Expo push service access token (enhanced push security); without it app pushes are only logged. */
  EXPO_ACCESS_TOKEN?: string
  PAYMENT_DRIVER: PaymentDriver
  FREEDOMPAY_MERCHANT_ID?: string
  FREEDOMPAY_SECRET_KEY?: string
  FREEDOMPAY_API_URL: string
  FREEDOMPAY_CURRENCY: string
  FREEDOMPAY_TESTING_MODE: boolean
  FISCAL_DRIVER: FiscalDriver
  /** eKassa's API address (the test server until the business goes live). */
  EKASSA_API_URL: string
  /** Addresses and map points for branches: Photon (OpenStreetMap) or off. */
  GEOCODER: 'photon' | 'off'
  PHOTON_URL: string
  /** Team-draft interleaving of «Для вас» with another scorer; null = off (docs/recsys/experiments.md). */
  RECS_INTERLEAVE: { algorithm: Algorithm; percent: number } | null
}

type StorageDriver = 'local' | 's3'

type SmsDriver = 'console' | 'twilio'

// Client messages in WhatsApp: `meta` sends templates through the Cloud API, `log` only writes
// them to the log (the default outside production), `off` leaves those messages to SMS.
type WhatsappDriver = 'meta' | 'log' | 'off'

// Prepayments: `test` is a built-in checkout for development and e2e; `none` turns deposits off;
// `freedompay` takes real cards through Freedom Pay (Kyrgyzstan).
type PaymentDriver = 'none' | 'test' | 'freedompay'

// Fiscal receipts: `log` numbers them itself and writes them to the log (the default outside
// production), `off` issues none (the default in production), `ekassa` sends them to eKassa.
type FiscalDriver = 'log' | 'off' | 'ekassa'

const DEV_AUTH_SECRET = 'dev-only-secret-change-me-in-production-0000'
const MIN_SECRET_LENGTH = 32

const NODE_ENVS: Env['NODE_ENV'][] = ['development', 'production', 'test']

// Production needs the installation's own region.json; development and tests may use the
// repository's region.example.json.
const parseRegionFile = (value: unknown, nodeEnv: Env['NODE_ENV']) =>
  loadRegionFile({
    file: optionalString(value),
    from: process.cwd(),
    allowExample: nodeEnv !== 'production',
  }).file

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

const DEFAULT_TRUST_PROXY = 'loopback, linklocal, uniquelocal'
const TRUST_PROXY_NAMES = ['loopback', 'linklocal', 'uniquelocal']

// Only proxies on our own network are trusted by default: behind a public one (Cloudflare) every
// request would look like the proxy's own address and share one rate limit. Set a hop count
// (`2`: Cloudflare, then the web server) or the proxies' names and CIDRs.
const parseTrustProxy = (value: unknown): string | number => {
  const raw = optionalString(value)
  if (!raw) return DEFAULT_TRUST_PROXY
  if (/^\d+$/.test(raw)) {
    const hops = Number(raw)
    if (hops < 1 || hops > 10) throw new Error('TRUST_PROXY hop count must be 1–10')
    return hops
  }
  const parts = raw.split(',').map((part) => part.trim())
  const isValid = (part: string) =>
    TRUST_PROXY_NAMES.includes(part) || /^[\d.:a-fA-F]+(\/\d{1,3})?$/.test(part)
  const invalid = parts.find((part) => !isValid(part))
  if (invalid !== undefined) {
    throw new Error(
      `TRUST_PROXY must be a hop count or ${TRUST_PROXY_NAMES.join(', ')} and IP/CIDR ranges (got «${invalid}»)`,
    )
  }
  return parts.join(', ')
}

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

const parseCountryCodes = (value: unknown) => {
  const codes = (optionalString(value) ?? '996')
    .split(',')
    .map((code) => code.trim().replace(/^\+/, ''))
  const invalid = codes.find((code) => code !== '*' && !/^\d{1,4}$/.test(code))
  if (invalid !== undefined) {
    throw new Error('SMS_ALLOWED_COUNTRY_CODES must be calling codes like 996,7 (or *)')
  }

  return codes
}

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

const parseWhatsapp = (config: Record<string, unknown>, nodeEnv: Env['NODE_ENV']) => {
  const whatsapp = {
    WHATSAPP_TOKEN: optionalString(config.WHATSAPP_TOKEN),
    WHATSAPP_PHONE_NUMBER_ID: optionalString(config.WHATSAPP_PHONE_NUMBER_ID),
    WHATSAPP_API_VERSION: optionalString(config.WHATSAPP_API_VERSION) ?? 'v23.0',
    WHATSAPP_LANGUAGE: optionalString(config.WHATSAPP_LANGUAGE) ?? 'ru',
    WHATSAPP_VERIFY_TOKEN: optionalString(config.WHATSAPP_VERIFY_TOKEN),
    WHATSAPP_APP_SECRET: optionalString(config.WHATSAPP_APP_SECRET),
  }
  const requested = optionalString(config.WHATSAPP_DRIVER)
  if (requested && requested !== 'meta' && requested !== 'log' && requested !== 'off') {
    throw new Error('WHATSAPP_DRIVER must be meta, log or off')
  }
  const hasCredentials = whatsapp.WHATSAPP_TOKEN && whatsapp.WHATSAPP_PHONE_NUMBER_ID
  const driver: WhatsappDriver =
    (requested as WhatsappDriver | undefined) ??
    (hasCredentials ? 'meta' : nodeEnv === 'production' ? 'off' : 'log')
  if (driver === 'meta' && !hasCredentials) {
    throw new Error('WHATSAPP_DRIVER=meta needs WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID')
  }
  if (!/^v\d+\.\d+$/.test(whatsapp.WHATSAPP_API_VERSION)) {
    throw new Error('WHATSAPP_API_VERSION must look like v23.0')
  }

  return { WHATSAPP_DRIVER: driver, ...whatsapp }
}

const parsePaymentDriver = (
  config: Record<string, unknown>,
  nodeEnv: Env['NODE_ENV'],
): PaymentDriver => {
  const driver = optionalString(config.PAYMENT_DRIVER)
  if (!driver) return nodeEnv === 'production' ? 'none' : 'test'
  if (driver !== 'none' && driver !== 'test' && driver !== 'freedompay') {
    throw new Error('PAYMENT_DRIVER must be none, test or freedompay')
  }
  if (
    driver === 'freedompay' &&
    !(optionalString(config.FREEDOMPAY_MERCHANT_ID) && optionalString(config.FREEDOMPAY_SECRET_KEY))
  ) {
    throw new Error(
      'PAYMENT_DRIVER=freedompay needs FREEDOMPAY_MERCHANT_ID and FREEDOMPAY_SECRET_KEY',
    )
  }
  if (driver === 'test' && nodeEnv === 'production') {
    throw new Error('PAYMENT_DRIVER=test must not be used in production')
  }

  return driver
}

const parseFiscalDriver = (value: unknown, nodeEnv: Env['NODE_ENV']): FiscalDriver => {
  const driver = optionalString(value)
  if (!driver) return nodeEnv === 'production' ? 'off' : 'log'
  if (driver !== 'log' && driver !== 'off' && driver !== 'ekassa') {
    throw new Error('FISCAL_DRIVER must be log, off or ekassa')
  }
  if (driver === 'log' && nodeEnv === 'production') {
    throw new Error('FISCAL_DRIVER=log must not be used in production')
  }

  return driver
}

const parseTestCode = (value: unknown, nodeEnv: Env['NODE_ENV']) => {
  const code = optionalString(value)
  if (!code) return undefined
  if (nodeEnv === 'production') throw new Error('OTP_TEST_CODE must not be set in production')
  if (!/^\d{6}$/.test(code)) throw new Error('OTP_TEST_CODE must be 6 digits')

  return code
}

// Photos go to S3-compatible storage (Cloudflare R2, AWS S3) when configured, otherwise to disk.
const parseStorage = (config: Record<string, unknown>) => {
  const s3 = {
    S3_BUCKET: optionalString(config.S3_BUCKET),
    S3_ENDPOINT: optionalString(config.S3_ENDPOINT),
    S3_REGION: optionalString(config.S3_REGION) ?? 'auto',
    S3_ACCESS_KEY_ID: optionalString(config.S3_ACCESS_KEY_ID),
    S3_SECRET_ACCESS_KEY: optionalString(config.S3_SECRET_ACCESS_KEY),
    S3_PUBLIC_URL: optionalString(config.S3_PUBLIC_URL)?.replace(/\/$/, ''),
  }
  const requested = optionalString(config.STORAGE_DRIVER)
  if (requested && requested !== 'local' && requested !== 's3') {
    throw new Error('STORAGE_DRIVER must be local or s3')
  }
  const driver: StorageDriver =
    (requested as StorageDriver | undefined) ?? (s3.S3_BUCKET ? 's3' : 'local')
  if (
    driver === 's3' &&
    !(s3.S3_BUCKET && s3.S3_ACCESS_KEY_ID && s3.S3_SECRET_ACCESS_KEY && s3.S3_PUBLIC_URL)
  ) {
    throw new Error(
      'STORAGE_DRIVER=s3 needs S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_PUBLIC_URL',
    )
  }

  return {
    STORAGE_DRIVER: driver,
    UPLOAD_DIR: optionalString(config.UPLOAD_DIR) ?? 'uploads',
    ...s3,
  }
}

// PEM and JSON secrets may be given as-is (with \\n escapes) or base64-encoded, whichever fits the host.
const decodeSecret = (value: unknown) => {
  const raw = optionalString(value)
  if (!raw) return undefined
  if (raw.startsWith('{')) return raw
  if (raw.includes('-----BEGIN')) return raw.replace(/\\n/g, '\n')

  return Buffer.from(raw, 'base64').toString('utf8')
}

const parseWallet = (config: Record<string, unknown>) => ({
  WALLET_PASS_TYPE_ID: optionalString(config.WALLET_PASS_TYPE_ID),
  WALLET_TEAM_ID: optionalString(config.WALLET_TEAM_ID),
  WALLET_CERT_PEM: decodeSecret(config.WALLET_CERT_PEM),
  WALLET_KEY_PEM: decodeSecret(config.WALLET_KEY_PEM),
  WALLET_KEY_PASSPHRASE: optionalString(config.WALLET_KEY_PASSPHRASE),
  WALLET_WWDR_PEM: decodeSecret(config.WALLET_WWDR_PEM),
  GOOGLE_WALLET_ISSUER_ID: optionalString(config.GOOGLE_WALLET_ISSUER_ID),
  GOOGLE_WALLET_SERVICE_ACCOUNT: decodeSecret(config.GOOGLE_WALLET_SERVICE_ACCOUNT),
})

// Both keys or neither: half a pair would only fail on the first push.
const parseVapid = (config: Record<string, unknown>, publicWebUrl: string) => {
  const publicKey = optionalString(config.VAPID_PUBLIC_KEY)
  const privateKey = optionalString(config.VAPID_PRIVATE_KEY)
  if (Boolean(publicKey) !== Boolean(privateKey)) {
    throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY go together')
  }
  const subject = optionalString(config.VAPID_SUBJECT) ?? (publicKey ? publicWebUrl : undefined)
  if (subject && !/^(mailto:|https?:\/\/)/.test(subject)) {
    throw new Error('VAPID_SUBJECT must be a mailto: or https:// address')
  }

  return { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject }
}

// Split processes must share Redis: the worker's writes (released payment holds, waitlist) bump
// cache tags the api instances have to see, and rate limits must count across every instance.
const parseRole = (config: Record<string, unknown>) => {
  const role = parseProcessRole(optionalString(config.PROCESS_ROLE))
  if (role !== 'all' && !optionalString(config.REDIS_URL)) {
    throw new Error(`PROCESS_ROLE=${role} needs REDIS_URL`)
  }

  return role
}

// `RECS_INTERLEAVE=score-v1:50` mixes score-v1 into the shelves of half the devices (by a hash of
// the device session); empty or `off` serves the current scorer alone.
const parseInterleave = (value: unknown): Env['RECS_INTERLEAVE'] => {
  const raw = optionalString(value)
  if (!raw || raw === 'off') return null
  const [algorithm, percentText] = raw.split(':')
  const percent = percentText === undefined ? 100 : Number(percentText)
  if (!ALGORITHMS.includes(algorithm as Algorithm) || algorithm === ALGORITHM) {
    throw new Error(
      `RECS_INTERLEAVE must name another scorer (${ALGORITHMS.filter((name) => name !== ALGORITHM).join(', ')}), optionally :percent`,
    )
  }
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
    throw new Error('RECS_INTERLEAVE percent must be 1–100')
  }
  return { algorithm: algorithm as Algorithm, percent }
}

const validateEnv = (config: Record<string, unknown>): Env => {
  const nodeEnv = parseNodeEnv(config.NODE_ENV)
  const webOrigins = parseOrigins(config.WEB_ORIGIN)
  const publicWebUrl = (optionalString(config.PUBLIC_WEB_URL) ?? webOrigins[0] ?? '').replace(
    /\/$/,
    '',
  )
  const smsDriver = parseSmsDriver(config)

  return {
    NODE_ENV: nodeEnv,
    // A missing or wrong region.json stops the start here, not at the first phone number.
    REGION_FILE: parseRegionFile(config.REGION_FILE, nodeEnv),
    PROCESS_ROLE: parseRole(config),
    API_PORT: parsePort(config.API_PORT ?? config.PORT),
    DATABASE_URL: parseDatabaseUrl(config.DATABASE_URL),
    DATABASE_POOL_SIZE: parsePositiveInt(
      'DATABASE_POOL_SIZE',
      optionalString(config.DATABASE_POOL_SIZE),
      10,
    ),
    DATABASE_STATEMENT_TIMEOUT_MS: parsePositiveInt(
      'DATABASE_STATEMENT_TIMEOUT_MS',
      optionalString(config.DATABASE_STATEMENT_TIMEOUT_MS),
      30_000,
    ),
    WEB_ORIGIN: webOrigins,
    TRUST_PROXY: parseTrustProxy(config.TRUST_PROXY),
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
    PUBLIC_WEB_URL: publicWebUrl,
    AUTH_SECRET: parseAuthSecret(config.AUTH_SECRET, nodeEnv),
    ADMIN_PHONES: parseAdminPhones(config.ADMIN_PHONES),
    SMS_DRIVER: smsDriver,
    SMS_ALLOWED_COUNTRY_CODES: parseCountryCodes(config.SMS_ALLOWED_COUNTRY_CODES),
    PAYMENT_DRIVER: parsePaymentDriver(config, nodeEnv),
    FREEDOMPAY_MERCHANT_ID: optionalString(config.FREEDOMPAY_MERCHANT_ID),
    FREEDOMPAY_SECRET_KEY: optionalString(config.FREEDOMPAY_SECRET_KEY),
    FREEDOMPAY_API_URL: optionalString(config.FREEDOMPAY_API_URL) ?? 'https://api.freedompay.kg',
    FREEDOMPAY_CURRENCY: optionalString(config.FREEDOMPAY_CURRENCY) ?? 'KGS',
    // Test payments on Freedom Pay's side (their test cards), still through the real API.
    FREEDOMPAY_TESTING_MODE: optionalString(config.FREEDOMPAY_TESTING_MODE) === 'true',
    FISCAL_DRIVER: parseFiscalDriver(config.FISCAL_DRIVER, nodeEnv),
    EKASSA_API_URL: (optionalString(config.EKASSA_API_URL) ?? 'https://test.ekassa.kg/api').replace(
      /\/$/,
      '',
    ),
    RECS_INTERLEAVE: parseInterleave(config.RECS_INTERLEAVE),
    GEOCODER: optionalString(config.GEOCODER) === 'off' ? 'off' : 'photon',
    PHOTON_URL: (optionalString(config.PHOTON_URL) ?? 'https://photon.komoot.io').replace(
      /\/$/,
      '',
    ),
    ...parseTwilio(config, smsDriver),
    OTP_TEST_CODE: parseTestCode(config.OTP_TEST_CODE, nodeEnv),
    ...parseWhatsapp(config, nodeEnv),
    TELEGRAM_GATEWAY_TOKEN: optionalString(config.TELEGRAM_GATEWAY_TOKEN),
    // The owners' bot (BotFather): a separate token from the Gateway that sends sign-in codes.
    TELEGRAM_BOT_TOKEN: optionalString(config.TELEGRAM_BOT_TOKEN),
    TELEGRAM_BOT_USERNAME: optionalString(config.TELEGRAM_BOT_USERNAME)?.replace(/^@/, ''),
    TELEGRAM_WEBHOOK_SECRET: optionalString(config.TELEGRAM_WEBHOOK_SECRET),
    TELEGRAM_WEBHOOK_URL: optionalString(config.TELEGRAM_WEBHOOK_URL),
    ALERT_TELEGRAM_CHAT_ID: optionalString(config.ALERT_TELEGRAM_CHAT_ID),
    ...parseStorage(config),
    ...parseWallet(config),
    ...parseVapid(config, publicWebUrl),
    EXPO_ACCESS_TOKEN: optionalString(config.EXPO_ACCESS_TOKEN),
  }
}

export type { Env, FiscalDriver, PaymentDriver, SmsDriver, StorageDriver, WhatsappDriver }
export { validateEnv }
