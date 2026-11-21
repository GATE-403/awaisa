import { type ReviewWeek, reviewDigestText } from './review-digest.js'

const WEEK: ReviewWeek = {
  business: 'Old <School>',
  count: 12,
  average: 4.62,
  previousAverage: 4.4,
  bestMaster: { name: 'Эрлан', average: 5, count: 4 },
  poorOpen: 2,
  unanswered: 5,
  cabinetUrl: 'https://awaisa.kg/manage/old-school?tab=reviews',
}

describe('weekly review digest', () => {
  it('sums the week up with the change, the best master and what waits', () => {
    expect(reviewDigestText(WEEK)).toBe(
      [
        '📊 <b>Отзывы за неделю · Old &lt;School&gt;</b>',
        '12 отзывов, средняя ★ 4,6 (▲ +0,2 к прошлой неделе)',
        'Лучший мастер: Эрлан, ★ 5,0 (4 отзыва)',
        '⚠️ Ждут вашего ответа: 2 плохих отзыва',
        'Без ответа всего: 5',
        '<a href="https://awaisa.kg/manage/old-school?tab=reviews">Ответить в кабинете</a>',
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
    expect(text).toContain('Новых отзывов не было')
    expect(text).toContain('Без ответа всего: 1')
    expect(text).not.toContain('Ждут вашего ответа')
  })

  it('reads a fall and a flat week', () => {
    expect(reviewDigestText({ ...WEEK, average: 4.1 })).toContain('(▼ −0,3 к прошлой неделе)')
    expect(reviewDigestText({ ...WEEK, average: 4.42 })).toContain('(как на прошлой неделе)')
    expect(reviewDigestText({ ...WEEK, previousAverage: null })).toContain('средняя ★ 4,6\n')
  })

  it('counts in Russian', () => {
    expect(reviewDigestText({ ...WEEK, count: 1 })).toContain('1 отзыв,')
    expect(reviewDigestText({ ...WEEK, count: 21 })).toContain('21 отзыв,')
    expect(reviewDigestText({ ...WEEK, poorOpen: 1 })).toContain('1 плохой отзыв')
    expect(reviewDigestText({ ...WEEK, poorOpen: 11 })).toContain('11 плохих отзывов')
  })
})
