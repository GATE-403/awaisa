import { existsSync } from 'node:fs'

// The root .env for settings read before Nest starts (PROCESS_ROLE, SENTRY_DSN). Like
// ConfigModule, it never overrides what the process environment already has.
const loadRootEnv = () => {
  const file = `${import.meta.dirname}/../../../../.env`
  if (existsSync(file)) process.loadEnvFile(file)
}

export { loadRootEnv }
