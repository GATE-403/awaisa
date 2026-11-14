import { Inject, Injectable } from '@nestjs/common'
import { type ProcessRole, runsJobs } from './process-role.js'

const PROCESS_ROLE = Symbol('PROCESS_ROLE')

@Injectable()
export class RuntimeService {
  constructor(@Inject(PROCESS_ROLE) readonly role: ProcessRole) {}

  /** Cron jobs, start-up backfills and the Telegram long-poll belong to this process. */
  get runsJobs() {
    return runsJobs(this.role)
  }
}

export { PROCESS_ROLE }
