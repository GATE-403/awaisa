import { describe, expect, it } from 'vitest'
import { parseProcessRole, runsJobs, servesHttp } from './process-role.js'

describe('parseProcessRole', () => {
  it('defaults to a process that does everything', () => {
    expect(parseProcessRole(undefined)).toBe('all')
    expect(parseProcessRole('')).toBe('all')
  })

  it('refuses unknown roles', () => {
    expect(() => parseProcessRole('cron')).toThrow('PROCESS_ROLE')
  })

  it('splits HTTP and jobs between api and worker', () => {
    expect([runsJobs('all'), servesHttp('all')]).toEqual([true, true])
    expect([runsJobs('api'), servesHttp('api')]).toEqual([false, true])
    expect([runsJobs('worker'), servesHttp('worker')]).toEqual([true, false])
  })
})
