import { describe, expect, it } from 'vitest'
import { chunk, isExpoPushToken, parseExpoResponse, toExpoMessage } from './expo-push.js'

const message = {
  title: 'Новая запись',
  body: 'Чт 14:30 · Мужская стрижка · Айбек',
  url: '/master/old-school?date=2026-11-26',
  tag: 'b1',
}

describe('isExpoPushToken', () => {
  it('takes Expo tokens only', () => {
    expect(isExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]')).toBe(true)
    expect(isExpoPushToken('ExpoPushToken[abcdefgh12]')).toBe(true)
    expect(isExpoPushToken('https://push.example/abc')).toBe(false)
    expect(isExpoPushToken('ExponentPushToken[]')).toBe(false)
    expect(isExpoPushToken('ExponentPushToken[bad token!]')).toBe(false)
  })
})

describe('toExpoMessage', () => {
  it('carries the same text and the link to open, one per booking', () => {
    expect(toExpoMessage('ExponentPushToken[aaaaaaaaaa]', message, 3600)).toEqual({
      to: 'ExponentPushToken[aaaaaaaaaa]',
      title: 'Новая запись',
      body: 'Чт 14:30 · Мужская стрижка · Айбек',
      data: { url: '/master/old-school?date=2026-11-26' },
      sound: 'default',
      priority: 'high',
      ttl: 3600,
      channelId: 'bookings',
      tag: 'b1',
      collapseId: 'b1',
    })
  })
})

describe('parseExpoResponse', () => {
  const tokens = ['ExponentPushToken[a1]', 'ExponentPushToken[b2]', 'ExponentPushToken[c3]']

  it('reads tickets in the order of the messages', () => {
    const result = parseExpoResponse(tokens, {
      data: [
        { status: 'ok', id: 't1' },
        {
          status: 'error',
          message: '"ExponentPushToken[b2]" is not a registered push notification recipient',
          details: { error: 'DeviceNotRegistered' },
        },
        { status: 'error', message: 'Too big', details: { error: 'MessageTooBig' } },
      ],
    })

    expect(result.sent).toEqual(['ExponentPushToken[a1]'])
    expect(result.gone).toEqual(['ExponentPushToken[b2]'])
    expect(result.errors).toEqual(['Expo push to ExponentPushToken[c3]: Too big'])
  })

  it('forgets nothing when the whole request failed', () => {
    const result = parseExpoResponse(tokens, {
      errors: [{ code: 'UNAUTHORIZED', message: 'Bad access token' }],
    })

    expect(result.gone).toEqual([])
    expect(result.sent).toEqual([])
    expect(result.errors).toEqual(['Expo push: UNAUTHORIZED Bad access token'])
  })

  it('treats a missing ticket or an unreadable answer as an error', () => {
    expect(parseExpoResponse(tokens.slice(0, 1), { data: [] }).errors).toEqual([
      'Expo push to ExponentPushToken[a1]: no ticket',
    ])
    expect(parseExpoResponse(tokens, null).errors).toEqual(['Expo push: unreadable answer'])
  })
})

describe('chunk', () => {
  it('splits into batches of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 100)).toEqual([])
  })
})
