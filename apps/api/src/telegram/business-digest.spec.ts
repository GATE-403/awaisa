import { type BusinessWeek, businessWeekText } from './business-digest.js'

const WEEK: BusinessWeek = {
  business: 'Борода & Co',
  revenue: 72400,
  previousRevenue: 80000,
  visits: 93,
  bestMaster: { name: 'Данияр', revenue: 21300 },
  noShows: { count: 4, amount: 3600 },
  unmarked: 7,
  analyticsUrl: 'https://awaisa.kg/manage/boroda?tab=analytics',
}

describe('weekly business digest', () => {
  it('sums the week up: money with its change, visits, the best master, losses, what waits', () => {
    expect(businessWeekText(WEEK)).toBe(
      [
        '📈 <b>Неделя · Борода &amp; Co</b>',
        'Выручка 72 400 сом (▼ −9% к прошлой неделе)',
        '93 визита',
        'Больше всех: Данияр, 21 300 сом',
        'Неявки: 4, недополучено 3 600 сом',
        '⚠️ Без отметки: 7 визитов',
        '<a href="https://awaisa.kg/manage/boroda?tab=analytics">Аналитика</a>',
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
    expect(text).toContain('Выручка 72 400 сом\n')
    expect(text).not.toContain('Больше всех')
    expect(text).not.toContain('Неявки')
    expect(text).not.toContain('Без отметки')
  })

  it('reads a rise and a flat week', () => {
    expect(businessWeekText({ ...WEEK, previousRevenue: 60000 })).toContain(
      '(▲ +21% к прошлой неделе)',
    )
    expect(businessWeekText({ ...WEEK, previousRevenue: 72400 })).toContain(
      '(как на прошлой неделе)',
    )
  })
})
