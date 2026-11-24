import { type ReviewWeek, reviewDigestText } from './review-digest.js'

const WEEK: ReviewWeek = {
  business: 'Old <School>',
  count: 12,
  average: 4.62,
  previousAverage: 4.4,
  bestMaster: { name: 'Erlan', average: 5, count: 4 },
  poorOpen: 2,
  unanswered: 5,
  cabinetUrl: 'https://awaisa.kg/manage/old-school?tab=reviews',
}

describe('weekly review digest', () => {
  it('sums the week up with the change, the best master and what waits', () => {
    expect(reviewDigestText(WEEK)).toBe(
      [
        '📊 <b>Reviews this week · Old &lt;School&gt;</b>',
        '12 reviews, average ★ 4.6 (▲ +0.2 on last week)',
        'Top specialist: Erlan, ★ 5.0 (4 reviews)',
        '⚠️ Waiting for your reply: 2 poor reviews',
        'Unanswered in total: 5',
        '<a href="https://awaisa.kg/manage/old-school?tab=reviews">Reply in the dashboard</a>',
      ].join('\n'),
    )
  })

  it('says nothing when the week was empty and nothing waits', () => {
    expect(
      reviewDigestText({ ...WEEK, count: 0, average: null, unanswered: 0, poorOpen: 0 }),
    ).toBeNull()
  })

  it('still reminds about waiting reviews in a quiet week', () => {
    const text = reviewDigestText({
      ...WEEK,
      count: 0,
      average: null,
      bestMaster: null,
      poorOpen: 0,
      unanswered: 1,
    })
    expect(text).toContain('No new reviews')
    expect(text).toContain('Unanswered in total: 1')
    expect(text).not.toContain('Waiting for your reply')
  })

  it('reads a fall and a flat week', () => {
    expect(reviewDigestText({ ...WEEK, average: 4.1 })).toContain('(▼ −0.3 on last week)')
    expect(reviewDigestText({ ...WEEK, average: 4.42 })).toContain('(same as last week)')
    expect(reviewDigestText({ ...WEEK, previousAverage: null })).toContain('average ★ 4.6\n')
  })

  it('counts in English', () => {
    expect(reviewDigestText({ ...WEEK, count: 1 })).toContain('1 review,')
    expect(reviewDigestText({ ...WEEK, count: 21 })).toContain('21 reviews,')
    expect(reviewDigestText({ ...WEEK, poorOpen: 1 })).toContain('1 poor review')
    expect(reviewDigestText({ ...WEEK, poorOpen: 11 })).toContain('11 poor reviews')
  })
})
