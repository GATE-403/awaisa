import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isArray, onlyStrings, readJson, removeKey, writeJson } from '../storage'

const store = new Map<string, string>()

const stubStorage = (storage: Partial<Storage>) =>
  vi.stubGlobal('window', { localStorage: storage })

beforeEach(() => {
  store.clear()
  stubStorage({
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

type Contact = { name: string; phone: string }

const isContact = (value: unknown): value is Contact =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Contact).name === 'string' &&
  typeof (value as Contact).phone === 'string'

describe('readJson', () => {
  it('reads a value written by an earlier version as it was stored', () => {
    store.set('awaisa:contact:v1', '{"name":"Айбек","phone":"+996555123456"}')
    store.set('awaisa:favorites:v1', '["a",1,"b"]')

    expect(readJson('awaisa:contact:v1', isContact)).toEqual({
      name: 'Айбек',
      phone: '+996555123456',
    })
    expect(onlyStrings(readJson('awaisa:favorites:v1', isArray))).toEqual(['a', 'b'])
  })

  it('gives null for a missing, empty or broken value', () => {
    store.set('empty', '')
    store.set('broken', '{"name":')

    expect(readJson('missing')).toBeNull()
    expect(readJson('empty')).toBeNull()
    expect(readJson('broken')).toBeNull()
  })

  it('gives null when the guard turns the shape down', () => {
    store.set('awaisa:contact:v1', '{"name":"Айбек"}')
    store.set('list', '{"0":"a"}')

    expect(readJson('awaisa:contact:v1', isContact)).toBeNull()
    expect(onlyStrings(readJson('list', isArray))).toEqual([])
  })

  it('survives storage that throws or does not exist', () => {
    stubStorage({
      getItem: () => {
        throw new Error('SecurityError')
      },
    })
    expect(readJson('any')).toBeNull()

    vi.stubGlobal('window', undefined)
    expect(readJson('any')).toBeNull()
  })
})

describe('writeJson and removeKey', () => {
  it('stores JSON and removes it', () => {
    expect(writeJson('awaisa:liked-works:v1', ['x'])).toBe(true)
    expect(store.get('awaisa:liked-works:v1')).toBe('["x"]')

    expect(removeKey('awaisa:liked-works:v1')).toBe(true)
    expect(store.has('awaisa:liked-works:v1')).toBe(false)
  })

  it('reports false instead of throwing when storage is full or blocked', () => {
    stubStorage({
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
    })

    expect(writeJson('key', { a: 1 })).toBe(false)
    expect(removeKey('key')).toBe(false)
  })
})
