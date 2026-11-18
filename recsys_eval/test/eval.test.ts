import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { rankCandidates } from '../../apps/api/src/recommendations/recommend-score.ts'
import { DAY_MS, splitByTime } from '../src/data/split.ts'
import { mulberry32 } from '../src/lib/random.ts'
import { intraListDiversity, listMetrics, novelty } from '../src/metrics.ts'
import { candidatesAt, productionScores, profileOf } from '../src/recommenders/production.ts'
import { selectShelf } from '../src/recommenders/shelf.ts'
import type { Dataset, Item } from '../src/types.ts'

const item = (id: string, name: string, slug: string, kind = 'beauty'): Item => ({
  serviceId: id,
  name,
  price: 1000,
  slug,
  businessId: slug,
  businessName: slug,
  kind,
  rebookDays: null,
})

describe('listMetrics', () => {
  it('counts hits, rank and recall', () => {
    const metrics = listMetrics(['a', 'b', 'c', 'd'], new Set(['b', 'x']), 4)
    assert.equal(metrics.precision, 0.25)
    assert.equal(metrics.recall, 0.5)
    assert.equal(metrics.hit, 1)
    // One hit at rank 2 against an ideal of hits at ranks 1 and 2.
    const ideal = 1 + 1 / Math.log2(3)
    assert.ok(Math.abs(metrics.ndcg - 1 / Math.log2(3) / ideal) < 1e-9)
    assert.equal(metrics.ap, 0.5 / 2)
  })

  it('is perfect when the list starts with everything relevant', () => {
    const metrics = listMetrics(['a', 'b', 'c'], new Set(['a', 'b']), 3)
    assert.equal(metrics.ndcg, 1)
    assert.equal(metrics.ap, 1)
    assert.equal(metrics.recall, 1)
  })

  it('gives zero without hits', () => {
    assert.deepEqual(listMetrics(['a'], new Set(['b']), 1), {
      precision: 0,
      recall: 0,
      ndcg: 0,
      ap: 0,
      hit: 0,
    })
  })
})

describe('list qualities', () => {
  it('diversity is the share of pairs from different kinds', () => {
    const kinds: Record<string, string> = { a: 'nails', b: 'nails', c: 'haircut' }
    assert.equal(
      intraListDiversity(['a', 'b', 'c'], (id) => kinds[id] ?? ''),
      2 / 3,
    )
    assert.equal(
      intraListDiversity(['a', 'b'], (id) => kinds[id] ?? ''),
      0,
    )
  })

  it('novelty is higher for rarely booked services', () => {
    const popularity = new Map([
      ['hit', 99],
      ['rare', 0],
    ])
    assert.ok(novelty(['rare'], popularity, 100) > novelty(['hit'], popularity, 100))
  })
})

describe('splitByTime', () => {
  const day = (n: number) => Date.UTC(2026, 0, 1) + n * DAY_MS
  const dataset: Dataset = {
    source: 'sim',
    note: '',
    items: [item('a', 'Маникюр', 'p1'), item('b', 'Педикюр', 'p1')],
    visits: [
      { client: 'c1', serviceId: 'a', time: day(1), isNoShow: false },
      { client: 'c1', serviceId: 'b', time: day(25), isNoShow: false },
      { client: 'c2', serviceId: 'b', time: day(29), isNoShow: false },
      { client: 'c3', serviceId: 'a', time: day(2), isNoShow: true },
    ],
    reviews: [
      { businessId: 'p1', rating: 5, time: day(1) },
      { businessId: 'p1', rating: 1, time: day(28) },
    ],
  }
  const split = splitByTime(dataset, 10)

  it('keeps everything after the cutoff out of what models see', () => {
    assert.equal(split.cutoff, day(19))
    assert.deepEqual(
      split.train.map((visit) => visit.serviceId),
      ['a'],
    )
    // Popularity and ratings are as of the cutoff: the later 1-star review is not there.
    assert.equal(split.context.popularity.get('b'), undefined)
    assert.equal(split.context.rating.get('p1')?.average, 5)
    for (const { user } of split.cases) {
      assert.ok(user.history.every((visit) => visit.time < split.cutoff))
    }
  })

  it('judges each client by what they booked after the cutoff, no-shows left out', () => {
    const byClient = Object.fromEntries(
      split.cases.map(({ user, relevant }) => [user.client, [...relevant]]),
    )
    assert.deepEqual(byClient, { c1: ['b'], c2: ['b'] })
    assert.equal(split.cases.find((entry) => entry.user.client === 'c2')?.user.history.length, 0)
  })
})

describe('selectShelf', () => {
  it('builds the same shelf as rankCandidates when scores are not changed', () => {
    const random = mulberry32(3)
    const names = ['Маникюр', 'Педикюр', 'Стрижка', 'Укладка', 'Чистка лица', 'Массаж спины']
    const items = Array.from({ length: 40 }, (_, index) =>
      item(`s${index}`, names[index % names.length] as string, `p${index % 9}`),
    )
    const visits = Array.from({ length: 300 }, (_, index) => ({
      client: `c${index % 50}`,
      serviceId: `s${Math.floor(random() * 40)}`,
      time: Date.UTC(2026, 0, 1) + Math.floor(random() * 60) * DAY_MS,
      isNoShow: false,
    }))
    const reviews = items.slice(0, 20).map((entry, index) => ({
      businessId: entry.businessId,
      rating: 3 + (index % 3),
      time: Date.UTC(2026, 0, 1),
    }))
    const split = splitByTime({ source: 'sim', note: '', items, visits, reviews }, 14)
    for (const { user } of split.cases.slice(0, 20)) {
      const expected = rankCandidates(candidatesAt(split.context), profileOf(user, split.context), {
        limit: 10,
      }).map((entry) => entry.candidate.serviceId)
      const actual = selectShelf(productionScores(user, split.context), 10).map(
        (candidate) => candidate.serviceId,
      )
      assert.deepEqual(actual, expected)
    }
  })
})
