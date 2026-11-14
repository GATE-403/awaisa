import { EventEmitter } from 'node:events'

type JobFailure = { message: string; stack: string }

// A failed @Cron job is only logged by @nestjs/schedule (context «Scheduler»); the logger hands
// it here so the alerts service can record and report it like any other server error.
const failures = new EventEmitter()

const reportJobFailure = (failure: JobFailure) => failures.emit('failure', failure)

const onJobFailure = (listener: (failure: JobFailure) => void) => {
  failures.on('failure', listener)
  return () => failures.off('failure', listener)
}

export type { JobFailure }
export { onJobFailure, reportJobFailure }
