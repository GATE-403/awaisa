import { type BusinessWeek, businessWeekText } from './business-digest.js'

const WEEK: BusinessWeek = {
  business: 'Beard & Co',
  revenue: 72400,
  previousRevenue: 80000,
  visits: 93,
  bestMaster: { name: 'Daniyar', revenue: 21300 },
  noShows: { count: 4, amount: 3600 },
  unmarked: 7,
  analyticsUrl: 'https://awaisa.kg/manage/boroda?tab=analytics',
}

describe('weekly business digest', () => {
  it('sums the week up: money with its change, visits, the best master, losses, what waits', () => {
    expect(businessWeekText(WEEK)).toBe(
      [
        '📈 <b>Week · Beard &amp; Co</b>',
        'Revenue 72,400 som (▼ −9% on last week)',
        '93 visits',
        'Top earner: Daniyar, 21,300 som',
        'No-shows: 4, missed 3,600 som',
        '⚠️ Not marked: 7 visits',
        '<a href="https://awaisa.kg/manage/boroda?tab=analytics">Analytics</a>',
      ].join('\n'),
    )
  })

  it('says nothing for an empty week with nothing waiting', () => {
    expect(businessWeekText({ ...WEEK, visits: 0, unmarked: 0 })).toBeNull()
  })

  it('leaves out what did not happen and a change it cannot count', () => {
    const text = businessWeekText({
      ...WEEK,
      previousRevenue: 0,
      bestMaster: null,
      noShows: { count: 0, amount: 0 },
      unmarked: 0,
    })
    expect(text).toContain('Revenue 72,400 som\n')
    expect(text).not.toContain('Top earner')
    expect(text).not.toContain('No-shows')
    expect(text).not.toContain('Not marked')
  })

  it('reads a rise and a flat week', () => {
    expect(businessWeekText({ ...WEEK, previousRevenue: 60000 })).toContain('(▲ +21% on last week)')
    expect(businessWeekText({ ...WEEK, previousRevenue: 72400 })).toContain('(same as last week)')
  })
})
