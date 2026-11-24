import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  formatNationalPhone,
  parseRegion,
  phonePlaceholder,
  phonePrefix,
  utcOffsetMinutes,
  wholePhoneDigits,
} from '../src/index.js'
import { loadRegionFile } from '../src/node.js'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../../..')

// Two installations the code knows nothing about: everything comes from their descriptions.
const ALMATY = {
  country: 'kz',
  timeZone: 'Asia/Almaty',
  phone: {
    callingCode: '+7',
    nationalDigits: 10,
    trunkPrefix: '8',
    groups: [3, 3, 2, 2],
    example: '7011234567',
  },
  currency: { code: 'KZT', label: 'тг' },
  locale: { default: 'ru', available: ['ru', 'kk'], numbers: 'ru-RU' },
  city: { name: 'Алматы', center: { latitude: 43.24, longitude: 76.89 } },
}
const BERLIN = {
  country: 'DE',
  timeZone: 'Europe/Berlin',
  phone: { callingCode: '49', nationalDigits: 11, trunkPrefix: '0', example: '15112345678' },
  currency: { code: 'EUR' },
  locale: { default: 'de' },
  city: { name: 'Berlin', center: { latitude: 52.52, longitude: 13.405 } },
}

describe('parseRegion', () => {
  it('takes an installation’s description and fills what it leaves out', () => {
    const region = parseRegion(ALMATY)
    assert.equal(region.country, 'KZ')
    assert.equal(region.phone.callingCode, '7')
    assert.deepEqual(region.city.areas, [])
    assert.equal(region.geocoderBox, null)

    const berlin = parseRegion(BERLIN)
    assert.deepEqual(berlin.phone.groups, [11])
    assert.deepEqual(berlin.locale, { default: 'de', available: ['de'], numbers: 'de' })
    // Without a label of its own the currency is called what the locale calls it.
    assert.equal(berlin.currency.label, 'Euro')
    assert.deepEqual(berlin.currency.labels, {})
  })

  it('reads a currency label per language', () => {
    const region = parseRegion({
      ...ALMATY,
      currency: { code: 'KZT', label: 'tenge', labels: { en: 'tenge', ru: ' тг ', kk: 'тг' } },
    })
    assert.equal(region.currency.label, 'tenge')
    assert.deepEqual(region.currency.labels, { en: 'tenge', ru: 'тг', kk: 'тг' })
    assert.throws(
      () => parseRegion({ ...ALMATY, currency: { code: 'KZT', labels: ['тг'] } }),
      /currency\.labels/,
    )
    assert.throws(
      () => parseRegion({ ...ALMATY, currency: { code: 'KZT', labels: { ru: '' } } }),
      /currency\.labels/,
    )
  })

  it('names every field that is missing or wrong at once', () => {
    assert.throws(
      () => parseRegion({ ...ALMATY, timeZone: 'Asia/Nowhere', currency: { code: 'XX' } }),
      /timeZone: .*; currency\.code/,
    )
    assert.throws(() => parseRegion(null), /must be an object/)
    assert.throws(
      () => parseRegion({ ...ALMATY, phone: { ...ALMATY.phone, example: '123' } }),
      /phone\.example/,
    )
  })
})

describe('phones', () => {
  it('follows the region’s calling code and grouping', () => {
    const almaty = parseRegion(ALMATY)
    assert.equal(phonePrefix(almaty), '+7')
    assert.equal(formatNationalPhone(almaty, '7011234567'), '+7 701 123 45 67')
    assert.equal(formatNationalPhone(almaty, '7011'), '+7 701 1')
    assert.equal(phonePlaceholder(almaty), '+7 701 123 45 67')
    assert.equal(wholePhoneDigits(almaty), 11)
  })
})

describe('utcOffsetMinutes', () => {
  it('reads the zone’s offset at that moment, summer time included', () => {
    const berlin = parseRegion(BERLIN)
    assert.equal(utcOffsetMinutes(berlin, new Date('2026-01-15T12:00:00Z')), 60)
    assert.equal(utcOffsetMinutes(berlin, new Date('2026-07-15T12:00:00Z')), 120)
    assert.equal(utcOffsetMinutes(parseRegion(ALMATY), new Date('2026-07-15T12:00:00Z')), 300)
  })
})

describe('loadRegionFile', () => {
  const folder = () => {
    const root = mkdtempSync(join(tmpdir(), 'region-'))
    const nested = join(root, 'apps', 'api')
    mkdirSync(nested, { recursive: true })
    return { root, nested }
  }

  it('finds the installation’s region.json above where the app runs', () => {
    const { root, nested } = folder()
    writeFileSync(join(root, 'region.json'), JSON.stringify(ALMATY))
    writeFileSync(join(root, 'region.example.json'), JSON.stringify(BERLIN))
    const loaded = loadRegionFile({ from: nested, allowExample: true })
    assert.equal(loaded.region.city.name, 'Алматы')
    assert.equal(loaded.isExample, false)
  })

  it('falls back to the example only where that is allowed', () => {
    const { root, nested } = folder()
    writeFileSync(join(root, 'region.example.json'), JSON.stringify(BERLIN))
    assert.equal(loadRegionFile({ from: nested, allowExample: true }).isExample, true)
    assert.throws(() => loadRegionFile({ from: nested, allowExample: false }), /No region\.json/)
  })

  it('reads REGION_FILE when given and says which file is wrong', () => {
    const { root, nested } = folder()
    writeFileSync(join(root, 'mine.json'), JSON.stringify({ ...ALMATY, country: 'Kazakhstan' }))
    assert.throws(
      () => loadRegionFile({ file: '../../mine.json', from: nested, allowExample: false }),
      /mine\.json: Region is not valid: country/,
    )
  })

  it('reads the example that ships with the repository', () => {
    const { region } = loadRegionFile({
      file: join(REPO, 'region.example.json'),
      from: REPO,
      allowExample: false,
    })
    assert.equal(phonePlaceholder(region), '+996 555 123 456')
    assert.equal(region.currency.labels.ru, 'сом')
    assert.equal(utcOffsetMinutes(region), 360)
  })
})
