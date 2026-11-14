// One build runs as three kinds of process. `all` (development, a single small server) serves
// HTTP and runs the jobs; in production `api` instances only serve HTTP and can be scaled, while
// exactly one `worker` runs the cron jobs and the Telegram long-poll, so nothing runs twice.
type ProcessRole = 'all' | 'api' | 'worker'

const PROCESS_ROLES: ProcessRole[] = ['all', 'api', 'worker']

const parseProcessRole = (value: unknown): ProcessRole => {
  if (value === undefined || value === '') return 'all'
  if (PROCESS_ROLES.includes(value as ProcessRole)) return value as ProcessRole

  throw new Error(`PROCESS_ROLE must be one of: ${PROCESS_ROLES.join(', ')}`)
}

const runsJobs = (role: ProcessRole) => role !== 'api'

const servesHttp = (role: ProcessRole) => role !== 'worker'

export type { ProcessRole }
export { parseProcessRole, runsJobs, servesHttp }
